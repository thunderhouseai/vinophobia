import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

type AnthropicVisionResponse = {
  content?: Array<{ type?: string; text?: string }>
}

type BottlePayload = {
  status: 'recognized' | 'needs-confirmation'
  bottle: {
    name: string
    producer?: string
    varietal?: string
    region?: string
    vintage?: string
    country?: string
    rawVisibleText?: string[]
    confidence: number
    source: 'claude-vision'
  }
  note: string
}

function loadLocalEnv() {
  try {
    const envFile = readFileSync('.env', 'utf8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue
      }

      const [key, ...valueParts] = trimmed.split('=')
      if (!process.env[key]) {
        process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {
    // .env is optional; the API route returns a safe setup error if the key is missing.
  }
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(payload))
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  return Buffer.concat(chunks)
}

function parseMultipartPhoto(body: Buffer, contentType: string) {
  const boundaryMatch = contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i)
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2]

  if (!boundary) {
    throw new Error('Missing multipart boundary')
  }

  const delimiter = Buffer.from(`--${boundary}`)
  let searchIndex = 0

  while (searchIndex < body.length) {
    const partStart = body.indexOf(delimiter, searchIndex)
    if (partStart === -1) {
      break
    }

    const headerStart = partStart + delimiter.length + 2
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart)
    if (headerEnd === -1) {
      break
    }

    const headers = body.subarray(headerStart, headerEnd).toString('utf8')
    const nextBoundary = body.indexOf(delimiter, headerEnd + 4)
    if (nextBoundary === -1) {
      break
    }

    if (headers.includes('name="photo"')) {
      const contentTypeMatch = headers.match(/content-type:\s*([^\r\n]+)/i)
      const content = body.subarray(headerEnd + 4, Math.max(headerEnd + 4, nextBoundary - 2))

      return {
        imageBase64: content.toString('base64'),
        mediaType: contentTypeMatch?.[1]?.trim() || 'image/jpeg',
      }
    }

    searchIndex = nextBoundary
  }

  throw new Error('Missing photo upload')
}

function extractJsonObject(text: string) {
  const fencedJson = text.match(/```json\s*([\s\S]*?)\s*```/i)
  const candidate = fencedJson?.[1] ?? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return JSON.parse(candidate)
}

function normalizeClaudePayload(rawPayload: unknown): BottlePayload {
  const payload = rawPayload as {
    producer?: unknown
    wineName?: unknown
    name?: unknown
    vintage?: unknown
    region?: unknown
    country?: unknown
    grape?: unknown
    varietal?: unknown
    confidence?: unknown
    needsManualConfirmation?: unknown
    rawVisibleText?: unknown
    note?: unknown
  }

  const name = stringOrUndefined(payload.wineName) ?? stringOrUndefined(payload.name) ?? 'Unrecognized bottle'
  const confidence = normalizeConfidence(payload.confidence)
  const status = confidence >= 0.55 && name !== 'Unrecognized bottle' ? 'recognized' : 'needs-confirmation'

  return {
    status,
    bottle: {
      name,
      producer: stringOrUndefined(payload.producer),
      varietal: stringOrUndefined(payload.grape) ?? stringOrUndefined(payload.varietal),
      region: stringOrUndefined(payload.region),
      vintage: stringOrUndefined(payload.vintage),
      country: stringOrUndefined(payload.country),
      rawVisibleText: Array.isArray(payload.rawVisibleText)
        ? payload.rawVisibleText.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : undefined,
      confidence,
      source: 'claude-vision',
    },
    note:
      stringOrUndefined(payload.note) ??
      (status === 'recognized'
        ? 'Claude Vision recognized the bottle. Confirm the fields before saving.'
        : 'Claude Vision could not confidently identify the bottle. Manual confirmation needed.'),
  }
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.2
  }

  return value > 1 ? Math.max(0, Math.min(1, value / 100)) : Math.max(0, Math.min(1, value))
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

async function callClaudeVision(imageBase64: string, mediaType: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server')
  }

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 800,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text:
                'You are bottle recognition for a wine memory app. Read the wine bottle label from this image. Return ONLY strict JSON with these keys: producer, wineName, vintage, region, country, grape, confidence, needsManualConfirmation, rawVisibleText, note. confidence must be 0 to 1. rawVisibleText must be an array of visible label text strings. If you cannot identify the bottle, use wineName "Unrecognized bottle", confidence 0.2, needsManualConfirmation true, and explain briefly in note. Do not invent details that are not visible.',
            },
          ],
        },
      ],
    }),
  })

  const responsePayload = (await anthropicResponse.json()) as AnthropicVisionResponse & { error?: { message?: string } }

  if (!anthropicResponse.ok) {
    throw new Error(responsePayload.error?.message || 'Claude Vision request failed')
  }

  const text = responsePayload.content?.find((item) => item.type === 'text')?.text
  if (!text) {
    throw new Error('Claude Vision returned no text response')
  }

  return normalizeClaudePayload(extractJsonObject(text))
}

function bottleRecognitionApiPlugin(): Plugin {
  loadLocalEnv()

  async function handler(request: IncomingMessage, response: ServerResponse) {
    if (request.method !== 'POST') {
      writeJson(response, 405, { error: 'Method not allowed' })
      return
    }

    try {
      const body = await readRequestBody(request)
      const { imageBase64, mediaType } = parseMultipartPhoto(body, request.headers['content-type'] ?? '')
      const result = await callClaudeVision(imageBase64, mediaType)
      writeJson(response, 200, result)
    } catch (error) {
      writeJson(response, 500, {
        error: error instanceof Error ? error.message : 'Bottle recognition failed',
      })
    }
  }

  return {
    name: 'vinophobia-bottle-recognition-api',
    configureServer(server) {
      server.middlewares.use('/api/recognize-bottle', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/recognize-bottle', handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), bottleRecognitionApiPlugin()],
  server: {
    allowedHosts: ['vinophobia.thunderhouseai.com'],
  },
  preview: {
    allowedHosts: ['vinophobia.thunderhouseai.com'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.ts',
  },
})
