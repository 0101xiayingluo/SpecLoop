import { nowIso, stableId } from './id'
import type { EvidenceFragment, EvidenceProvenance, IngestionMethod, SignalKind, SourceKind, SourceMaterial } from './types'

const assumptionPattern = /应该|大概|可能|也许|暂定|先假设|估计|最好|probably|maybe|assum/iu

function canonicalText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function canonicalQuote(value: string): string {
  return value.replace(/^\s*[-*#>]+\s*/, '').replace(/\s+/g, ' ').trim()
}

export function inferProvenance(kind: SourceKind): EvidenceProvenance {
  if (kind === 'feedback') return 'product-feedback'
  if (kind === 'pdf' || kind === 'docx' || kind === 'markdown' || kind === 'json' || kind === 'text') return 'project-document'
  return 'other'
}

export function createSourceMaterial(
  title: string,
  content: string,
  kind: SourceKind,
  provenance: EvidenceProvenance = inferProvenance(kind),
  ingestionMethod: IngestionMethod = kind === 'paste' ? 'paste' : kind === 'feedback' ? 'feedback-flow' : 'upload',
  existingSources: SourceMaterial[] = [],
): SourceMaterial {
  const normalized = canonicalText(content)
  const fingerprint = stableId('fingerprint', normalized.toLocaleLowerCase())
  const duplicate = existingSources.find((source) => source.fingerprint === fingerprint)
  return {
    id: stableId('source', `${title}:${fingerprint}`),
    title: title.trim() || 'Untitled source',
    kind,
    content: normalized,
    createdAt: nowIso(),
    provenance,
    ingestionMethod,
    fingerprint,
    ...(duplicate ? { duplicateOf: duplicate.id } : {}),
  }
}

export function extractEvidence(source: SourceMaterial, signalOverride?: SignalKind): EvidenceFragment[] {
  if (source.duplicateOf) return []
  const candidates: EvidenceFragment[] = []
  const lines = source.content.split('\n')
  lines.forEach((line, lineIndex) => {
    const cleaned = canonicalQuote(line)
    if (!cleaned) return
    for (const sentence of cleaned.split(/(?<=[。！？!?；;])\s*/u).filter(Boolean)) {
      const quote = canonicalQuote(sentence)
      if (quote.length < 4) continue
      candidates.push({
        id: stableId('ev', `${source.id}:${lineIndex + 1}:${quote}`),
        sourceId: source.id,
        quote,
        lineStart: lineIndex + 1,
        lineEnd: lineIndex + 1,
        signal: signalOverride ?? (assumptionPattern.test(quote) ? 'assumption' : 'fact'),
      })
    }
  })

  const seen = new Set<string>()
  return candidates.filter((fragment) => {
    const key = fragment.quote.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
