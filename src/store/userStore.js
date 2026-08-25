import { create } from "zustand"
import { getGuestId } from "../lib/identity"

const NAME_KEY = "cakeparty.name"
const SELFIE_KEY = "cakeparty.selfie"
const read = (k) => { try { return localStorage.getItem(k) || "" } catch { return "" } }

export const useUserStore = create((set) => ({
guestId: getGuestId(),
name: read(NAME_KEY),
selfie: read(SELFIE_KEY),
setName: (name) => {
const clean = name.trim().slice(0, 30)
try { localStorage.setItem(NAME_KEY, clean) } catch {}
set({ name: clean })
},
setSelfie: (url) => {
try { localStorage.setItem(SELFIE_KEY, url) } catch {}
set({ selfie: url })
}
}))
