import React, { useEffect, useState, useCallback } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import FriendshipCake from './FriendshipCake'
import './Gallery.css'

export default function Gallery() {
  const [cakes, setCakes] = useState([])
  const [open, setOpen] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabaseReady) { setLoading(false); return }
    const { data } = await supabase.from('cakes').select('*').order('updated_at', { ascending: false })
    setCakes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  if (loading) return <p className="eyebrow">Setting the tableâ€¦</p>

  if (!cakes.length) {
    return (
      <div className="empty">
        <p>The table is bare</p>
        <p>First cake up here sets the tone. No pressure.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card">
        <span className="sticker">{cakes.length} up</span>
        <p className="eyebrow">Everyone's work</p>
        <h2 className="title">The table</h2>
      </div>

      <div className="grid">
        {cakes.map((c) => (
          <button className="tile" key={c.guest_id} onClick={() => setOpen(c)}>
            <img src={c.cake_url} alt={`${c.name}'s cake`} loading="lazy" />
            <span className="tag">{c.name}</span>
            {c.ai_roast && <span className="dot" title="Has a verdict" />}
          </button>
        ))}
      </div>
 <FriendshipCake />

 {open && (
        <div className="sheet" onClick={() => setOpen(null)}>
          <div className="sheet-in" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => setOpen(null)} aria-label="Close">âœ•</button>
            <h3 className="sheet-name">{open.name}</h3>
            <img className="big" src={open.cake_url} alt={`${open.name}'s cake`} />
            {open.decor_url && (
              <>
                <p className="eyebrow">Their sprinkles</p>
                <img className="big" src={open.decor_url} alt="Decorations" />
              </>
            )}
            {open.ai_ideas && (<><p className="eyebrow">Ideas given</p><p className="ai">{open.ai_ideas}</p></>)}
            {open.ai_roast && (<><p className="eyebrow">The verdict</p><p className="ai roast">{open.ai_roast}</p></>)}
          </div>
        </div>
      )}
    </div>
  )
}
