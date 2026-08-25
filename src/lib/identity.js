// One stable guest id per device, kept in localStorage.
// This is what the old build got wrong: it minted a new id on every page load,
// so nothing a person saved was ever found again.

const KEY = 'cakeparty.guestId'

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'g-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getGuestId() {
  let id = null
  try {
    id = localStorage.getItem(KEY)
    if (!id) {
      id = makeId()
      localStorage.setItem(KEY, id)
    }
  } catch {
    id = makeId()
  }
  return id
}
