#!/usr/bin/env node
/**
 * A tiny static server for the handbook — no dependencies, no install step.
 *
 * It serves the project folder, so editing any note reloads every open browser
 * tab instantly. Nothing is cached, so what you see is always what is on disk.
 *
 * Usage:  node tools/serve.mjs [--port 5173] [--open]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const root = process.cwd();
const startPort = Number(flag('--port', process.env.PORT || 5173));
const shouldOpen = args.includes('--open');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/* -------------------------------------------------------------- live reload */

const clients = new Set();

function broadcast(event) {
  for (const res of clients) {
    try {
      res.write(`data: ${event}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

let debounce = null;
function watchProject() {
  try {
    fs.watch(root, { recursive: true }, (_eventType, filename) => {
      if (!filename) return;
      const name = String(filename);
      if (/(^|[\\/])(node_modules|\.git|dist|\.freebuff)([\\/]|$)/.test(name)) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => broadcast('reload'), 90);
    });
  } catch (error) {
    console.warn(`! Live reload watch failed (${error.message}); serving without it.`);
  }
}

/* ------------------------------------------------------------------ serving */

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body) res.end(body);
  else res.end();
}

function resolveTarget(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const relative = decoded.replace(/^\/+/, '');
  const target = path.resolve(root, relative === '' ? 'index.html' : relative);

  // Never escape the project folder.
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  if (!fs.existsSync(target)) return null;

  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    const index = path.join(target, 'index.html');
    return fs.existsSync(index) ? { file: index, stat: fs.statSync(index) } : null;
  }
  return { file: target, stat };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.endsWith('/__live')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const found = resolveTarget(url.pathname);
  if (!found) {
    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '404 — Not found');
    return;
  }

  const ext = path.extname(found.file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  };

  if (req.method === 'HEAD') {
    headers['Content-Length'] = String(found.stat.size);
    return send(res, 200, headers);
  }

  res.writeHead(200, headers);
  fs.createReadStream(found.file).pipe(res);
});

/* --------------------------------------------------------------- port hunt */

function listen(port, attemptsLeft = 12) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error(`✗ Could not start the server: ${error.message}`);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    const address = `http://localhost:${port}/`;
    console.log('');
    console.log('  ┌────────────────────────────────────────────────┐');
    console.log('  │  C# for Unity — reader                         │');
    console.log('  └────────────────────────────────────────────────┘');
    console.log('');
    console.log(`  ${address}`);
    console.log('  Live reload is on: save a note and the page refreshes.');
    console.log('  Press Ctrl+C to stop.');
    console.log('');
    if (shouldOpen) openBrowser(address);
  });
}

function openBrowser(url) {
  const command =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  try {
    spawn(command[0], command[1], { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* opening the browser is a nicety, not a requirement */
  }
}

watchProject();
listen(startPort);
