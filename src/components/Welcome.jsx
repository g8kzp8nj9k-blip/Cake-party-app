import React, { useRef, useState } from "react"
import { useUserStore } from "../store/userStore"
import { squash } from "../lib/photo"
import { supabase, supabaseReady } from "../lib/supabase"
import "./Welcome.css"

export default function Welcome({ onDone }) {
  const { guestId, name, setName, selfie, setSelfie } = useUserStore()
  const [draft, setDraft] = useState(name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const input = useRef(null)

  const takeSelfie = async (file) => {
    try {
      const shot = await squash(file, 600, 0.82)
      setSelfie(shot.preview)
      window.__pendingSelfie = shot
      setError(null)
    } catch (e) { setError("Could not read that photo.") }
  }

  const enter = async () => {
    if (!draft.trim()) { setError("We need a name to put on things."); return }
    setBusy(true)
    setName(draft)
    try {
      if (supabaseReady) {
        let url = null
        const shot = window.__pendingSelfie
        if (shot) {
          const path = guestId + "/selfie.jpg"
          const up = await supabase.storage.from("cakes").upload(path, shot.blob, { contentType: "image/jpeg", upsert: true })
          if (!up.error) {
            url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl + "?v=" + Date.now()
            setSelfie(url)
          }
        }
        await supabase.from("answers").upsert(
          { guest_id: guestId, name: draft.trim(), selfie_url: url || selfie || null, updated_at: new Date().toISOString() },
          { onConflict: "guest_id" }
        )
      }
    } catch (e) {}
    setBusy(false)
    onDone()
  }

  return (
    <div className="welcome">
      <div className="wl-ticker"><span>No. 01</span><span>Not a competition</span></div>
      <div className="wl-body">
        <h1 className="wl-title">Cake<em>Party</em></h1>
        <p className="wl-sub">We meet &middot; we hang &middot; we decorate</p>
        <button className="wl-selfie" onClick={() => input.current && input.current.click()}>
          {selfie ? <img src={selfie} alt="You" /> : <span className="wl-plus">+</span>}
        </button>
        <p className="wl-hint">{selfie ? "Tap to change" : "Add a photo of you"}</p>
        <input ref={input} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) takeSelfie(f); e.target.value = "" }} />
        <label className="wl-label" htmlFor="wl-name">Your name</label>
        <input id="wl-name" className="wl-name" value={draft} placeholder="type it here" maxLength={30}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enter() }} />
        {error && <p className="wl-err">{error}</p>}
        <button className="btn wl-go" onClick={enter} disabled={busy}>{busy ? "One moment" : "Come in"}</button>
      </div>
    </div>
  )
}
