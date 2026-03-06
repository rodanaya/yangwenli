/**
 * useWikipediaImage
 * Fetches the thumbnail image URL from the Wikipedia REST API for a given article title.
 * Uses Spanish Wikipedia (es.wikipedia.org) — better coverage for Mexican subjects.
 * Falls back to English Wikipedia if Spanish returns no thumbnail.
 *
 * Endpoint: https://es.wikipedia.org/api/rest_v1/page/summary/{title}
 * This is a public CORS-enabled API — no API key required.
 * Results cached 24 hours to avoid repeated fetches.
 */

import { useQuery } from '@tanstack/react-query'

interface WikiImageResult {
  src: string | null
  isLoading: boolean
  error: boolean
}

async function fetchWikiThumb(article: string, lang: 'es' | 'en'): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  return (data.thumbnail?.source as string) ?? null
}

export function useWikipediaImage(
  article: string | undefined | null,
  /** Try English Wikipedia if Spanish has no thumbnail */
  fallbackLang: 'en' | null = 'en',
): WikiImageResult {
  const { data, isLoading, isError } = useQuery<string | null>({
    queryKey: ['wiki-image', article, fallbackLang],
    queryFn: async () => {
      if (!article) return null
      const es = await fetchWikiThumb(article, 'es')
      if (es) return es
      if (fallbackLang === 'en') {
        return await fetchWikiThumb(article, 'en')
      }
      return null
    },
    enabled: !!article,
    staleTime: 1000 * 60 * 60 * 24,   // 24 h
    gcTime:    1000 * 60 * 60 * 24,
    retry: 1,
  })

  return {
    src: data ?? null,
    isLoading: !!article && isLoading,
    error: isError,
  }
}
