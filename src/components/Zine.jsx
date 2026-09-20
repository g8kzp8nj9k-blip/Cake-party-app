import React, { useEffect, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { CENSUS } from "../data/census"
import { findings, alignments, allSplits, predictions, distribution } from "../lib/groupstats"
import { b64ToBlob } from "../lib/photo"
import "./Zine.css"

const FLAVOUR = CENSUS.find((q) => q.id === "flavour")

async function toB64(url) {
  const r = await fetch(url)
  const blob = await r.blob()
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result.split(",")[1])
    fr.onerror = rej
    fr.readAsDataURL(blob)
  })
}

export default function Zine() {
  const [answers, setAnswers] = useState([])
  const [cakes, setCakes] = useState([])
  const [shots, setShots] = useState([])
  const [missions, setMissions] = useState([])
  const [items, setItems] = useState(null)
  const [fc, setFc] = useState(null)
  const [stage, setStage] = useState("idle")
  const [step, setStep] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabaseReady) return
    Promise.all([
      supabase.from("answers").select("*"),
      supabase.from("cakes").select("*"),
      supabase.from("shots").select("*").order("created_at", { ascending: false }),
      supabase.from("missions").select("*")
    ]).then((res) => {
      const cs = res[1].data || []
      setAnswers(res[0].data || []); setCakes(cs)
      setShots(res[2].data || []); setMissions(res[3].data || [])
      const made = cs.find((c) => c.friendship_url)
      if (made) setFc({ url: made.friendship_url, elements: made.friendship_elements || [] })
    })
  }, [])

  useEffect(() => {
    if (stage !== "baking") return
    const t = setInterval(() => setStep((s) => (s < 3 ? s + 1 : s)), 1400)
    return () => clearInterval(t)
  }, [stage])

  const bake = async () => {
    setStage("baking"); setStep(0); setError(null)
    try {
      let cake = fc
      const withCakes = cakes.filter((c) => c.cake_url)
      if (!cake && withCakes.length >= 2) {
        const payload = await Promise.all(withCakes.map(async (c) => ({ name: c.name, media_type: "image/jpeg", data: await toB64(c.cake_url) })))
        const er = await fetch("/api/elements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cakes: payload }) })
        const eo = await er.json()
        if (er.ok && eo.elements) {
          const ir = await fetch("/api/imagine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "friendship", elements: eo.elements }) })
          const io = await ir.json()
          if (ir.ok && io.image) {
            let url = "data:image/png;base64," + io.image
            const path = "friendship/" + Date.now() + ".png"
            const up = await supabase.storage.from("cakes").upload(path, b64ToBlob(io.image), { contentType: "image/png", upsert: true })
            if (!up.error) {
              url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
              await supabase.from("cakes").update({ friendship_url: url, friendship_elements: eo.elements }).eq("guest_id", withCakes[0].guest_id)
            }
            cake = { url, elements: eo.elements }
            setFc(cake)
          }
        }
      }

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
      setStage("done")
    } catch (e) { setError(e.message); setStage("idle") }
  }

  const pred = predictions(answers)
  const flav = distribution(answers, FLAVOUR)
  const maxN = Math.max(1, ...flav.map((f) => f.n))
  const doneCount = missions.filter((m) => m.done).length
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })
  const nCakes = cakes.filter((c) => c.cake_url).length

  if (stage === "baking") {
    return (
      <div className="z-wait">
        <p className={"z-wait-line" + (step >= 0 ? " in" : "")}>{nCakes} cakes entered.</p>
        <p className={"z-wait-line" + (step >= 1 ? " in" : "")}>{nCakes} artists.</p>
        <p className={"z-wait-line" + (step >= 2 ? " in" : "")}>One extremely unnecessary cake.</p>
        <div className="z-wait-rule" />
        <p className={"z-wait-tag" + (step >= 3 ? " in" : "")}>Our cake</p>
      </div>
    )
  }

  if (stage !== "done") {
    return (
      <div className="stack">
        <div className="card">
          <p className="eyebrow">The end of the night</p>
          <h2 className="title">Bake the issue</h2>
          <p className="lede">{answers.length} in the census, {nCakes} cakes, {shots.length} photos. It makes the friendship cake first, then prints everything once.</p>
        </div>
        {error && <div className="notice bad">{error}</div>}
        <button className="btn" onClick={bake} disabled={answers.length < 2}>Bake the issue</button>
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
          <div className="z-frame"><img src={fc.url} alt="The friendship cake" /></div>
          <h2 className="z-title">The Friendship Cake</h2>
          <p className="z-sub">Never baked. Never eaten.</p>
          <div className="z-list">
            {fc.elements.map((e, i) => (<div className="z-row" key={i}><span className="z-el">{e.element}</span><span className="z-who">{e.name}</span></div>))}
          </div>
        </section>
      )}

      <section className="z-page">
        <p className="z-kicker">The facts</p>
        {items.map((it, i) => (<div className="z-item" key={i}><h3>{it.head}</h3><p>{it.body}</p></div>))}
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
              const c = cakes.find((x) => x.name === s.name)
              return (
                <div className="z-vs" key={s.name}>
                  <div className="z-vs-said"><em>{s.said}</em></div>
                  <div className="z-vs-real">{c && c.cake_url ? <img src={c.cake_url} alt="" /> : <span className="z-vs-none">no cake</span>}</div>
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
          <h2 className="z-big">{doneCount} of {missions.length} objectives were completed.</h2>
          <div className="z-secrets">
            {missions.map((m) => (<p key={m.guest_id}><strong>{m.name}</strong> {m.done ? "completed" : "did not complete"}: {m.text}</p>))}
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
    </div>
  )
}
