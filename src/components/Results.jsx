import React, { useEffect, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import { CENSUS } from "../data/census"
import "./Results.css"

const MATCH = CENSUS.filter((q) => q.tags.indexOf("match") > -1)
const RARE = CENSUS.filter((q) => q.tags.indexOf("rarity") > -1)

function Face({ n, s, size }) {
  if (s) return <img className="rs-f" style={{ width: size, height: size }} src={s} alt="" />
  return <span className="rs-f rs-i" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>{(n || "?").charAt(0)}</span>
}

export default function Results() {
  const { guestId, name } = useUserStore()
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!supabaseReady) return
    supabase.from("answers").select("*").then((r) => setRows(r.data || []))
  }, [])

  const me = rows.find((r) => r.guest_id === guestId)
  if (!me || !me.responses) return <div className="card"><p className="lede">Fill the questionnaire first.</p></div>

  const others = rows.filter((r) => r.guest_id !== guestId && r.responses)
  const sim = (o) => {
    const both = MATCH.filter((q) => me.responses[q.id] && o.responses[q.id])
    if (!both.length) return 0
    return Math.round(both.filter((q) => me.responses[q.id] === o.responses[q.id]).length / both.length * 100)
  }
  const ranked = others.map((o) => ({ name: o.name, selfie: o.selfie_url, pct: sim(o) })).sort((a, b) => b.pct - a.pct)
  const twin = ranked[0]
  const opp = ranked[ranked.length - 1]

  const outliers = []
  RARE.forEach((q) => {
    const mine = me.responses[q.id]
    if (!mine) return
    const agree = rows.filter((r) => r.responses && r.responses[q.id] === mine).length
    if (agree <= 2) outliers.push({ ask: q.ask, answer: mine, agree: agree, total: rows.length })
  })

  return (
    <div className="stack">
      <div className="card">
        <p className="eyebrow">Best read once everyone has answered</p>
        <h2 className="title">{name}, here you are</h2>
        <p className="lede">{rows.length} have filled it in so far.</p>
      </div>

      {twin && opp && (
        <div className="rs-pair">
          <div className="rs-card">
            <Face n={twin.name} s={twin.selfie} size={64} />
            <p className="rs-l">Your twin</p>
            <p className="rs-n">{twin.name}</p>
            <p className="rs-p">{twin.pct}%</p>
          </div>
          <div className="rs-card">
            <Face n={opp.name} s={opp.selfie} size={64} />
            <p className="rs-l">Your opposite</p>
            <p className="rs-n">{opp.name}</p>
            <p className="rs-p">{opp.pct}%</p>
          </div>
        </div>
      )}

      {ranked.length > 1 && (
        <div className="card">
          <p className="eyebrow">Everyone, ranked</p>
          {ranked.map((r) => (
            <div className="rs-row" key={r.name}>
              <Face n={r.name} s={r.selfie} size={26} />
              <span className="rs-rn">{r.name}</span>
              <span className="rs-bar"><span style={{ width: r.pct + "%" }} /></span>
              <span className="rs-pc">{r.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {outliers.length > 0 && (
        <div className="rs-out">
          <p className="rs-ol">Where you stood alone</p>
          {outliers.map((o, i) => (
            <div className="rs-oi" key={i}>
              <p className="rs-oq">{o.ask}</p>
              <p className="rs-oa">{o.answer}</p>
              <p className="rs-oc">{o.agree} of {o.total}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
