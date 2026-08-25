import React, { useRef, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import { squash, b64ToBlob } from "../lib/photo"
import "./PutMeOnMyCake.css"

const MATERIALS = [
{ id: "bisque", name: "Bisque", note: "Matte porcelain, 1950s", swatch: "#F5EDE4" },
{ id: "icing", name: "Royal icing", note: "Piped by a shaky hand", swatch: "#F2C4CE" },
{ id: "cameo", name: "Cameo", note: "Carved, side profile", swatch: "#D8C8E0" },
{ id: "sugar", name: "Sugar sheet", note: "Printed, ink slightly bled", swatch: "#EFE0DA" }
]

const PLATES = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"]

export default function PutMeOnMyCake({ cake }) {
const { guestId, name } = useUserStore()
const [selfie, setSelfie] = useState(null)
const [material, setMaterial] = useState("bisque")
const [result, setResult] = useState(null)
const [plate] = useState(() => PLATES[Math.floor(Math.random() * PLATES.length)])
const [busy, setBusy] = useState(false)
const [error, setError] = useState(null)
const input = useRef(null)

const pickSelfie = async (file) => {
try {
setSelfie(await squash(file, 900))
setError(null)
} catch (e) {
setError(e.message)
}
}

const make = async () => {
if (!cake) { setError("Take a photo of your cake first."); return }
if (!selfie) { setError("Add a selfie to be on the cake."); return }
setBusy(true)
setError(null)
try {
const r = await fetch("/api/imagine", {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({
mode: "topper",
material,
cake: { media_type: "image/jpeg", data: cake.base64 },
selfie: { media_type: "image/jpeg", data: selfie.base64 }
})
})
const out = await r.json()
if (!r.ok || !out.image) throw new Error(out.detail || out.error || "That did not work.")
setResult(out)
} catch (e) {
setError(e.message)
} finally {
setBusy(false)
}
}

const putOnTable = async () => {
if (!result || !supabaseReady) return
setBusy(true)
try {
const path = guestId + "/topper-" + Date.now() + ".png"
const up = await supabase.storage.from("cakes").upload(path, b64ToBlob(result.image), { contentType: "image/png", upsert: true })
if (up.error) throw up.error
const url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
await supabase.from("cakes").update({ topper_url: url, topper_caption: result.provenance }).eq("guest_id", guestId)
setError(null)
setResult((r) => ({ ...r, saved: true }))
} catch (e) {
setError(e.message)
} finally {
setBusy(false)
}
}

if (result) {
return (
<div className="plate">
<p className="plate-no">Plate {plate}</p>
<div className="plate-frame">
<img src={"data:image/png;base64," + result.image} alt="Your cake" />
</div>
<p className="plate-title">{name}, <em>seated</em></p>
<p className="plate-prov">{result.provenance}</p>
{error && <p className="err">{error}</p>}
<div className="plate-actions">
<button className="btn" onClick={putOnTable} disabled={busy || result.saved}>
{result.saved ? "On the table" : busy ? "Sending" : "Put on the table"}
</button>
<button className="btn quiet" onClick={() => setResult(null)} disabled={busy}>Again</button>
</div>
</div>
)
}

return (
<div className="studio">
<p className="studio-eyebrow">Put me on my cake</p>
<h2 className="studio-title">What should tiny you be made of?</h2>

<div className="materials">
{MATERIALS.map((m) => (
<button key={m.id} className={"material" + (material === m.id ? " on" : "")} onClick={() => setMaterial(m.id)}>
<span className="swatch" style={{ background: m.swatch }} />
<span className="material-name">{m.name}</span>
<span className="material-note">{m.note}</span>
</button>
))}
</div>

<button className="selfie-slot" onClick={() => input.current && input.current.click()}>
{selfie ? (
<>
<img src={selfie.preview} alt="Your selfie" />
<span>Selfie added. Tap to change.</span>
</>
) : (
<>
<span className="ring">+</span>
<span>Add a selfie</span>
</>
)}
</button>
<input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) pickSelfie(f); e.target.value = "" }} />

{error && <p className="err">{error}</p>}

<button className="btn gold" onClick={make} disabled={busy}>
{busy ? "Making it" : "Make it"}
</button>
</div>
)
}
