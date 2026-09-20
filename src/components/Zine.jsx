import React, { useEffect, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { CENSUS } from "../data/census"
import { b64ToBlob } from "../lib/photo"
import "./Zine.css"

const RARE = CENSUS.filter((q) => q.tags.indexOf("rarity") > -1)

async function toB64(url) {
  const r = await fetch(url)
  const b = await r.blob()
  return new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result.split(",")[1]); f.onerror = rej; f.readAsDataURL(b) })
}

function Face({ n, s, size }) {
  if (s) return <img className="zf" style={{ width: size, height: size }} src={s} alt="" />
  return <span className="zf zi" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>{(n || "?").charAt(0)}</span>
}

export default function Zine() {
  const [a, setA] = useState([])
  const [cakes, setCakes] = useState([])
  const [shots, setShots] = useState([])
  const [ms, setMs] = useState([])
  const [fc, setFc] = useState(null)
  const [stage, setStage] = useState("idle")
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabaseReady) return
    Promise.all([
      supabase.from("answers").select("*"),
      supabase.from("cakes").select("*"),
      supabase.from("shots").select("*").order("created_at", { ascending: false }),
      supabase.from("missions").select("*")
    ]).then((r) => {
      const cs = r[1].data || []
      setA(r[0].data || []); setCakes(cs); setShots(r[2].data || []); setMs(r[3].data || [])
      const made = cs.find((c) => c.friendship_url)
      if (made) setFc({ url: made.friendship_url, elements: made.friendship_elements || [] })
    })
  }, [])

  const face = (n) => { const x = a.find((y) => y.name === n); return x && x.selfie_url }
  const withCakes = cakes.filter((c) => c.cake_url)

  const bake = async () => {
    setStage("baking"); setError(null)
    try {
      if (!fc && withCakes.length >= 2) {
        const p = await Promise.all(withCakes.slice(0, 9).map(async (c) => ({ name: c.name, media_type: "image/jpeg", data: await toB64(c.cake_url) })))
        const er = await fetch("/api/elements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cakes: p }) })
        const eo = await er.json()
        if (!er.ok) throw new Error(eo.detail || eo.error)
        const ir = await fetch("/api/imagine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "friendship", elements: eo.elements }) })
        const io = await ir.json()
        if (!ir.ok || !io.image) throw new Error(io.detail || io.error)
        let url = "data:image/png;base64," + io.image
        const path = "friendship/" + Date.now() + ".png"
        const up = await supabase.storage.from("cakes").upload(path, b64ToBlob(io.image), { contentType: "image/png", upsert: true })
        if (!up.error) {
          url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
          await supabase.from("cakes").update({ friendship_url: url, friendship_elements: eo.elements }).eq("guest_id", withCakes[0].guest_id)
        }
        setFc({ url: url, elements: eo.elements })
      }
      setStage("done")
    } catch (e) { setError(e.message); setStage("idle") }
  }

  const tally = (id) => { const c = {}; a.forEach((r) => { const v = r.responses && r.responses[id]; if (v) c[v] = (c[v] || 0) + 1 }); return c }
  const debates = RARE.map((q) => {
    const c = tally(q.id)
    const e = Object.entries(c).sort((x, y) => y[1] - x[1])
    if (e.length < 2) return null
    const total = e.reduce((s, x) => s + x[1], 0)
    return { q: q, e: e, total: total, lead: e[0][1] / total }
  }).filter(Boolean).sort((x, y) => x.lead - y.lead).slice(0, 4)

  const lonely = []
  RARE.forEach((q) => {
    const c = tally(q.id)
    Object.entries(c).forEach(([v, n]) => {
      if (n === 1 && a.length > 3) {
        const who = a.find((r) => r.responses && r.responses[q.id] === v)
        if (who) lonely.push({ q: q.ask, v: v, who: who.name, selfie: who.selfie_url, total: a.length })
      }
    })
  })

  const dinner = a.map((r) => ({ n: r.name, g: r.responses && r.responses.guest })).filter((x) => x.g)
  const spots = a.map((r) => ({ n: r.name, s: r.responses && r.responses.nycspot, selfie: r.selfie_url })).filter((x) => x.s)
  const casts = a.map((r) => ({ n: r.name, said: r.responses && r.responses.selfcast })).filter((x) => x.said)
  const sc = (m) => { let s = 0; if (m.take_easy && m.easy_result === true) s += 1; if (m.take_easy && m.easy_result === false) s -= 1; if (m.take_medium && m.medium_result === true) s += 2; if (m.take_medium && m.medium_result === false) s -= 2; return s }
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })

  if (stage === "baking") return <div className="z-wait"><p className="z-wait-line in">{withCakes.length} cakes entered.</p><p className="z-wait-line in">{withCakes.length} artists.</p><p className="z-wait-line in">One extremely unnecessary cake.</p></div>

  if (stage !== "done") {
    return (
      <div className="stack">
        <div className="card">
          <p className="eyebrow">Press this at the end of the party</p>
          <h2 className="title">Bake the issue</h2>
          <p className="lede">{a.length} answered, {withCakes.length} cakes, {shots.length} photos. It makes the friendship cake first.</p>
        </div>
        {error && <div className="notice bad">{error}</div>}
        <button className="btn" onClick={bake} disabled={a.length < 2}>Bake the issue</button>
      </div>
    )
  }

  return (
    <div className="zine">
      <section className="z-cover">
        <h1>The<br />Cake<br /><em>Issue</em></h1>
        <div className="z-cover-img">{shots[0] ? <img src={shots[0].url} alt="" /> : <span />}</div>
        <div className="z-cover-foot"><span>{today}</span><span>{a.length} present</span></div>
      </section>

      {fc && (
        <section className="z-page">
          <div className="z-frame"><img src={fc.url} alt="" /></div>
          <h2 className="z-title">The Friendship Cake</h2>
          <p className="z-sub">Never baked. Never eaten.</p>
          <div className="z-list">
            {fc.elements.map((e, i) => (
              <div className="z-row" key={i}><Face n={e.name} s={face(e.name)} size={24} /><span className="z-el">{e.element}</span><span className="z-who">{e.name}</span></div>
            ))}
          </div>
        </section>
      )}

      {debates.length > 0 && (
        <section className="z-page">
          <p className="z-kicker">The great debates</p>
          {debates.map((d) => (
            <div className="z-deb" key={d.q.id}>
              <p className="z-deb-q">{d.q.ask}</p>
              <div className="z-deb-bar">
                {d.e.map(([v, n], i) => (
                  <span key={v} className={"z-seg s" + (i % 3)} style={{ width: (n / d.total) * 100 + "%" }}>{n}</span>
                ))}
              </div>
              <div className="z-deb-lab">{d.e.map(([v]) => <span key={v}>{v}</span>)}</div>
            </div>
          ))}
        </section>
      )}

      {lonely.length > 0 && (
        <section className="z-lone">
          <p className="z-kicker gold">One of {lonely[0].total}</p>
          {lonely.slice(0, 3).map((l, i) => (
            <div className="z-lone-i" key={i}>
              <Face n={l.who} s={l.selfie} size={54} />
              <p className="z-lone-t">{l.who} said <em>{l.v}</em></p>
              <p className="z-lone-s">{l.q}</p>
            </div>
          ))}
        </section>
      )}

      {dinner.length > 0 && (
        <section className="z-page center">
          <p className="z-kicker">Tonight's impossible dinner party</p>
          <div className="z-dinner">
            {dinner.map((d, i) => <p key={i} className={"z-dn n" + (i % 4)}>{d.g}</p>)}
          </div>
          <p className="z-cap">Nobody asked how this would work.</p>
        </section>
      )}

      {spots.length > 0 && (
        <section className="z-page">
          <p className="z-kicker">{spots.length} people, {spots.length} restaurants</p>
          {spots.map((s, i) => (
            <div className="z-row" key={i}><Face n={s.n} s={s.selfie} size={26} /><span className="z-rest">{s.s}</span><span className="z-who">{s.n}</span></div>
          ))}
        </section>
      )}

      {casts.length > 0 && (
        <section className="z-page">
          <p className="z-kicker">Said, then did</p>
          {casts.map((c) => {
            const k = cakes.find((x) => x.name === c.n)
            return (
              <div className="z-vs" key={c.n}>
                <div className="z-vs-said"><em>{c.said}</em></div>
                <div className="z-vs-real">{k && k.cake_url ? <img src={k.cake_url} alt="" /> : <span className="z-vs-none">no cake</span>}</div>
                <p className="z-vs-name">{c.n}</p>
              </div>
            )
          })}
        </section>
      )}

      {ms.length > 0 && (
        <section className="z-classified">
          <p className="z-kicker gold">The social engineers</p>
          {ms.slice().sort((x, y) => sc(y) - sc(x)).map((m) => (
            <div className="z-lb" key={m.guest_id}><span>{m.name}</span><span className="z-sc">{sc(m) > 0 ? "+" : ""}{sc(m)}</span></div>
          ))}
          <div className="z-secrets">
            {ms.map((m) => (
              <p key={m.guest_id}><strong>{m.name}</strong>{m.take_easy ? " \u00b7 " + m.easy_text : ""}{m.take_medium ? " \u00b7 " + m.medium_text : ""}</p>
            ))}
          </div>
        </section>
      )}

      {withCakes.length > 0 && (
        <section className="z-page">
          <p className="z-kicker">The cakes</p>
          {withCakes.map((c) => (
            <div className="z-big-cake" key={c.guest_id}>
              <img src={c.cake_url} alt="" />
              <p className="z-bc-n">{c.name}</p>
            </div>
          ))}
        </section>
      )}

      {shots.length > 0 && (
        <section className="z-page">
          <p className="z-kicker">{shots.length} photos</p>
          <div className="z-roll">{shots.slice(0, 18).map((s) => <img key={s.id} src={s.url} alt="" />)}</div>
        </section>
      )}

      <button className="btn z-print" onClick={() => window.print()}>Save as PDF</button>
    </div>
  )
}
