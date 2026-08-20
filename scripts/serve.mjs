import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.SPECLOOP_PORT || 4173)
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}

createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0])
  const normalized = normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  let target = join(root, normalized === '/' ? 'index.html' : normalized)
  if (!target.startsWith(root) || !existsSync(target) || statSync(target).isDirectory()) {
    target = join(root, 'index.html')
  }
  response.setHeader('Content-Type', mime[extname(target)] || 'application/octet-stream')
  response.setHeader('Cache-Control', 'no-store')
  createReadStream(target).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`SpecLoop preview: http://127.0.0.1:${port}/`)
})
