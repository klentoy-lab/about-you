// The last things picked from the tray, newest first. Per browser, per person.

const KEY = 'ember:recent-stickers'
const MAX = 30

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? []
  } catch {
    return []
  }
}

export function pushRecent(pick) {
  const list = [pick, ...getRecent().filter((p) => !(p.kind === pick.kind && p.source === pick.source))].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage full or blocked — Recent just won't remember */
  }
}
