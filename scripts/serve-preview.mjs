import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('../.pages-site/', import.meta.url));
const port = Number(process.env.PORT || 5088);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + path, path.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Outside build');
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    const bytes = await readFile(file);
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const headers = { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Accept-Ranges': 'bytes' };
    if (range) {
      const start = Number(range[1]); const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
      if (start > end || start >= bytes.length) { response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }); response.end(); return; }
      response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${bytes.length}` });
      response.end(request.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
    } else { response.writeHead(200, { ...headers, 'Content-Length': bytes.length }); response.end(request.method === 'HEAD' ? undefined : bytes); }
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Creator Flow review: http://127.0.0.1:${port}`));
