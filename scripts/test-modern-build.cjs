// Deterministic isolated fixtures. No production services, KV, or remote requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const webpack = require('webpack');
const root = path.resolve(__dirname, '..');
async function compile(config) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    compiler.run((error, stats) => compiler.close(closeError => {
      if (error || closeError) return reject(error || closeError);
      if (stats.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
      resolve(stats);
    }));
  });
}
(async () => {
  assert.equal(require('webpack-dev-middleware/package.json').version, '7.4.6');
  assert.equal(require('webpack-dev-server/package.json').version, '5.2.6');
  for (const name of ['elliptic', 'node-libs-browser', 'crypto-browserify', 'node-forge']) {
    assert.throws(() => require.resolve(name), `${name} vulnerable ancestry must be absent`);
  }
  const parser = require('postcss-selector-parser');
  for (const s of ['.sm\\:flex:hover > a[href="x"]', ':is(.a,.b)', '#id:not(.hidden)']) {
    assert.equal(parser().processSync(s), s);
    assert.equal(await parser().process(s), s);
  }
  assert.equal(parser(r => r.walkClasses(n => { n.value = 'changed'; })).processSync('.a'), '.changed');
  const uuid = require('uuid'); assert.match(uuid.v4(), /^[a-f0-9-]{36}$/);
  assert.throws(() => uuid.v5('fixture', uuid.v5.DNS, Buffer.alloc(2)), RangeError);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'out/_flareact/static/build-manifest.json')));
  assert(manifest.pages['/index']); assert(manifest.pages['/_app']);
  for (const files of Object.values(manifest.pages)) for (const file of files) assert(fs.existsSync(path.join(root, 'out/_flareact/static', file)));
  const listeners = {}; const entries = new Map();
  const sandbox = { console, Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, setTimeout, clearTimeout,
    addEventListener: (name, fn) => { listeners[name] = fn; },
    caches: { default: { match: async request => entries.get(request.url)?.clone(), put: async (request, response) => { entries.set(request.url, response.clone()); } } },
    KV_STATUS_PAGE: { get: async () => null }, fetch: async () => { throw Error('External network forbidden'); },
  };
  sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/main.js'), 'utf8'), sandbox, { timeout: 10000 });
  async function request(url) { let response; listeners.fetch({ request: new Request(url), respondWith: x => { response = x; }, waitUntil: () => {} }); return response; }
  const response = await request('https://fixture.invalid/');
  assert.equal(response.status, 200); const html = await response.text();
  assert.match(html, /<!DOCTYPE html>/); assert.match(html, /__flareact/); assert.match(html, /_flareact\/static/);
  const props = await request('https://fixture.invalid/_flareact/props/index.json');
  assert.equal(props.status, 200); assert((await props.json()).pageProps.config);
  assert.equal((await request('https://fixture.invalid/')).status, 200);
  assert.equal(typeof listeners.scheduled, 'function');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-modern-cache-'));
  try {
    fs.writeFileSync(path.join(dir, 'entry.js'), 'globalThis.fixtureResult = 7 * 7;');
    const config = { mode: 'production', context: dir, entry: './entry.js', output: { path: path.join(dir, 'out'), filename: 'bundle.js' }, cache: { type: 'filesystem', cacheDirectory: path.join(dir, 'cache'), buildDependencies: { config: [__filename] } } };
    await compile(config); const first = fs.readFileSync(path.join(dir, 'out/bundle.js'), 'utf8');
    const context = {}; vm.runInNewContext(first, context); assert.equal(context.fixtureResult, 49); assert(first.length < 100);
    const hit = await compile(config); assert(hit.toJson({ all: false, modules: true }).modules.some(m => m.cached));
    const files = fs.readdirSync(path.join(dir, 'cache/default-production'));
    for (const file of files) if (file.endsWith('.pack')) fs.writeFileSync(path.join(dir, 'cache/default-production', file), 'corrupt deterministic fixture');
    await compile(config); assert.equal(fs.readFileSync(path.join(dir, 'out/bundle.js'), 'utf8'), first);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  console.log('PASS modern graph, parser/uuid APIs, manifest assets, actual Worker SSR/props/cache, default minifier and filesystem cache hit/corrupt recompute');
})().catch(error => { console.error(error); process.exitCode = 1; });
