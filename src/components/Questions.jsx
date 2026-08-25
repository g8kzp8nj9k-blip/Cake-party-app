import React, { useEffect, useState, useCallback } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { useUserStore } from '../store/userStore'
import './Questions.css'

export const QUESTIONS = [
  { id: 'straw',   ask: 'How many holes does a straw have?',  opts: ['One', 'Two', 'Zero', 'This ruins me'] },
  { id: 'hotdog',  ask: 'Is a hotdog a sandwich?',            opts: ['Yes', 'No', 'Legally yes', 'Absolutely not'] },
  { id: 'style',   ask: 'Your decorating doctrine',           opts: ['Maximal chaos', 'Quietly precise', 'Improvised', 'Whatever is left'] },
  { id: 'redo',    ask: 'How many times will you restart?',   opts: ['Once, done', 'Three-ish', 'Until perfect', 'Time is fake'] },
  { id: 'wine',    ask: 'Bringing',                           opts: ['Red', 'White', 'Orange', 'Something odd'] },
  { id: 'power',   ask: 'Your cake superpower', free: true,   placeholder: 'gravity-defying towers…' }
]

export default function Questions() {
  const { guestId, name } = useUserStore()
  const [mine, setMine] = useState({})
  const [everyone, setEveryone] = useState([])
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState(null)

  const load = useCallback(async () => {
    if (!supabaseReady) return
    const { data, error } = await supabase.from('answers').select('*').order('updated_at', { ascending: false })
    if (error) return
    setEveryone(data || [])
    const own = data?.find((r) => r.guest_id === guestId)
    if (own) { setMine(own.responses || {}); setSaved(true) }
  }, [guestId])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  const pick = (qid, val) => { setMine((m) => ({ ...m, [qid]: val })); setSaved(false) }

  const submit = async () => {
    if (!name.trim()) { setStatus({ bad: true, text: 'Sign the guest book first — your name goes up top.' }); return }
    if (!supabaseReady) { setStatus({ bad: true, text: 'Not connected to the database yet.' }); return }
    setStatus(null)
    const { error } = await supabase.from('answers').upsert(
      { guest_id: guestId, name, responses: mine, updated_at: new Date().toISOString() },
      { onConflict: 'guest_id' }
    )
    if (error) { setStatus({ bad: true, text: 'That did not save. ' + error.message }); return }
    setSaved(true)
    setStatus({ text: 'Pinned up. Change it any time.' })
    load()
  }

  const answered = QUESTIONS.filter((q) => mine[q.id]).length

  return (
    <div className="stack">
      <div className="card">
        <span className="sticker">{answered}/{QUESTIONS.length}</span>
        <p className="eyebrow">Before you arrive</p>
        <h2 className="title">Six questions, no wrong answers</h2>
        <p className="lede">Everyone sees everyone else's. That is the point.</p>
      </div>

      {QUESTIONS.map((q, i) => (
        <div className="card q" key={q.id}>
          <p className="q-no">{String(i + 1).padStart(2, '0')}</p>
          <h3 className="q-ask">{q.ask}</h3>
          {q.free ? (
            <input
              className="q-free"
              placeholder={q.placeholder}
              value={mine[q.id] || ''}
              maxLength={60}
              onChange={(e) => pick(q.id, e.target.value)}
            />
          ) : (
            <div className="q-opts">
              {q.opts.map((o) => (
                <button
                  key={o}
                  className={'chip' + (mine[q.id] === o ? ' on' : '')}
                  onClick={() => pick(q.id, o)}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {status && <div className={'notice' + (status.bad ? ' bad' : '')}>{status.text}</div>}

      <button className="btn" onClick={submit}>{saved ? 'Update my answers' : 'Pin up my answers'}</button>

      {everyone.length > 0 && (
        <>
          <div className="card">
            <span className="sticker pink">The board</span>
            <p className="eyebrow">{everyone.length} signed in</p>
            <h2 className="title">What everyone said</h2>
          </div>
          {everyone.map((row) => (
            <div className="card guest" key={row.guest_id}>
              <h3 className="guest-name">{row.name}</h3>
              <dl>
                {QUESTIONS.map((q) => (
                  <div className="row" key={q.id}>
                    <dt>{q.ask}</dt>
                    <dd>{row.responses?.[q.id] || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
