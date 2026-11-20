import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const gameDir = join(process.cwd(), 'game');

const server = createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url;
  console.log(`Request for: ${path}`);
  try {
    const data = await readFile(join(gameDir, path));
    res.writeHead(200);
    res.end(data);
  } catch (e) {
    console.error(`Error serving ${path}: ${e}`);
    res.writeHead(404);
    res.end();
  }
});

server.listen(8081, () => {
  console.log('Server listening on port 8081');
});
