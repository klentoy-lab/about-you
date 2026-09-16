// Geometry shared by the sticker canvas and the code that places new picks on it.

export const MIN_PX = 36
export const MAX_X = 1.3

/** Lowest allowed centre y: an item may not rise above the canvas and cover the controls over it. */
export const topLimit = (it, width) => (Math.max(MIN_PX, it.w * width) * it.aspect) / 2
