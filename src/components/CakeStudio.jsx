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
const PLATES = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"]

export default function CakeStudio() {
  const { guestId, name, selfie } = useUserStore()
  const [cake, setCake] = useState(null)
  const [material, setMaterial] = useState("bisque")
  const [row, setRow] = useState(null)
  const [result, setResult] = useState(null)
  const [plate] = useState(() => PLATES[Math.floor(Math.random() * PLATES.length)])
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const input = useRef(null)

  useEffect(() => {
    if (!supabaseReady) return
    supabase.from("cakes").select("*").eq("guest_id", guestId).maybeSingle().then((r) => { if (r.data) setRow(r.data) })
  }, [guestId])

  const take = async (file) => {
    try { setCake(await squash(file)); setError(null) } catch (e) { setError(e.message) }
  }

  const putOnTable = async (shot) => {
    const path = guestId + "/" + Date.now() + "-cake.jpg"
    const up = await supabase.storage.from("cakes").upload(path, shot.blob, { contentType: "image/jpeg", upsert: true })
    if (up.error) throw up.error
    const url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
    const { data } = await supabase.from("cakes").upsert(
      { guest_id: guestId, name, cake_url: url, updated_at: new Date().toISOString() },
      { onConflict: "guest_id" }
    ).select().maybeSingle()
    setRow(data)
    return url
  }

  const share = async () => {
    if (!cake) { setError("Take a photo of your cake first."); return }
    setBusy("upload"); setError(null)
    try { await putOnTable(cake) } catch (e) { setError("Upload failed. " + (e.message || "")) } finally { setBusy(null) }
  }

  const removeCake = async () => {
    if (!supabaseReady || !row) return
    setBusy("remove")
    await supabase.from("cakes").update({ cake_url: null, topper_url: null }).eq("guest_id", guestId)
    setRow(null); setCake(null); setResult(null); setBusy(null)
  }

  const make = async () => {
    if (!cake) { setError("Take a photo of your cake first."); return }
    if (!selfie) { setError("You need a photo of you. Add one on the welcome screen."); return }
    setBusy("make"); setError(null)
    try {
      const sr = await fetch(selfie)
      const sb = await sr.blob()
      const s64 = await new Promise((res, rej) => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result.split(",")[1])
        fr.onerror = rej
        fr.readAsDataURL(sb)
      })
      const r = await fetch("/api/imagine", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "topper", material,
          cake: { media_type: "image/jpeg", data: cake.base64 },
          selfie: { media_type: "image/jpeg", data: s64 }
        })
      })
      const out = await r.json()
      if (!r.ok || !out.image) throw new Error(out.detail || out.error || "That did not work.")
      setResult(out)
    } catch (e) { setError(e.message) } finally { setBusy(null) }
  }

  const keep = async () => {
    if (!result || !supabaseReady) return
    setBusy("keep")
    try {
      let cakeUrl = row && row.cake_url
      if (!cakeUrl && cake) cakeUrl = await putOnTable(cake)
      const path = guestId + "/topper-" + Date.now() + ".png"
      const up = await supabase.storage.from("cakes").upload(path, b64ToBlob(result.image), { contentType: "image/png", upsert: true })
      if (up.error) throw up.error
      const url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
      await supabase.from("cakes").upsert(
        { guest_id: guestId, name, cake_url: cakeUrl, topper_url: url, topper_caption: result.provenance, updated_at: new Date().toISOString() },
        { onConflict: "guest_id" }
      )
      setResult({ ...result, saved: true })
    } catch (e) { setError(e.message) } finally { setBusy(null) }
  }

  if (result) {
    return (
      <div className="plate">
        <p className="plate-no">Plate {plate}</p>
        <div className="plate-frame"><img src={"data:image/png;base64," + result.image} alt="Your cake" /></div>
        <p className="plate-title">{name}, <em>seated</em></p>
        <p className="plate-prov">{result.provenance}</p>
        {error && <p className="cs-err">{error}</p>}
        <div className="plate-actions">
          <button className="btn" onClick={keep} disabled={busy || result.saved}>{result.saved ? "Kept" : busy === "keep" ? "Keeping" : "Keep it"}</button>
          <button className="btn quiet" onClick={() => setResult(null)} disabled={busy}>Again</button>
        </div>
      </div>
    )
  }

  const shown = cake ? cake.preview : (row && row.cake_url)

  return (
    <div className="stack">
      <div className="card">
        <p className="eyebrow">Your station</p>
        <h2 className="title">Put a tiny you on your cake</h2>
        <p className="lede">Photograph the cake. We already have your face.</p>
      </div>

      <div className="card">
        <button className="cs-shot" onClick={() => input.current && input.current.click()}>
          {shown ? <><img src={shown} alt="Your cake" /><span>Retake</span></> : <><span className="cs-plus">+</span><span className="cs-hint">Photograph your cake</span></>}
        </button>
        <input ref={input} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) take(f); e.target.value = "" }} />
        {shown && (
          <div className="cs-row">
            <button className="btn ghost" onClick={share} disabled={busy === "upload"}>
              {busy === "upload" ? "Sending" : row && row.cake_url ? "Update on the table" : "Put it on the table"}
            </button>
            {row && row.cake_url && <button className="btn ghost danger" onClick={removeCake} disabled={busy === "remove"}>Remove</button>}
          </div>
        )}
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
        {!selfie && <p className="cs-warn">No photo of you yet. It goes on the welcome screen.</p>}
        {error && <p className="cs-err">{error}</p>}
        <button className="btn gold" onClick={make} disabled={busy === "make"}>{busy === "make" ? "Making it" : "Make it"}</button>
      </div>

      {row && row.topper_url && (
        <div className="plate">
          <p className="plate-no">Kept</p>
          <div className="plate-frame"><img src={row.topper_url} alt="Your topper" /></div>
          <p className="plate-prov">{row.topper_caption}</p>
        </div>
      )}
    </div>
  )
}
