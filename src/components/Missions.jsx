import React, { useEffect, useState, useCallback } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import "./Missions.css"

export default function Missions() {
const { guestId, name } = useUserStore()
const [mine, setMine] = useState(null)
const [seen, setSeen] = useState(false)
const [busy, setBusy] = useState(false)
const [error, setError] = useState(null)

const load = useCallback(async () => {
if (!supabaseReady) return
const { data } = await supabase.from("missions").select("*")
const own = (data || []).find((m) => m.guest_id === guestId)
if (own) setMine(own)
}, [guestId])

useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t) }, [load])

const deal = async () => {
setBusy(true); setError(null)
try {
const { data: answers } = await supabase.from("answers").select("*")
if (!answers || answers.length < 2) throw new Error("Need at least two people signed in.")
const r = await fetch("/api/missions", {
method: "POST", headers: { "content-type": "application/json" },
body: JSON.stringify({ guests: answers.map((a) => ({ name: a.name, responses: a.responses })) })
})
const out = await r.json()
if (!r.ok) throw new Error(out.detail || out.error || "Could not deal.")
const rows = out.missions.map((m) => {
const who = answers.find((a) => a.name === m.name)
return who ? { guest_id: who.guest_id, name: m.name, text: m.text, category: m.category, done: false, opened: false } : null
}).filter(Boolean)
const e = await supabase.from("missions").upsert(rows, { onConflict: "guest_id" })
if (e.error) throw e.error
load()
} catch (e) { setError(e.message) } finally { setBusy(false) }
}

const open = async () => {
setMine({ ...mine, opened: true })
if (supabaseReady) await supabase.from("missions").update({ opened: true }).eq("guest_id", guestId)
}

const toggle = async () => {
const next = !mine.done
setMine({ ...mine, done: next })
if (supabaseReady) await supabase.from("missions").update({ done: next }).eq("guest_id", guestId)
}

if (!supabaseReady) return null

if (!mine) {
return (
<div className="ms-deal">
<p className="eyebrow">Host only</p>
<h3 className="ms-deal-title">Deal the missions</h3>
<p className="ms-deal-note">One private mission each, written from the census. Do this once, when everyone has answered.</p>
{error && <p className="ms-err">{error}</p>}
<button className="btn" onClick={deal} disabled={busy}>{busy ? "Dealing" : "Deal them out"}</button>
</div>
)
}

if (!mine.opened) {
return (
<div className="ms-sealed">
<span className="ms-env" aria-hidden="true" />
<h3 className="ms-sealed-title">Something arrived for you</h3>
<p className="ms-sealed-note">Open it when you get there. Not before.</p>
<button className="btn" onClick={open}>Open</button>
</div>
)
}

if (!seen) {
return (
<div className="ms-reveal">
<p className="ms-for">For {name} only</p>
<p className="ms-text">{mine.text}</p>
<p className="ms-rule">You may not mention this card, show this card, or explain yourself. Ever.</p>
<button className="ms-ok" onClick={() => setSeen(true)}>Understood</button>
</div>
)
}

return (
<button className={"ms-strip" + (mine.done ? " done" : "")} onClick={toggle}>
<span className="ms-box">{mine.done ? "\u2713" : ""}</span>
<span className="ms-status">{mine.done ? "Objective complete" : "Objective not complete"}</span>
</button>
)
}
