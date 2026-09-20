import React, { useEffect, useState, useCallback } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { useUserStore } from "../store/userStore"
import "./MissionFloat.css"

export default function MissionFloat() {
  const { guestId, name } = useUserStore()
  const [mission, setMission] = useState(null)
  const [stage, setStage] = useState("hidden")

  const load = useCallback(async () => {
    if (!supabaseReady) return
    const { data } = await supabase.from("missions").select("*").eq("guest_id", guestId).maybeSingle()
    if (data) { setMission(data); setStage(data.opened ? "gone" : "waiting") }
  }, [guestId])

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t) }, [load])

  const understood = async () => {
    setStage("gone")
    if (supabaseReady) await supabase.from("missions").update({ opened: true }).eq("guest_id", guestId)
  }

  if (!mission || stage === "gone" || stage === "hidden") return null

  if (stage === "waiting") {
    return (
      <button className="mf-tab" onClick={() => setStage("open")} aria-label="Open your secret mission">
        <span className="mf-env" aria-hidden="true" />
        <span className="mf-tab-text">For you</span>
      </button>
    )
  }

  return (
    <div className="mf-veil">
      <div className="mf-card">
        <p className="mf-for">For {name} only</p>
        <p className="mf-text">{mission.text}</p>
        <p className="mf-rule">You may not mention this card, show this card, or explain yourself. Ever.</p>
        <button className="mf-ok" onClick={understood}>Understood</button>
      </div>
    </div>
  )
}
