import { describe, expect, it } from 'vitest'
import { createSourceMaterial, extractEvidence } from './evidencePipeline'

describe('evidence acquisition pipeline', () => {
  it('normalizes duplicate input while preserving provenance registration', () => {
    const first = createSourceMaterial('Interview A', '用户说：需要上传 PDF。\r\n\r\n最好支持 DOCX。', 'paste', 'user-interview')
    const duplicate = createSourceMaterial('Interview copy', ' 用户说：需要上传 PDF。\n\n最好支持 DOCX。 ', 'paste', 'chat', 'paste', [first])

    expect(first.provenance).toBe('user-interview')
    expect(first.ingestionMethod).toBe('paste')
    expect(duplicate.duplicateOf).toBe(first.id)
    expect(extractEvidence(first)).toHaveLength(2)
    expect(extractEvidence(duplicate)).toHaveLength(0)
  })

  it('deduplicates repeated fragments inside one source and keeps line references', () => {
    const source = createSourceMaterial('Notes', '首版支持导出 PRD。\n首版支持导出 PRD。', 'paste', 'meeting')
    const fragments = extractEvidence(source)

    expect(fragments).toHaveLength(1)
    expect(fragments[0]).toMatchObject({ sourceId: source.id, lineStart: 1, lineEnd: 1 })
  })
})
