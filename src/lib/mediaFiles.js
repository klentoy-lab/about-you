// Turns picked or dropped files into stored media items.
// Photos are straightened (EXIF) and downscaled to a sensible size; GIFs and videos are kept as-is.

import { putFile } from './mediaStore.js'
import { uid } from './store.js'

const MAX_EDGE = 2400
const MAX_PHOTO_BYTES = 40 * 1024 * 1024
const MAX_VIDEO_BYTES = 300 * 1024 * 1024

export const ACCEPT = 'image/*,video/*'

export class MediaError extends Error {}

const mb = (n) => `${Math.round(n / 1024 / 1024)} MB`

async function preparePhoto(file) {
  if (file.size > MAX_PHOTO_BYTES) throw new MediaError(`too large (over ${mb(MAX_PHOTO_BYTES)})`)

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new MediaError('this browser can’t open that image format')
  }
  const { width, height } = bitmap

  // Animated GIFs would lose their animation on a canvas; small images don't need it.
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  if (file.type === 'image/gif' || (scale === 1 && file.size < 3 * 1024 * 1024)) {
    bitmap.close?.()
    return { blob: file, width, height }
  }

  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  const wantAlpha = file.type === 'image/png' || file.type === 'image/webp'
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.88))
  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise((r) => canvas.toBlob(r, wantAlpha ? 'image/png' : 'image/jpeg', 0.88))
  }
  return { blob, width: w, height: h }
}

function prepareVideo(file) {
  if (file.size > MAX_VIDEO_BYTES) throw new MediaError(`too large (over ${mb(MAX_VIDEO_BYTES)})`)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    const done = () => URL.revokeObjectURL(url)
    v.onloadedmetadata = () => {
      done()
      if (!v.videoWidth) return reject(new MediaError('this browser can’t play that video format'))
      resolve({ blob: file, width: v.videoWidth, height: v.videoHeight, duration: v.duration })
    }
    v.onerror = () => {
      done()
      reject(new MediaError('this browser can’t play that video format'))
    }
    v.src = url
  })
}

/** Prepares and stores one file. Resolves to a media item for the entry. */
export async function addFile(file) {
  const kind = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)
      ? 'photo'
      : null
  if (!kind) throw new MediaError('not a photo or video')

  const prepared = kind === 'photo' ? await preparePhoto(file) : await prepareVideo(file)
  const id = uid()
  try {
    await putFile(id, prepared.blob)
  } catch (e) {
    throw new MediaError(e?.name === 'QuotaExceededError' ? 'out of storage space' : 'couldn’t be saved')
  }
  return {
    id,
    kind,
    type: prepared.blob.type,
    name: file.name,
    width: prepared.width,
    height: prepared.height,
    duration: prepared.duration ?? null,
    caption: '',
    createdAt: new Date().toISOString(),
  }
}

/** Every file in a FileList — unsupported ones are reported by addFile, not silently dropped. */
export const filesFrom = (list) => [...(list ?? [])]
