import React, { useEffect, useRef, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import { squash } from "../lib/photo"
import PutMeOnMyCake from "./PutMeOnMyCake"
import "./MyCake.css"

function Slot({ title, hint, shot, onPick }) {
const input = useRef(null)
return (
<div className="slot">
<p className="eyebrow">{title}</p>
{shot ? (
<button className="shot" onClick={() => input.current && input.current.click()}>
<img src={shot.preview} alt={title} />
<span>Retake</span>
</button>
) : (
<button className="shot empty-shot" onClick={() => input.current && input.current.click()}>
<span className="plus">+</span>
<span className="hint">{hint}</span>
</button>
)}
<input ref={input} type="file" accept="image/*" capture="environment" hidden
onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onPick(f); e.target.value = "" }} />
</div>
)
}

export default function MyCake() {
const { guestId, name } = useUserStore()
const [cake, setCake] = useState(null)
const [decor, setDecor] = useState(null)
const [row, setRow] = useState(null)
const [busy, setBusy] = useState(false)
const [status, setStatus] = useState(null)

useEffect(() => {
if (!supabaseReady) return
supabase.from("cakes").select("*").eq("guest_id", guestId).maybeSingle()
.then(({ data }) => { if (data) setRow(data) })
}, [guestId])

const take = async (file, which) => {
try {
const shot = await squash(file)
if (which === "cake") setCake(shot); else setDecor(shot)
setStatus(null)
} catch (e) { setStatus({ bad: true, text: e.message }) }
}

const share = async () => {
if (!name.trim()) { setStatus({ bad: true, text: "Sign the guest book first." }); return }
if (!cake) { setStatus({ bad: true, text: "Take a photo of your cake first." }); return }
if (!supabaseReady) { setStatus({ bad: true, text: "Not connected yet." }); return }
setBusy(true); setStatus(null)
try {
const stamp = Date.now()
const put = async (shot, tag) => {
const path = guestId + "/" + stamp + "-" + tag + ".jpg"
const up = await supabase.storage.from("cakes").upload(path, shot.blob, { contentType: "image/jpeg", upsert: true })
if (up.error) throw up.error
return supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
}
const cake_url = await put(cake, "cake")
const decor_url = decor ? await put(decor, "decor") : null
const { data, error } = await supabase.from("cakes").upsert(
{ guest_id: guestId, name, cake_url, decor_url, updated_at: new Date().toISOString() },
{ onConflict: "guest_id" }
).select().maybeSingle()
if (error) throw error
setRow(data)
setStatus({ text: "Up on the table." })
} catch (e) {
setStatus({ bad: true, text: "Upload failed. " + (e.message || "") })
} finally { setBusy(false) }
}

return (
<div className="stack">
<div className="card">
<span className="sticker">Work in progress</span>
<p className="eyebrow">Your station</p>
<h2 className="title">Show us the cake</h2>
<p className="lede">One of the cake. One of your sprinkles, if you have them.</p>
</div>

<div className="card">
<div className="slots">
<Slot title="The cake" hint="Take photo" shot={cake} onPick={(f) => take(f, "cake")} />
<Slot title="Your sprinkles" hint="Optional" shot={decor} onPick={(f) => take(f, "decor")} />
</div>
</div>

{status && <div className={"notice" + (status.bad ? " bad" : "")}>{status.text}</div>}

<button className="btn" onClick={share} disabled={busy}>
{busy ? "Sending" : row ? "Replace my cake" : "Put it on the table"}
</button>

{cake && <PutMeOnMyCake cake={cake} />}
</div>
)
}
