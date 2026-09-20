import React, { useEffect, useState, useCallback } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import { PAIRS } from "../data/missions"
import "./Missions.css"

const score = (m) => {
  let s = 0
  if (m.take_easy && m.easy_result === true) s += 1
  if (m.take_easy && m.easy_result === false) s -= 1
  if (m.take_medium && m.medium_result === true) s += 2
  if (m.take_medium && m.medium_result === false) s -= 2
  return s
}

export default function Missions({ back }) {
  const { guestId, name } = useUserStore()
  const [mine, setMine] = useState(null)
  const [all, setAll] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const load = useCallback(async () => {
    if (!supabaseReady) return
    const { data } = await supabase.from("missions").select("*")
    setAll(data || [])
    const own = (data || []).find((m) => m.guest_id === guestId)
    if (own) setMine(own)
    return data || []
  }, [guestId])

  useEffect(() => { load(); const t = setInterval(load, 9000); return () => clearInterval(t) }, [load])

  const assign = async () => {
    if (!name.trim()) { setError("Sign in first."); return }
    setBusy(true); setError(null)
    try {
      const rows = await load()
      if (rows.find((m) => m.guest_id === guestId)) { setBusy(false); return }
      const used = rows.map((m) => m.pair_index)
      const free = PAIRS.map((p, i) => i).filter((i) => used.indexOf(i) === -1)
      if (!free.length) throw new Error("All nine mission pairs are taken.")
      const idx = free[Math.floor(Math.random() * free.length)]
      const row = {
        guest_id: guestId, name, pair_index: idx,
        easy_text: PAIRS[idx].easy, medium_text: PAIRS[idx].medium,
        take_easy: false, take_medium: false, locked: false
      }
      const e = await supabase.from("missions").insert(row)
      if (e.error) throw e.error
      setMine(row)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const toggle = (k) => setMine({ ...mine, [k]: !mine[k] })

  const lock = async () => {
    if (!mine.take_easy && !mine.take_medium) { setError("Choose at least one."); return }
    setBusy(true); setError(null)
    const next = { ...mine, locked: true }
    await supabase.from("missions").update({ take_easy: mine.take_easy, take_medium: mine.take_medium, locked: true }).eq("guest_id", guestId)
    setMine(next); setBusy(false); load()
  }

  const confess = async (k, val) => {
    const next = { ...mine, [k]: val }
    setMine(next)
    await supabase.from("missions").update({ [k]: val }).eq("guest_id", guestId)
    load()
  }

  if (!supabaseReady) return null

  if (!mine) {
    return (
      <div className="ms-wrap">
        <p className="ms-kick">Secret missions</p>
        <h2 className="ms-h">While you decorate, you have another job.</h2>
        <p className="ms-p">You will be given two secret missions. Choose your level of risk, then pull them off without getting caught.</p>
        <div className="ms-legend">
          <span><b>Easy</b> plus or minus 1</span>
          <span><b>Medium</b> plus or minus 2</span>
        </div>
        {error && <p className="ms-err">{error}</p>}
        <button className="btn gold" onClick={assign} disabled={busy}>{busy ? "Dealing" : "Reveal my missions"}</button>
      </div>
    )
  }

  const risk = (mine.take_easy ? 1 : 0) + (mine.take_medium ? 2 : 0)

  if (!mine.locked) {
    return (
      <div className="ms-wrap">
        <p className="ms-kick">Choose your risk</p>
        <h2 className="ms-h">Two missions. Take one, or take both.</h2>

        <button className={"ms-card" + (mine.take_easy ? " on" : "")} onClick={() => toggle("take_easy")}>
          <span className="ms-tier">Easy <b>1 point</b></span>
          <span className="ms-text">{mine.easy_text}</span>
          <span className="ms-pick">{mine.take_easy ? "Taking it" : "Tap to take"}</span>
        </button>

        <button className={"ms-card" + (mine.take_medium ? " on" : "")} onClick={() => toggle("take_medium")}>
          <span className="ms-tier">Medium <b>2 points</b></span>
          <span className="ms-text">{mine.medium_text}</span>
          <span className="ms-pick">{mine.take_medium ? "Taking it" : "Tap to take"}</span>
        </button>

        <p className="ms-risk">Points at risk: <b>{risk}</b></p>
        <p className="ms-warn">Once they are locked, they are locked.</p>
        {error && <p className="ms-err">{error}</p>}
        <button className="btn gold" onClick={lock} disabled={busy}>Lock in my missions</button>
      </div>
    )
  }

  const pending = (mine.take_easy && mine.easy_result === null) || (mine.take_medium && mine.medium_result === null)

  return (
    <div className="ms-wrap">
      <p className="ms-kick">{pending ? "Live" : "The reckoning"}</p>
      <h2 className="ms-h">{pending ? "Your missions are live. Act natural." : "You scored " + score(mine) + "."}</h2>

      {mine.take_easy && (
        <div className="ms-card locked">
          <span className="ms-tier">Easy <b>1 point</b></span>
          <span className="ms-text">{mine.easy_text}</span>
          <div className="ms-judge">
            <button className={mine.easy_result === true ? "on" : ""} onClick={() => confess("easy_result", true)}>Pulled it off</button>
            <button className={mine.easy_result === false ? "on bad" : ""} onClick={() => confess("easy_result", false)}>Failed</button>
          </div>
        </div>
      )}

      {mine.take_medium && (
        <div className="ms-card locked">
          <span className="ms-tier">Medium <b>2 points</b></span>
          <span className="ms-text">{mine.medium_text}</span>
          <div className="ms-judge">
            <button className={mine.medium_result === true ? "on" : ""} onClick={() => confess("medium_result", true)}>Pulled it off</button>
            <button className={mine.medium_result === false ? "on bad" : ""} onClick={() => confess("medium_result", false)}>Failed</button>
          </div>
        </div>
      )}

      {!pending && (
        <>
          <p className="ms-kick mt">Standings</p>
          <div className="ms-board">
            {all.slice().sort((a, b) => score(b) - score(a)).map((m) => (
              <div className="ms-rowb" key={m.guest_id}>
                <span className="ms-bn">{m.name}</span>
                <span className="ms-bs">{score(m) > 0 ? "+" : ""}{score(m)}</span>
              </div>
            ))}
          </div>
          <button className="ms-flip" onClick={() => setRevealed(!revealed)}>
            {revealed ? "Hide everyone's missions" : "Reveal everyone's missions"}
          </button>
          {revealed && (
            <div className="ms-receipts">
              {all.map((m) => (
                <div className="ms-receipt" key={m.guest_id}>
                  <p className="ms-rn">{m.name}</p>
                  {m.take_easy && <p className="ms-rt">{m.easy_result ? "Done" : "Failed"} &middot; {m.easy_text}</p>}
                  {m.take_medium && <p className="ms-rt">{m.medium_result ? "Done" : "Failed"} &middot; {m.medium_text}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
