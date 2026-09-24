// Minimal zero-dependency dev server. Rebuilds the site from config on each
// request so edits to the config show up on refresh. Watches the config file
// and logs when it changes.

import http from 'node:http';
import { watch } from 'node:fs';
import { buildInMemory } from './builder.js';

export async function serve(configPath, { port = 5173, host = '127.0.0.1' } = {}) {
  let current = await buildInMemory(configPath);

  async function rebuild(reason) {
    try {
      current = await buildInMemory(configPath);
      console.log(`  ↻ rebuilt (${reason})`);
    } catch (err) {
      console.error('  ✗ build error:', err.message);
    }
  }

  // Watch the config for changes.
  try {
    watch(configPath, { persistent: false }, () => rebuild('config changed'));
  } catch {
    // watch is best-effort; ignore if unsupported
  }

  const server = http.createServer(async (req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';

    // Always rebuild html/config/engine fresh so the latest config is served.
    await rebuild('request');
    const asset = current.assets[url];

    if (!asset) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + url);
      return;
    }
    res.writeHead(200, {
      'Content-Type': asset.type,
      'Cache-Control': 'no-store'
    });
    res.end(asset.body);
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  return { server, url: `http://${host}:${port}`, title: current.cfg.title };
}
