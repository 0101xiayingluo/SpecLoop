import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const port = Number(process.env.PORT || 8787)
const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
const maxBodyBytes = 2 * 1024 * 1024

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['issues', 'questions'],
  properties: {
    issues: {
      type: 'array',
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'kind', 'title', 'description', 'severity', 'evidenceIds'],
        properties: {
          key: { type: 'string' },
          kind: { type: 'string', enum: ['conflict', 'missing', 'assumption'] },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          evidenceIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    questions: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'prompt', 'why', 'informationGain', 'issueKeys', 'options', 'recommendationIndex'],
        properties: {
          key: { type: 'string' },
          prompt: { type: 'string' },
          why: { type: 'string' },
          informationGain: { type: 'number', minimum: 0, maximum: 100 },
          issueKeys: { type: 'array', items: { type: 'string' } },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'value'],
              properties: { label: { type: 'string' }, value: { type: 'string' } },
            },
          },
          recommendationIndex: { type: 'integer', minimum: 0, maximum: 3 },
        },
      },
    },
  },
}

const instructions = `You are SpecLoop's requirements clarification reasoner. Analyze only the supplied evidence.
Identify contradictory statements, missing implementation or acceptance conditions, and explicitly uncertain assumptions.
Every issue must cite one or more supplied evidence IDs exactly. Never invent an evidence ID.
Propose only questions that can materially change implementation, scope, risk, or acceptance. Rank them with informationGain from 0 to 100.
Do not exceed the requested maximum question count. Keep language consistent with the evidence.`

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value)
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) })
  response.end(body)
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBodyBytes) throw new Error('Request body exceeds 2 MB')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function extractOutputText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text
    }
  }
  throw new Error('Responses API returned no output text')
}

async function reason(request, response) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, { error: 'OPENAI_API_KEY is not configured' })
    return
  }
  const input = await readJson(request)
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input: JSON.stringify(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'specloop_analysis',
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
  })
  if (!upstream.ok) {
    const detail = await upstream.text()
    sendJson(response, upstream.status, { error: 'Model request failed', detail: detail.slice(0, 800) })
    return
  }
  const payload = await upstream.json()
  sendJson(response, 200, JSON.parse(extractOutputText(payload)))
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}

async function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  let filePath = resolve(dist, relative)
  if (filePath !== dist && !filePath.startsWith(`${dist}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  try {
    const info = await stat(filePath)
    if (info.isDirectory()) filePath = resolve(filePath, 'index.html')
  } catch {
    filePath = resolve(dist, 'index.html')
  }
  const extension = extname(filePath)
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
  })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(filePath).pipe(response)
}

createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/api/health') {
      sendJson(response, 200, { available: Boolean(process.env.OPENAI_API_KEY), model })
      return
    }
    if (request.method === 'POST' && request.url === '/api/reason') {
      await reason(request, response)
      return
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      await serveStatic(request, response)
      return
    }
    response.writeHead(405).end()
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unexpected server error' })
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`SpecLoop model server: http://127.0.0.1:${port} (${model})`)
})
