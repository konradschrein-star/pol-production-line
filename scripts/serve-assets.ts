/**
 * Simple static file server for serving local assets to Remotion
 */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname } from 'path';

const PORT = 9000;
const ASSETS_ROOT = 'C:\\Users\\konra\\ObsidianNewsDesk';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
};

const server = createServer(async (req, res) => {
  console.log(`📥 ${req.method} ${req.url}`);

  try {
    if (!req.url) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // Convert URL to file path
    const filePath = ASSETS_ROOT + req.url.replace(/\//g, '\\');
    const ext = extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    console.log(`   → Serving: ${filePath}`);
    const content = await readFile(filePath);
    console.log(`   ✅ Sent ${(content.length / 1024 / 1024).toFixed(2)} MB`);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': content.length,
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    });
    res.end(content);
  } catch (error) {
    console.error(`Error serving ${req.url}:`, error);
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`✅ Asset server running at http://localhost:${PORT}/`);
  console.log(`   Serving files from: ${ASSETS_ROOT}`);
});
