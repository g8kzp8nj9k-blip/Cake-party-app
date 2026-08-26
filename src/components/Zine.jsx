import React, { useEffect, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { CENSUS } from "../data/census"
import { findings, alignments, allSplits, predictions, distribution } from "../lib/groupstats"
import "./Zine.css"

const FLAVOUR = CENSUS.find((q) => q.id === "flavour")

export default function Zine() {
const [answers, setAnswers] = useState([])
const [cakes, setCakes] = useState([])
const [shots, setShots] = useState([])
const [missions, setMissions] = useState([])
const [items, setItems] = useState(null)
const [busy, setBusy] = useState(false)
const [error, setError] = useState(null)

useEffect(() => {
if (!supabaseReady) return
Promise.all([
supabase.from("answers").select("*"),
supabase.from("cakes").select("*"),
supabase.from("shots").select("*").order("created_at", { ascending: false }),
supabase.from("missions").select("*")
]).then((res) => {
setAnswers(res[0].data || []); setCakes(res[1].data || [])
setShots(res[2].data || []); setMissions(res[3].data || [])
})
}, [])

const bake = async () => {
setBusy(true); setError(null)
try {
const r = await fetch("/api/editorial", {
method: "POST", headers: { "content-type": "application/json" },
body: JSON.stringify({
count: answers.length,
findings: findings(answers),
alignments: alignments(answers),
splits: allSplits(answers).map((s) => ({ q: s.q.axis.name, low: s.low, mid: s.mid, high: s.high, total: s.total })),
predictions: predictions(answers)
})
})
const out = await r.json()
if (!r.ok) throw new Error(out.detail || out.error || "Could not write it.")
setItems(out.items)
} catch (e) { setError(e.message) } finally { setBusy(false) }
}

const fc = cakes.find((c) => c.friendship_url)
const pred = predictions(answers)
const flav = distribution(answers, FLAVOUR)
const maxN = Math.max(1, ...flav.map((f) => f.n))
const done = missions.filter((m) => m.done).length
const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })

if (!items) {
return (
<div className="stack">
<div className="card">
<p className="eyebrow">When the night is over</p>
<h2 className="title">Bake the issue</h2>
<p className="lede">{answers.length} signed in, {cakes.length} cakes, {shots.length} photos. Everything the evening collected, printed once.</p>
</div>
{error && <div className="notice bad">{error}</div>}
<button className="btn" onClick={bake} disabled={busy || answers.length < 2}>{busy ? "Setting the type" : "Bake the issue"}</button>
{answers.length < 2 && <p className="lede">Needs at least two people in the census.</p>}
</div>
)
}

return (
<div className="zine">
<section className="z-cover">
<h1>The<br />Cake<br /><em>Issue</em></h1>
<div className="z-cover-img">{shots[0] ? <img src={shots[0].url} alt="" /> : <span />}</div>
<div className="z-cover-foot"><span>{today}</span><span>{answers.length} present</span></div>
</section>

{fc && (
<section className="z-page">
<div className="z-frame"><img src={fc.friendship_url} alt="The friendship cake" /></div>
<h2 className="z-title">The Friendship Cake</h2>
<p className="z-sub">Never baked. Never eaten.</p>
<div className="z-list">
{(fc.friendship_elements || []).map((e, i) => (
<div className="z-row" key={i}><span className="z-el">{e.element}</span><span className="z-who">{e.name}</span></div>
))}
</div>
</section>
)}

<section className="z-page">
<p className="z-kicker">The facts</p>
{items.map((it, i) => (
<div className="z-item" key={i}><h3>{it.head}</h3><p>{it.body}</p></div>
))}

<p className="z-kicker mt">Flavour, in full</p>
<div className="z-bars">
{flav.map((f) => (
<div className="z-bar" key={f.label}>
<span className="z-bar-label">{f.label}</span>
<span className="z-bar-fill" style={{ width: (f.n / maxN) * 62 + "%" }} />
<span className="z-bar-n">{f.n}</span>
</div>
))}
</div>

{pred.winner && <p className="z-pred">The room predicted <strong>{pred.winner}</strong> would make the most elaborate cake, on {pred.votes} of {pred.total} votes.</p>}

{pred.selfcasts.length > 0 && (
<>
<p className="z-kicker mt">Predicted, then observed</p>
{pred.selfcasts.map((s) => {
const cake = cakes.find((c) => c.name === s.name)
return (
<div className="z-vs" key={s.name}>
<div className="z-vs-said"><em>{s.said}</em></div>
<div className="z-vs-real">{cake ? <img src={cake.cake_url} alt="" /> : <span className="z-vs-none">no cake</span>}</div>
<p className="z-vs-name">{s.name}</p>
</div>
)
})}
</>
)}
</section>

{missions.length > 0 && (
<section className="z-classified">
<p className="z-kicker gold">Classified</p>
<h2 className="z-big">{done} of {missions.length} objectives were completed.</h2>
<div className="z-secrets">
{missions.map((m) => (
<p key={m.guest_id}><strong>{m.name}</strong> {m.done ? "completed" : "did not complete"}: {m.text}</p>
))}
</div>
</section>
)}

{shots.length > 0 && (
<section className="z-page">
<p className="z-kicker">Photos</p>
<div className="z-roll">{shots.slice(0, 18).map((s) => <img key={s.id} src={s.url} alt="" />)}</div>
<p className="z-count">{shots.length} photos</p>
</section>
)}

<button className="btn z-print" onClick={() => window.print()}>Save as PDF</button>
<button className="rv-edit" onClick={() => setItems(null)}>Back</button>
</div>
)
}
