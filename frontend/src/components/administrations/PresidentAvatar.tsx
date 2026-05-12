/**
 * PresidentAvatar — fetches official portrait from Wikipedia, falls back to
 * styled initials. Extracted from pages/Administrations.tsx (2026-05-11) to
 * trim that 3,671-LOC monolith.
 *
 * Used by AdminDossierPanel and the admin selector strip.
 */
import { memo } from 'react'
import { useWikipediaImage } from '@/hooks/useWikipediaImage'

interface Props {
  wikiArticle: string
  fullName: string
  color: string
  /** Square size in pixels. Defaults to 32. */
  size?: number
}

export const PresidentAvatar = memo(function PresidentAvatar({
  wikiArticle,
  fullName,
  color,
  size = 32,
}: Props) {
  const { src, isLoading } = useWikipediaImage(wikiArticle)
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

  return (
    <div
      className="flex-shrink-0 rounded-full overflow-hidden border-2"
      style={{
        width: size,
        height: size,
        borderColor: `${color}60`,
        backgroundColor: `${color}22`,
      }}
    >
      {src && !isLoading ? (
        <img
          src={src}
          alt={fullName}
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <span
          className="w-full h-full flex items-center justify-center font-black font-mono"
          style={{ fontSize: size * 0.31, color }}
        >
          {initials}
        </span>
      )}
    </div>
  )
})

export default PresidentAvatar
