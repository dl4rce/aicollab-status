// Deterministic local CSS/SVG/API fixtures; no production traffic or services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const postcss = require('postcss');
const parser = require('postcss-selector-parser');
const cssnano = require('cssnano');
const { optimize } = require('svgo');
const webpack = require(require.resolve('webpack', { paths: [require.resolve('flareact')] }));
const OptimizeCSS = require('css-minimizer-webpack-plugin');

(async () => {
  assert.equal(require('postcss-selector-parser/package.json').version, '7.1.6');
  assert.equal(typeof optimize, 'function');
  assert.equal(require('css-minimizer-webpack-plugin/package.json').version, '7.0.4');
  const selectors = ['.foo:hover > a[href="x"]', '#id:not(.disabled)', '.sm\\:flex::before', '[data-v="a b"]', ':is(.a,.b) > *', '.a + .b ~ span', ':root', 'svg|a'];
  for (const selector of selectors) {
    const ast = parser().astSync(selector);
    assert.equal(ast.toString(), selector);
    assert.equal(parser().processSync(selector), selector);
    assert.equal(await parser().process(selector), selector);
    const classes = []; ast.walkClasses(n => classes.push(n.value));
    assert(Array.isArray(classes));
  }
  let count = 0;
  parser(root => root.walkClasses(node => { node.value = `prefix-${node.value}`; count++; })).processSync('.a > .b');
  assert.equal(count, 2);
  const started = performance.now();
  const flat = '.a'.repeat(20000);
  assert.equal(parser().processSync(flat), flat);
  assert(performance.now() - started < 5000, 'flat selector parsing regressed');
  assert.throws(() => parser().processSync(':not('.repeat(1000) + '.x' + ')'.repeat(1000)));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="red" d="M0 0h10v10H0z"/></svg>';
  const optimized = optimize(svg);
  assert.equal(typeof optimized.data, 'string');
  assert.match(optimized.data, /<svg/); assert.match(optimized.data, /viewBox="0 0 10 10"/);
  const css = `.a, .b { color: rgb(255, 0, 0); margin: 0px 0px; background-image: url('data:image/svg+xml,${encodeURIComponent(svg)}'); }`;
  const min = await postcss([cssnano()]).process(css, { from: undefined });
  assert.match(min.css, /color:red/); assert.match(min.css, /margin:0/); assert.match(min.css, /data:image\/svg\+xml/);
  assert(min.css.length < css.length); postcss.parse(min.css);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-css-security-'));
  try {
    fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = 42;');
    class CSSFixture { apply(compiler) { compiler.hooks.compilation.tap('CSSFixture', compilation => { compilation.hooks.additionalAssets.tapAsync('CSSFixture', callback => { compilation.emitAsset('fixture.css', new webpack.sources.RawSource(css)); callback(); }); }); } }
    const stats = await new Promise((resolve, reject) => webpack({ mode: 'production', context: dir, entry: './index.js', output: { path: path.join(dir, 'dist'), filename: 'out.js' }, optimization: { minimizer: [new OptimizeCSS()] }, plugins: [new CSSFixture()] }, (error, result) => error ? reject(error) : resolve(result)));
    assert(!stats.hasErrors(), stats.toString({ errors: true }));
    const built = fs.readFileSync(path.join(dir, 'dist/fixture.css'), 'utf8');
    assert.match(built, /color:red/); assert.match(built, /margin:0/);
    assert(built.length < css.length);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  console.log('PASS CSS parser API/escaping/mutation, flat and nesting guards, SVG2 data URI, cssnano5, Webpack4 optimizer6 integration');
})().catch(error => { console.error(error); process.exitCode = 1; });
