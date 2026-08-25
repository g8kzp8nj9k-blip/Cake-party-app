import { create } from 'zustand'
import { getGuestId } from '../lib/identity'

const NAME_KEY = 'cakeparty.name'

export const useUserStore = create((set) => ({
  guestId: getGuestId(),
  name: (() => { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } })(),
  setName: (name) => {
    const clean = name.trim().slice(0, 30)
    try { localStorage.setItem(NAME_KEY, clean) } catch {}
    set({ name: clean })
  }
}))
