// Test preload: permit only explicit loopback sockets for local dev-server fixtures.
const net = require('node:net');
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = (Array.isArray(args[0]) ? args[0] : net._normalizeArgs(args))[0];
  if (options.path || !['127.0.0.1', '::1', 'localhost'].includes(options.host)) throw new Error('EXTERNAL_NETWORK_FORBIDDEN');
  return original.apply(this, args);
};
const dns = require('node:dns');
const lookup = dns.lookup;
dns.lookup = function (host, ...args) {
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) throw new Error('EXTERNAL_DNS_FORBIDDEN');
  return lookup.call(this, host, ...args);
};
for (const method of ['resolve', 'resolve4', 'resolve6']) dns[method] = () => { throw new Error('EXTERNAL_DNS_FORBIDDEN'); };
const fetch = globalThis.fetch;
globalThis.fetch = (input, ...args) => {
  if (!['127.0.0.1', '::1', '[::1]', 'localhost'].includes(new URL(typeof input === 'string' ? input : input.url).hostname)) throw new Error('EXTERNAL_FETCH_FORBIDDEN');
  return fetch(input, ...args);
};
require('node:module').syncBuiltinESMExports();
