import mammoth from 'mammoth'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { SourceKind } from './types'

GlobalWorkerOptions.workerSrc = workerUrl

export interface ParsedFile {
  title: string
  content: string
  kind: SourceKind
}

function extensionOf(filename: string): string {
  return filename.toLowerCase().split('.').pop() ?? ''
}

async function parsePdf(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const document = await getDocument({ data }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
  }
  return pages.join('\n')
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const extension = extensionOf(file.name)
  if (extension === 'pdf') {
    return { title: file.name, content: await parsePdf(file), kind: 'pdf' }
  }
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return { title: file.name, content: result.value, kind: 'docx' }
  }
  const raw = await file.text()
  if (extension === 'json') {
    const data: unknown = JSON.parse(raw)
    return { title: file.name, content: JSON.stringify(data, null, 2), kind: 'json' }
  }
  if (extension === 'md' || extension === 'markdown') {
    return { title: file.name, content: raw, kind: 'markdown' }
  }
  return { title: file.name, content: raw, kind: 'text' }
}

