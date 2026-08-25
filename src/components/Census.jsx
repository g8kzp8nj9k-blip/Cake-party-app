import React, { useEffect, useState, useCallback } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import { CENSUS } from "../data/census"
import Reveal from "./Reveal"
import "./Census.css"

export default function Census() {
const { guestId, name } = useUserStore()
const [mine, setMine] = useState({})
const [everyone, setEveryone] = useState([])
const [saved, setSaved] = useState(false)
const [showReveal, setShowReveal] = useState(false)
const [status, setStatus] = useState(null)

const load = useCallback(async () => {
if (!supabaseReady) return
const { data } = await supabase.from("answers").select("*").order("updated_at", { ascending: false })
setEveryone(data || [])
const own = (data || []).find((r) => r.guest_id === guestId)
if (own && own.responses && Object.keys(own.responses).length) {
setMine(own.responses)
setSaved(true)
setShowReveal(true)
}
}, [guestId])

useEffect(() => {
load()
const t = setInterval(load, 6000)
return () => clearInterval(t)
}, [load])

const pick = (id, val) => { setMine((m) => ({ ...m, [id]: val })); setSaved(false) }

const submit = async () => {
if (!name.trim()) { setStatus({ bad: true, text: "Sign the guest book first." }); return }
if (!supabaseReady) { setStatus({ bad: true, text: "Not connected yet." }); return }
const { error } = await supabase.from("answers").upsert(
{ guest_id: guestId, name, responses: mine, updated_at: new Date().toISOString() },
{ onConflict: "guest_id" }
)
if (error) { setStatus({ bad: true, text: error.message }); return }
setSaved(true)
setStatus(null)
setShowReveal(true)
load()
}

const others = everyone.filter((r) => r.guest_id !== guestId)
const done = CENSUS.filter((q) => mine[q.id] !== undefined && mine[q.id] !== "").length

if (showReveal && saved) {
return <Reveal rows={everyone} onEdit={() => setShowReveal(false)} />
}

return (
<div className="stack">
<div className="card">
<span className="sticker">{done}/{CENSUS.length}</span>
<p className="eyebrow">Before you arrive</p>
<h2 className="title">The cake census</h2>
<p className="lede">Fourteen questions. They decide what the night knows about you.</p>
</div>

{CENSUS.map((q, i) => (
<div className="card q" key={q.id}>
<p className="q-no">{String(i + 1).padStart(2, "0")}</p>
<h3 className="q-ask">{q.ask}</h3>

{q.axis && (
<div className="axis">
<input type="range" min="0" max="100" step="1"
value={mine[q.id] === undefined ? 50 : mine[q.id]}
onChange={(e) => pick(q.id, Number(e.target.value))} />
<div className="axis-ends"><span>{q.axis.low}</span><span>{q.axis.high}</span></div>
</div>
)}

{q.people && (
<div className="q-opts">
{others.length === 0 && <p className="lede">Nobody else has signed in yet. Come back later.</p>}
{others.map((r) => (
<button key={r.guest_id} className={"chip" + (mine[q.id] === r.name ? " on" : "")}
onClick={() => pick(q.id, r.name)}>{r.name}</button>
))}
</div>
)}

{q.free && (
<input className="q-free" placeholder={q.placeholder} maxLength={40}
value={mine[q.id] || ""} onChange={(e) => pick(q.id, e.target.value)} />
)}

{q.opts && (
<div className="q-opts">
{q.opts.map((o) => (
<button key={o} className={"chip" + (mine[q.id] === o ? " on" : "")}
onClick={() => pick(q.id, o)}>{o}</button>
))}
</div>
)}
</div>
))}

{status && <div className={"notice" + (status.bad ? " bad" : "")}>{status.text}</div>}

<button className="btn" onClick={submit}>{saved ? "Update my answers" : "Pin up my answers"}</button>
</div>
)
}
