import { stickerById } from '../lib/stickers.js'

/** Draws one canvas item or tray pick: an Ember sticker (inline SVG) or a GIF. */
export default function StickerArt({ item, preview = false }) {
  if (item.kind === 'sticker') {
    const s = stickerById[item.source]
    if (!s) return null
    return <span aria-hidden className="block w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: s.svg }} />
  }
  return (
    <img
      src={preview && item.preview ? item.preview : item.src}
      alt=""
      draggable={false}
      loading="lazy"
      className="block h-full w-full select-none object-cover"
    />
  )
}
