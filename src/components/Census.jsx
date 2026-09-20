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
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(null)

  const load = useCallback(async () => {
    if (!supabaseReady) return
    const { data } = await supabase.from("answers").select("*").order("updated_at", { ascending: false })
    setEveryone(data || [])
    const own = (data || []).find((r) => r.guest_id === guestId)
    if (own && own.responses && Object.keys(own.responses).length) { setMine(own.responses); setSaved(true) }
  }, [guestId])

  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t) }, [load])

  const pick = (id, val) => { setMine((m) => ({ ...m, [id]: val })); setSaved(false) }

  const submit = async () => {
    if (!supabaseReady) { setStatus({ bad: true, text: "Not connected yet." }); return }
    const { error } = await supabase.from("answers").upsert(
      { guest_id: guestId, name, responses: mine, updated_at: new Date().toISOString() },
      { onConflict: "guest_id" }
    )
    if (error) { setStatus({ bad: true, text: error.message }); return }
    setSaved(true); setStatus(null); load()
  }

  const others = everyone.filter((r) => r.guest_id !== guestId)
  const done = CENSUS.filter((q) => mine[q.id] !== undefined && mine[q.id] !== "").length

  return (
    <div className="stack">
      {saved ? (
        open ? (
          <>
            <Reveal rows={everyone} />
            <button className="cn-flip" onClick={() => setOpen(false)}>Put the card away</button>
          </>
        ) : (
          <button className="cn-facedown" onClick={() => setOpen(true)}>
            <span className="cn-fd-mark" aria-hidden="true" />
            <span className="cn-fd-title">Your card is ready</span>
            <span className="cn-fd-note">{others.length === 0 ? "You are first in. It fills out as others answer." : others.length + (others.length === 1 ? " other has" : " others have") + " answered so far."}</span>
            <span className="cn-fd-cta">Tap to turn it over</span>
          </button>
        )
      ) : (
        <div className="card">
          <span className="sticker">{done}/{CENSUS.length}</span>
          <p className="eyebrow">Before you arrive</p>
          <h2 className="title">The cake census</h2>
          <p className="lede">Fourteen questions. They decide what the night knows about you.</p>
        </div>
      )}

      {CENSUS.map((q, i) => (
        <div className="card q" key={q.id}>
          <p className="q-no">{String(i + 1).padStart(2, "0")}</p>
          <h3 className="q-ask">{q.ask}</h3>
          {q.axis && (
            <div className="axis">
              <input type="range" min="0" max="100" step="1" value={mine[q.id] === undefined ? 50 : mine[q.id]}
                onChange={(e) => pick(q.id, Number(e.target.value))} />
              <div className="axis-ends"><span>{q.axis.low}</span><span>{q.axis.high}</span></div>
            </div>
          )}
          {q.people && (
            <div className="q-opts">
              {others.length === 0 && <p className="lede">Nobody else has signed in yet. Come back later.</p>}
              {others.map((r) => (
                <button key={r.guest_id} className={"chip" + (mine[q.id] === r.name ? " on" : "")} onClick={() => pick(q.id, r.name)}>{r.name}</button>
              ))}
            </div>
          )}
          {q.free && (
            <input className="q-free" placeholder={q.placeholder} maxLength={40} value={mine[q.id] || ""} onChange={(e) => pick(q.id, e.target.value)} />
          )}
          {q.opts && (
            <div className="q-opts">
              {q.opts.map((o) => (
                <button key={o} className={"chip" + (mine[q.id] === o ? " on" : "")} onClick={() => pick(q.id, o)}>{o}</button>
              ))}
            </div>
          )}
        </div>
      ))}

      {status && <div className={"notice" + (status.bad ? " bad" : "")}>{status.text}</div>}
      <button className="btn" onClick={submit}>{saved ? "Save changes" : "Pin up my answers"}</button>
    </div>
  )
}
