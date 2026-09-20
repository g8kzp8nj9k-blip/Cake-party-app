import React, { useEffect, useRef, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import { squash, b64ToBlob } from "../lib/photo"
import "./CakeStudio.css"

const MATERIALS = [
  { id: "bisque", name: "Bisque", note: "Matte porcelain, 1950s", swatch: "#F5EDE4" },
  { id: "icing", name: "Royal icing", note: "Piped by a shaky hand", swatch: "#F2C4CE" },
  { id: "cameo", name: "Cameo", note: "Carved, side profile", swatch: "#D8C8E0" },
  { id: "sugar", name: "Sugar sheet", note: "Printed, ink slightly bled", swatch: "#EFE0DA" }
]

export default function CakeStudio() {
  const { guestId, name, selfie, setSelfie } = useUserStore()
  const [cake, setCake] = useState(null)
  const [face, setFace] = useState(null)
  const [material, setMaterial] = useState("bisque")
  const [row, setRow] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const cakeIn = useRef(null)
  const faceIn = useRef(null)

  useEffect(() => {
    if (!supabaseReady) return
    supabase.from("cakes").select("*").eq("guest_id", guestId).maybeSingle().then((r) => { if (r.data) setRow(r.data) })
  }, [guestId])

  const takeCake = async (f) => { try { setCake(await squash(f)); setError(null) } catch (e) { setError(e.message) } }
  const takeFace = async (f) => {
    try {
      const s = await squash(f, 700, 0.85)
      setFace(s); setSelfie(s.preview); setError(null)
    } catch (e) { setError(e.message) }
  }

  const upload = async (shot) => {
    const path = guestId + "/" + Date.now() + "-cake.jpg"
    const up = await supabase.storage.from("cakes").upload(path, shot.blob, { contentType: "image/jpeg", upsert: true })
    if (up.error) throw up.error
    const url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
    const { data } = await supabase.from("cakes").upsert(
      { guest_id: guestId, name, cake_url: url, updated_at: new Date().toISOString() }, { onConflict: "guest_id" }
    ).select().maybeSingle()
    setRow(data)
    return url
  }

  const share = async () => {
    if (!cake) { setError("Photograph your cake first."); return }
    setBusy("up"); setError(null)
    try { await upload(cake) } catch (e) { setError(e.message) } finally { setBusy(null) }
  }

  const faceB64 = async () => {
    if (face) return face.base64
    if (!selfie) return null
    const r = await fetch(selfie)
    const b = await r.blob()
    return new Promise((res, rej) => {
      const fr = new FileReader()
      fr.onload = () => res(fr.result.split(",")[1])
      fr.onerror = rej
      fr.readAsDataURL(b)
    })
  }

  const make = async () => {
    if (!cake) { setError("Photograph your cake first."); return }
    const f = await faceB64()
    if (!f) { setError("Add a photo of your face first."); return }
    setBusy("make"); setError(null)
    try {
      const r = await fetch("/api/imagine", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "topper", material,
          cake: { media_type: "image/jpeg", data: cake.base64 },
          selfie: { media_type: "image/jpeg", data: f } })
      })
      const out = await r.json()
      if (!r.ok || !out.image) throw new Error(out.detail || out.error || "That did not work.")
      setResult(out)
    } catch (e) { setError(e.message) } finally { setBusy(null) }
  }

  const keep = async () => {
    setBusy("keep")
    try {
      let cu = row && row.cake_url
      if (!cu && cake) cu = await upload(cake)
      const path = guestId + "/topper-" + Date.now() + ".png"
      const up = await supabase.storage.from("cakes").upload(path, b64ToBlob(result.image), { contentType: "image/png", upsert: true })
      if (up.error) throw up.error
      const url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
      await supabase.from("cakes").upsert({ guest_id: guestId, name, cake_url: cu, topper_url: url, topper_caption: result.provenance, updated_at: new Date().toISOString() }, { onConflict: "guest_id" })
      setResult({ ...result, saved: true })
    } catch (e) { setError(e.message) } finally { setBusy(null) }
  }

  if (result) {
    return (
      <div className="plate">
        <p className="plate-no">Plate</p>
        <div className="plate-frame"><img src={"data:image/png;base64," + result.image} alt="" /></div>
        <p className="plate-title">{name}, <em>seated</em></p>
        <p className="plate-prov">{result.provenance}</p>
        {error && <p className="cs-err">{error}</p>}
        <div className="plate-actions">
          <button className="btn" onClick={keep} disabled={busy || result.saved}>{result.saved ? "Kept" : "Keep it"}</button>
          <button className="btn quiet" onClick={() => setResult(null)}>Again</button>
        </div>
      </div>
    )
  }

  const shownCake = cake ? cake.preview : (row && row.cake_url)
  const shownFace = face ? face.preview : selfie

  return (
    <div className="stack">
      <div className="card">
        <p className="eyebrow">Your station</p>
        <h2 className="title">Put a tiny you on your cake</h2>
        <p className="lede">Two photos. The cake, and your face.</p>
      </div>

      <div className="card">
        <div className="slots">
          <div className="slot">
            <p className="eyebrow">The cake</p>
            <button className="shot" onClick={() => cakeIn.current.click()}>
              {shownCake ? <img src={shownCake} alt="" /> : <span className="cs-plus">+</span>}
            </button>
          </div>
          <div className="slot">
            <p className="eyebrow">Your face</p>
            <button className="shot" onClick={() => faceIn.current.click()}>
              {shownFace ? <img src={shownFace} alt="" /> : <span className="cs-plus">+</span>}
            </button>
          </div>
        </div>
        <input ref={cakeIn} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; if (f) takeCake(f); e.target.value = "" }} />
        <input ref={faceIn} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; if (f) takeFace(f); e.target.value = "" }} />
        {shownCake && <button className="btn ghost" onClick={share} disabled={busy === "up"} style={{ marginTop: 12 }}>{busy === "up" ? "Sending" : "Put it on the table"}</button>}
      </div>

      <div className="cs-studio">
        <p className="cs-eyebrow">The topper</p>
        <h3 className="cs-title">What should tiny you be made of?</h3>
        <div className="cs-materials">
          {MATERIALS.map((m) => (
            <button key={m.id} className={"cs-material" + (material === m.id ? " on" : "")} onClick={() => setMaterial(m.id)}>
              <span className="cs-swatch" style={{ background: m.swatch }} />
              <span className="cs-mat-name">{m.name}</span>
              <span className="cs-mat-note">{m.note}</span>
            </button>
          ))}
        </div>
        {error && <p className="cs-err">{error}</p>}
        <button className="btn gold" onClick={make} disabled={busy === "make"}>{busy === "make" ? "Making it" : "Make it"}</button>
      </div>
    </div>
  )
}
