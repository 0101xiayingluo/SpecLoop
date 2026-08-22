import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFixedWindowLimiter, positiveInteger } from './agent-guardrails.mjs'
import { createAgentRun, readPricing } from './agent-metrics.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '127.0.0.1'
const defaultModel = process.env.OPENAI_MODEL || 'gpt-5-mini'
const smallModel = process.env.OPENAI_MODEL_SMALL || defaultModel
const largeModel = process.env.OPENAI_MODEL_LARGE || defaultModel
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map((item) => item.trim()).filter(Boolean)
const pricing = readPricing(process.env)
const maxBodyBytes = 2 * 1024 * 1024
const requestsPerMinute = positiveInteger(process.env.MAX_REQUESTS_PER_MINUTE, 12)
const maxConcurrentRequests = positiveInteger(process.env.MAX_CONCURRENT_MODEL_REQUESTS, 2)
const modelTimeoutMs = positiveInteger(process.env.MODEL_TIMEOUT_MS, 30_000)
const limiter = createFixedWindowLimiter({ limit: requestsPerMinute, windowMs: 60_000 })
let activeModelRequests = 0

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['issues', 'questions', 'selfAssessment'],
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
    selfAssessment: {
      type: 'object',
      additionalProperties: false,
      required: ['confidence', 'reviewRecommended', 'unresolvedRisks'],
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reviewRecommended: { type: 'boolean' },
        unresolvedRisks: { type: 'array', maxItems: 6, items: { type: 'string' } },
      },
    },
  },
}

const instructions = `You are SpecLoop's requirements clarification reasoner. Analyze only the supplied evidence.
Identify contradictory statements, missing implementation or acceptance conditions, and explicitly uncertain assumptions.
Every issue must cite one or more supplied evidence IDs exactly. Never invent an evidence ID.
Propose only questions that can materially change implementation, scope, risk, or acceptance. Rank them with informationGain from 0 to 100.
Do not exceed the requested maximum question count. Keep language consistent with the evidence.
Return a calibrated selfAssessment: confidence is your confidence that the proposed findings cover the material, reviewRecommended flags unresolved ambiguity, and unresolvedRisks lists what may still be missing. This self-assessment is advisory and never overrides SpecLoop's deterministic review policy.`

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value)
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) })
  response.end(body)
}

function applyCors(request, response) {
  const origin = request.headers.origin
  if (!origin || !originCanUseModel(request)) return
  response.setHeader('Access-Control-Allow-Origin', origin)
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Vary', 'Origin')
}

function clientKey(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim()
  return request.socket.remoteAddress || 'unknown'
}

function originCanUseModel(request) {
  const origin = request.headers.origin
  if (allowedOrigins.length === 0) return true
  if (!origin) return false
  if (allowedOrigins.includes(origin)) return true
  const forwardedProtocol = request.headers['x-forwarded-proto']
  const protocol = typeof forwardedProtocol === 'string' ? forwardedProtocol.split(',')[0].trim() : 'http'
  return origin === `${protocol}://${request.headers.host}`
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
  const startedAt = new Date().toISOString()
  const start = performance.now()
  const runId = `run-${Date.now().toString(36)}`
  const input = await readJson(request)
  const selectedModel = input?.routing?.requestedTier === 'large' ? largeModel : smallModel
  let upstream
  try {
    upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
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
        store: false,
      }),
      signal: AbortSignal.timeout(modelTimeoutMs),
    })
  } catch (error) {
    const completedAt = new Date().toISOString()
    const detail = error instanceof Error ? error.message : 'Model provider request failed'
    sendJson(response, 504, {
      error: 'Model request unavailable',
      detail: detail.slice(0, 800),
      run: createAgentRun({
        id: runId,
        model: selectedModel,
        status: 'failed',
        startedAt,
        completedAt,
        serverLatencyMs: performance.now() - start,
        pricing,
        error: detail,
      }),
    })
    return
  }
  const completedAt = new Date().toISOString()
  const serverLatencyMs = performance.now() - start
  const requestId = upstream.headers.get('x-request-id') || undefined
  if (!upstream.ok) {
    const detail = await upstream.text()
    sendJson(response, upstream.status, {
      error: 'Model request failed',
      detail: detail.slice(0, 800),
      run: createAgentRun({
        id: runId,
        model: selectedModel,
        status: 'failed',
        startedAt,
        completedAt,
        serverLatencyMs,
        requestId,
        pricing,
        error: detail,
      }),
    })
    return
  }
  const payload = await upstream.json()
  let analysis
  try {
    analysis = JSON.parse(extractOutputText(payload))
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Model output was not valid JSON'
    sendJson(response, 502, {
      error: 'Model output rejected',
      detail,
      run: createAgentRun({
        id: payload.id || runId,
        model: payload.model || selectedModel,
        status: 'failed',
        startedAt,
        completedAt,
        serverLatencyMs,
        requestId,
        usage: payload.usage,
        pricing,
        error: detail,
      }),
    })
    return
  }
  sendJson(response, 200, {
    analysis,
    run: createAgentRun({
      id: payload.id || runId,
      model: payload.model || selectedModel,
      status: 'succeeded',
      startedAt,
      completedAt,
      serverLatencyMs,
      requestId,
      usage: payload.usage,
      pricing,
    }),
  })
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
    applyCors(request, response)
    if (request.method === 'OPTIONS' && request.url?.startsWith('/api/')) {
      response.writeHead(originCanUseModel(request) ? 204 : 403).end()
      return
    }
    if (request.method === 'GET' && request.url === '/api/health') {
      sendJson(response, 200, {
        available: Boolean(process.env.OPENAI_API_KEY),
        model: defaultModel,
        models: { small: smallModel, large: largeModel },
        pricingConfigured: pricing.configured,
        guardrails: {
          originRestricted: allowedOrigins.length > 0,
          requestsPerMinute,
          maxConcurrentRequests,
          modelTimeoutMs,
        },
      })
      return
    }
    if (request.method === 'POST' && request.url === '/api/reason') {
      if (!originCanUseModel(request)) {
        sendJson(response, 403, { error: 'Origin is not allowed to use the model endpoint' })
        return
      }
      if (!process.env.OPENAI_API_KEY) {
        sendJson(response, 503, { error: 'OPENAI_API_KEY is not configured' })
        return
      }
      const rate = limiter.take(clientKey(request))
      response.setHeader('X-RateLimit-Limit', String(requestsPerMinute))
      response.setHeader('X-RateLimit-Remaining', String(rate.remaining))
      if (!rate.allowed) {
        response.setHeader('Retry-After', String(rate.retryAfterSeconds))
        sendJson(response, 429, { error: 'Model request rate limit exceeded' })
        return
      }
      if (activeModelRequests >= maxConcurrentRequests) {
        response.setHeader('Retry-After', '2')
        sendJson(response, 503, { error: 'Model service is at concurrency capacity' })
        return
      }
      activeModelRequests += 1
      try {
        await reason(request, response)
      } finally {
        activeModelRequests -= 1
      }
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
}).listen(port, host, () => {
  console.log(`SpecLoop model server: http://${host}:${port} (${smallModel} -> ${largeModel})`)
})
