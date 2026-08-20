import { describe, expect, it } from 'vitest'
import { parseFile } from './files'

describe('source file parsing', () => {
  it('loads text and markdown without changing the source content', async () => {
    const text = await parseFile(new File(['Meeting note'], 'notes.txt', { type: 'text/plain' }))
    const markdown = await parseFile(new File(['# Decision'], 'decision.md', { type: 'text/markdown' }))

    expect(text).toEqual({ title: 'notes.txt', content: 'Meeting note', kind: 'text' })
    expect(markdown).toEqual({ title: 'decision.md', content: '# Decision', kind: 'markdown' })
  })

  it('normalizes valid JSON for readable evidence extraction', async () => {
    const parsed = await parseFile(new File(['{"scope":"upload","priority":0}'], 'feedback.json', { type: 'application/json' }))

    expect(parsed.kind).toBe('json')
    expect(parsed.content).toContain('\n  "scope": "upload"')
  })

  it('reports malformed JSON instead of silently treating it as text', async () => {
    await expect(parseFile(new File(['{"scope"'], 'broken.json', { type: 'application/json' }))).rejects.toThrow()
  })
})
