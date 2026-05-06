/**
 * AtlasStoryBinding — headless component that binds active story chapters
 * to the constellation's visual state.
 *
 * omega-N N2: story-chart binding.
 * Ref: NYT "How the Virus Got Out" (camera follows the narrative through the
 *      data) + ICIJ Pandora Papers (story chapters drive entity highlights).
 *
 * When a story chapter is active:
 *   1. Dispatches zoom-into-cluster for the chapter's pinnedCode (if any)
 *      so the existing zoom layer animates to it.
 *   2. Calls onHighlightChange([clusterCode]) so the parent can pass
 *      highlightedClusterCodes to the constellation — dimming unrelated
 *      clusters to 0.15 opacity.
 *
 * When the story ends or chapter has no cluster reference:
 *   - Dispatches escape-zoom.
 *   - Calls onHighlightChange([]) to restore full constellation opacity.
 *
 * Renders null — purely behavioral.
 */

import { useEffect, useRef } from 'react'
import type { Story, StoryChapter } from '@/lib/atlas-stories'
import { useAtlasDispatch } from './AtlasContext'

export interface AtlasStoryBindingProps {
  activeStory: Story | null
  activeChapterIndex: number
  onHighlightChange: (clusterCodes: string[]) => void
}

export function AtlasStoryBinding({
  activeStory,
  activeChapterIndex,
  onHighlightChange,
}: AtlasStoryBindingProps) {
  // omega-N-FIX1: behavior disabled while we isolate the React #301 cause.
  // The chapter strip overlay + engine label upgrades remain functional;
  // this binding (auto-zoom + dim non-chapter clusters) is paused.
  void activeStory
  void activeChapterIndex
  void onHighlightChange
  return null
  // eslint-disable-next-line @typescript-eslint/no-unreachable, no-unreachable
  const dispatch = useAtlasDispatch()

  // Track previous chapter so we only fire dispatch when chapter actually changes
  const prevChapterRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeStory) {
      // Story closed — escape zoom, clear highlights
      const key = null
      if (prevChapterRef.current !== key) {
        prevChapterRef.current = key
        dispatch({ type: 'escape-zoom' })
        onHighlightChange([])
      }
      return
    }

    const chapter: StoryChapter | undefined = activeStory.chapters[activeChapterIndex]
    if (!chapter) {
      // Chapter out of bounds (story ended) — escape zoom, clear highlights
      const key = `${activeStory.id}-ended`
      if (prevChapterRef.current !== key) {
        prevChapterRef.current = key
        dispatch({ type: 'escape-zoom' })
        onHighlightChange([])
      }
      return
    }

    const pinnedCode = chapter.state.pinnedCode
    const chapterKey = `${activeStory.id}-${chapter.id}`

    if (prevChapterRef.current === chapterKey) return // already applied
    prevChapterRef.current = chapterKey

    if (pinnedCode) {
      // Zoom into the chapter's cluster and highlight it
      dispatch({ type: 'zoom-into-cluster', code: pinnedCode })
      onHighlightChange([pinnedCode])
    } else {
      // Chapter has no specific cluster — escape zoom and show all clusters
      dispatch({ type: 'escape-zoom' })
      onHighlightChange([])
    }
  }, [activeStory, activeChapterIndex, dispatch, onHighlightChange])

  return null
}
