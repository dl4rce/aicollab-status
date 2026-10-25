// Deterministic isolated dependency regressions. No production data or sockets.
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const rq = createRequire(path.join(root, 'package.json'));
(async () => {
  let checks = 0;
  const qs = rq('qs');
  assert.deepEqual(qs.parse('a[b]=one&a[c]=two'), { a: { b: 'one', c: 'two' } });
  assert.equal(qs.stringify({ a: [null, undefined, 'x'] }, { arrayFormat: 'comma', encodeValuesOnly: true }), 'a=,,x');
  assert.doesNotThrow(() => qs.stringify({ constructor: { isBuffer: 'not-callable' } }));
  assert.equal({}.polluted, undefined);
  qs.parse('__proto__[polluted]=yes&constructor[prototype][polluted]=yes');
  assert.equal({}.polluted, undefined); checks += 5;
  async function parse(body, options = {}) {
    const req = Readable.from([Buffer.from(body)]);
    req.headers = { 'content-type': 'application/x-www-form-urlencoded', 'content-length': String(Buffer.byteLength(body)) };
    req.method = 'POST'; req.url = '/isolated-fixture';
    return new Promise(resolve => rq('body-parser').urlencoded({ extended: true, ...options })(req, {}, error => resolve({ error, body: req.body })));
  }
  assert.deepEqual((await parse('user[name]=fixture&tags[]=a&tags[]=b')).body, { user: { name: 'fixture' }, tags: ['a', 'b'] });
  assert.equal((await parse('a=1&b=2', { parameterLimit: 1 })).error.status, 413);
  assert.equal((await parse('a=abcdef', { limit: 2 })).error.status, 413); checks += 3;
  // Exercise actual compression middleware against in-memory HTTP-shaped streams.
  let chunks = [];
  const res = new Writable({ write(chunk, encoding, cb) { chunks.push(Buffer.from(chunk)); cb(); } });
  const headers = {}; res.statusCode = 200;
  res.setHeader = (k, v) => { headers[k.toLowerCase()] = v; };
  res.getHeader = k => headers[k.toLowerCase()];
  res.removeHeader = k => { delete headers[k.toLowerCase()]; };
  res.writeHead = () => { res.headersSent = true; };
  res.setHeader('Content-Type', 'text/plain');
  const finished = new Promise((resolve, reject) => { res.on('finish', resolve); res.on('error', reject); });
  rq('compression')({ threshold: 0 })({ method: 'GET', headers: { 'accept-encoding': 'gzip' } }, res, () => {});
  res.end('isolated gzip fixture'); await finished;
  assert.equal(headers['content-encoding'], 'gzip');
  assert.equal(require('node:zlib').gunzipSync(Buffer.concat(chunks)).toString(), 'isolated gzip fixture'); checks += 2;
  const yaml = rq('js-yaml'); assert.deepEqual(yaml.safeLoad('fixture:\n  enabled: true\n  count: 3'), { fixture: { enabled: true, count: 3 } });
  assert.deepEqual(rq('brace-expansion')('x{1..3}'), ['x1', 'x2', 'x3']);
  const uri = rq('fast-uri'); assert.equal(uri.parse('https://example.invalid/a?b=1').host, 'example.invalid');
  assert.equal(uri.resolve('https://example.invalid/a/', '../b'), 'https://example.invalid/b');
  const Ajv = createRequire(rq.resolve('schema-utils/package.json'))('ajv');
  assert(new Ajv().compile({ type: 'string', pattern: '^fixture$' })('fixture')); checks += 5;
  const pbkdf = rq('pbkdf2');
  assert.deepEqual(pbkdf.pbkdf2Sync('password', 'salt', 2, 32, 'sha256'), crypto.pbkdf2Sync('password', 'salt', 2, 32, 'sha256'));
  await new Promise((resolve, reject) => pbkdf.pbkdf2('password', 'salt', 2, 32, 'sha256', (err, out) => { if (err) return reject(err); try { assert.deepEqual(out, crypto.pbkdf2Sync('password', 'salt', 2, 32, 'sha256')); resolve(); } catch (e) { reject(e); } })); checks += 2;
  const serialize = rq('serialize-javascript');
  const literal = serialize({ html: '</script><script>bad()</script>', rx: /fixture/i, nan: NaN, fn: function square(x) { return x * x; } });
  assert(!literal.includes('</script>'));
  assert.equal(vm.runInNewContext('(' + literal + ').fn(7)'), 49); checks += 2;
  const postcss = rq('postcss'); const css = await postcss([rq('autoprefixer')]).process('a { display: flex; }', { from: 'fixture.css', to: 'fixture.out.css', map: { inline: false } });
  assert(css.css.includes('display: flex')); assert(css.map.toJSON().sources.length > 0);
  const sm = rq('source-map-js'); const gen = new sm.SourceMapGenerator({ file: 'fixture.js' }); gen.addMapping({ source: 'input.js', original: { line: 1, column: 0 }, generated: { line: 1, column: 0 } }); assert.equal(new sm.SourceMapConsumer(gen.toJSON()).originalPositionFor({ line: 1, column: 0 }).source, 'input.js'); checks += 3;
  const tmp = rq('tmp').fileSync(); fs.writeFileSync(tmp.name, 'isolated'); assert.equal(fs.readFileSync(tmp.name, 'utf8'), 'isolated'); tmp.removeCallback(); checks++;
  const launchCommand = rq('launch-editor/construct-windows-launch-command');
  assert.throws(() => launchCommand('editor', ['file\nmalicious']), /line break/);
  assert.throws(() => launchCommand('editor', ['%COMSPEC%']), /Cannot launch/);
  assert(launchCommand('editor', ['file&name']).includes('^&'));
  assert.equal(typeof rq('follow-redirects').http.request, 'function'); checks += 4;
  // Actual default Webpack minifier, without an explicit custom minimizer.
  const area = path.join(root, '.security-minifier-fixture'); fs.mkdirSync(area, { recursive: true });
  try {
    const entry = path.join(area, 'entry.js'); fs.writeFileSync(entry, 'globalThis.fixtureResult = (function square(x) { return x*x; })(7);');
    const stats = await new Promise((resolve, reject) => rq('webpack')({ mode: 'production', context: area, entry, output: { path: path.join(area, 'out'), filename: 'fixture.js' } }, (error, stats) => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString())) : resolve(stats)));
    const output = fs.readFileSync(path.join(area, 'out/fixture.js'), 'utf8'); const context = {}; vm.runInNewContext(output, context); assert.equal(context.fixtureResult, 49); assert(output.length > 0); checks += 2;
  } finally { fs.rmSync(area, { recursive: true, force: true }); }
  console.log(JSON.stringify({ status: 'pass', node: process.version, checks, network: 'denied by external preload; in-memory HTTP only', defaultMinimizer: rq('terser-webpack-plugin/package.json').version }));
})().catch(error => { console.error(error); process.exit(1); });
