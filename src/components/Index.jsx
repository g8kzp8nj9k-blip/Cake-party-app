import React, { useEffect, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import "./Index.css"

const ITEMS = [
  { id: "census", no: "01", title: "Fill the questionnaire", note: "Fourteen questions. Then your card." },
  { id: "cake",   no: "02", title: "Experiment with your cake", note: "Put a tiny you on top of it." },
  { id: "photos", no: "03", title: "Add photos", note: "Anything, all evening." },
  { id: "missions", no: "04", title: "Secret missions", note: "Two jobs. Choose your risk." },
  { id: "results", no: "05", title: "See your results", note: "Best once everyone has answered." }
]

export default function Index({ go }) {
  const { guestId, name, selfie } = useUserStore()
  const [mission, setMission] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [hasCake, setHasCake] = useState(false)
  const [shots, setShots] = useState(0)

  useEffect(() => {
    if (!supabaseReady) return
    supabase.from("missions").select("*").eq("guest_id", guestId).maybeSingle().then((r) => { if (r.data) setMission(r.data) })
    supabase.from("answers").select("responses").eq("guest_id", guestId).maybeSingle()
      .then((r) => setAnswered(Boolean(r.data && r.data.responses && Object.keys(r.data.responses).length)))
    supabase.from("cakes").select("cake_url").eq("guest_id", guestId).maybeSingle()
      .then((r) => setHasCake(Boolean(r.data && r.data.cake_url)))
    supabase.from("shots").select("id", { count: "exact", head: true }).eq("guest_id", guestId)
      .then((r) => setShots(r.count || 0))
  }, [guestId])

  const toggleMission = async () => {
    const next = !mission.done
    setMission({ ...mission, done: next })
    if (supabaseReady) await supabase.from("missions").update({ done: next }).eq("guest_id", guestId)
  }

  const stateOf = (id) => {
    if (id === "census") return answered ? "Done" : null
    if (id === "cake") return hasCake ? "On the table" : null
    if (id === "photos") return shots > 0 ? shots + " added" : null
    return null
  }

  return (
    <div className="ix">
      <div className="ix-you">
        {selfie ? <img src={selfie} alt="" /> : <span className="ix-init">{name.charAt(0).toUpperCase()}</span>}
        <div>
          <p className="ix-hello">Evening, {name}</p>
          <p className="ix-note">Work through these in any order.</p>
        </div>
      </div>

      {ITEMS.map((it) => (
        <button className="ix-item" key={it.id} onClick={() => go(it.id)}>
          <span className="ix-no">{it.no}</span>
          <span className="ix-main">
            <span className="ix-title">{it.title}</span>
            <span className="ix-sub">{it.note}</span>
          </span>
          {stateOf(it.id) && <span className="ix-state">{stateOf(it.id)}</span>}
        </button>
      ))}

      {mission && mission.opened && (
        <button className={"ix-mission" + (mission.done ? " done" : "")} onClick={toggleMission}>
          <span className="ix-box">{mission.done ? "\u2713" : ""}</span>
          <span className="ix-mission-text">{mission.done ? "Objective complete" : "I completed my mission"}</span>
        </button>
      )}

      <button className="ix-zine" onClick={() => go("zine")}>
        <span className="ix-zine-kicker">At the end of the night</span>
        <span className="ix-zine-title">Bake the issue</span>
        <span className="ix-zine-note">Only press this when everyone is finished. It closes the evening.</span>
      </button>
    </div>
  )
}
