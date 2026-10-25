// Local-only real dev-server HTTP regression; no production requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const webpack = require('webpack');
const Server = require('webpack-dev-server');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-dev-security-'));
  fs.writeFileSync(path.join(dir, 'index.js'), 'console.log("local fixture");');
  fs.writeFileSync(path.join(dir, 'private.txt'), 'PRIVATE-FIXTURE');
  const server = new Server({ host: '127.0.0.1', port: 0, hot: true, static: false, client: false, devMiddleware: { publicPath: '/assets' } }, webpack({ mode: 'development', context: dir, entry: './index.js', output: { filename: 'bundle.js', publicPath: '/assets' } }));
  try {
    await server.start(); const port = server.server.address().port;
    function request(url, headers = {}) { return new Promise((resolve, reject) => { const req = http.get({ hostname: '127.0.0.1', port, path: url, headers }, res => { let data = ''; res.on('data', x => { data += x; }); res.on('end', () => resolve({ status: res.statusCode, data })); }); req.on('error', reject); }); }
    const asset = await request('/assets/bundle.js'); assert.equal(asset.status, 200); assert.match(asset.data, /local fixture/);
    for (const url of ['/assets../private.txt', '/assets/../private.txt', '/assets%2f..%2fprivate.txt']) { const response = await request(url); assert(!response.data.includes('PRIVATE-FIXTURE')); }
    for (const url of ['/webpack-dev-server/open-editor?file=private.txt', '/webpack-dev-server/invalidate']) { const response = await request(url, { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://attacker.invalid' }); assert.equal(response.status, 403); }
    const malformed = await request('/', { Host: '[invalid' }); assert.notEqual(malformed.status, 200);
    assert.equal((await request('/assets/bundle.js')).status, 200);
    console.log('PASS real middleware non-slash publicPath traversal protection, devserver CSRF/malformed Host resilience and asset serving');
  } finally { await server.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
