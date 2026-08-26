import React, { useEffect, useRef, useState, useCallback } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import { squash } from "../lib/photo"
import "./CameraRoll.css"

export default function CameraRoll() {
const { guestId, name } = useUserStore()
const [shots, setShots] = useState([])
const [open, setOpen] = useState(null)
const [busy, setBusy] = useState(false)
const [error, setError] = useState(null)
const input = useRef(null)

const load = useCallback(async () => {
if (!supabaseReady) return
const { data } = await supabase.from("shots").select("*").order("created_at", { ascending: false })
setShots(data || [])
}, [])

useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t) }, [load])

const add = async (files) => {
if (!name.trim()) { setError("Sign the guest book first."); return }
setBusy(true); setError(null)
try {
for (const file of Array.from(files).slice(0, 10)) {
const shot = await squash(file, 1400)
const path = guestId + "/roll-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + ".jpg"
const up = await supabase.storage.from("cakes").upload(path, shot.blob, { contentType: "image/jpeg" })
if (up.error) throw up.error
const url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
await supabase.from("shots").insert({ guest_id: guestId, name, url, path })
}
load()
} catch (e) { setError(e.message) } finally { setBusy(false) }
}

const remove = async (shot) => {
if (shot.guest_id !== guestId) return
setOpen(null)
await supabase.from("shots").delete().eq("id", shot.id)
if (shot.path) await supabase.storage.from("cakes").remove([shot.path])
load()
}

return (
<div className="stack">
<div className="card">
<span className="sticker">{shots.length}</span>
<p className="eyebrow">All evening</p>
<h2 className="title">Camera roll</h2>
<p className="lede">Anything. Nobody is posing.</p>
</div>

{error && <div className="notice bad">{error}</div>}

<button className="btn" onClick={() => input.current && input.current.click()} disabled={busy}>
{busy ? "Adding" : "Add photos"}
</button>
<input ref={input} type="file" accept="image/*" multiple hidden
onChange={(e) => { if (e.target.files && e.target.files.length) add(e.target.files); e.target.value = "" }} />

{shots.length === 0 ? (
<div className="empty">
<p>Nothing yet</p>
<p>Whatever you take tonight ends up in the zine.</p>
</div>
) : (
<div className="roll">
{shots.map((s) => (
<button className="roll-tile" key={s.id} onClick={() => setOpen(s)}>
<img src={s.url} alt={"by " + s.name} loading="lazy" />
</button>
))}
</div>
)}

{open && (
<div className="sheet" onClick={() => setOpen(null)}>
<div className="sheet-in" onClick={(e) => e.stopPropagation()}>
<button className="x" onClick={() => setOpen(null)} aria-label="Close">Close</button>
<img className="big" src={open.url} alt={"by " + open.name} />
<p className="eyebrow">Taken by {open.name}</p>
{open.guest_id === guestId && (
<button className="btn ghost danger" onClick={() => remove(open)}>Delete this photo</button>
)}
</div>
</div>
)}
</div>
)
}
