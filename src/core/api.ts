const configuredBase = (import.meta.env.VITE_AGENT_API_URL as string | undefined)?.trim().replace(/\/$/, '') ?? ''

export function agentApiUrl(path: string): string {
  return `${configuredBase}${path.startsWith('/') ? path : `/${path}`}`
}
