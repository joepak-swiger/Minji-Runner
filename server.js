import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.ogg', 'audio/ogg'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
]);

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? HOST}`);
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/') pathname = '/index.html';

    const requestedPath = path.resolve(ROOT, `.${pathname}`);
    const relativePath = path.relative(ROOT, requestedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      sendText(response, 403, 'Forbidden');
      return;
    }

    let filePath = requestedPath;
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');

    const body = await readFile(filePath);
    const contentType = MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      sendText(response, 404, 'Not found');
      return;
    }
    console.error(error);
    sendText(response, 500, 'Server error');
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log('');
  console.log('  MINJI RUNNER: GOLD v0.7');
  console.log(`  Running at ${url}`);
  console.log('  Press Ctrl+C to stop the game server.');
  console.log('');
  if (process.env.NO_OPEN !== '1') openBrowser(url);
});

function sendText(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(body);
}

function openBrowser(url) {
  try {
    const platform = process.platform;
    let command;
    let args;

    if (platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', '', url];
    } else if (platform === 'darwin') {
      command = 'open';
      args = [url];
    } else {
      command = 'xdg-open';
      args = [url];
    }

    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // The URL is still printed above if automatic browser launch is unavailable.
  }
}
