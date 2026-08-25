import React, { useEffect, useRef, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { useUserStore } from '../store/userStore'
import PutMeOnMyCake from './PutMeOnMyCake'
import './MyCake.css'

const MAX_EDGE = 1400

// Shrink before upload: phone photos are 4MB+ and kill the party wifi.
function squash(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((blob) => {
        const dataUrl = c.toDataURL('image/jpeg', 0.82)
        resolve({ blob, preview: dataUrl, base64: dataUrl.split(',')[1] })
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that photo.')) }
    img.src = url
  })
}

function Slot({ title, hint, shot, onPick }) {
  const input = useRef(null)
  return (
    <div className="slot">
      <p className="eyebrow">{title}</p>
      {shot ? (
        <button className="shot" onClick={() => input.current?.click()}>
          <img src={shot.preview} alt={title} />
          <span>Retake</span>
        </button>
      ) : (
        <button className="shot empty-shot" onClick={() => input.current?.click()}>
          <span className="plus">+</span>
          <span className="hint">{hint}</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }}
      />
    </div>
  )
}

export default function MyCake() {
  const { guestId, name } = useUserStore()
  const [cake, setCake] = useState(null)
  const [decor, setDecor] = useState(null)
  const [row, setRow] = useState(null)
  const [busy, setBusy] = useState(null)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!supabaseReady) return
    supabase.from('cakes').select('*').eq('guest_id', guestId).maybeSingle()
      .then(({ data }) => { if (data) setRow(data) })
  }, [guestId])

  const take = async (file, which) => {
    try {
      const shot = await squash(file)
      which === 'cake' ? setCake(shot) : setDecor(shot)
      setStatus(null)
    } catch (e) { setStatus({ bad: true, text: e.message }) }
  }

  const share = async () => {
    if (!name.trim()) { setStatus({ bad: true, text: 'Sign the guest book first â€” your name goes up top.' }); return }
    if (!cake) { setStatus({ bad: true, text: 'Take a photo of your cake first.' }); return }
    if (!supabaseReady) { setStatus({ bad: true, text: 'Not connected to the database yet.' }); return }

    setBusy('upload'); setStatus(null)
    try {
      const stamp = Date.now()
      const put = async (shot, tag) => {
        const path = `${guestId}/${stamp}-${tag}.jpg`
        const { error } = await supabase.storage.from('cakes').upload(path, shot.blob, {
          contentType: 'image/jpeg', upsert: true
        })
        if (error) throw error
        return supabase.storage.from('cakes').getPublicUrl(path).data.publicUrl
      }

      const cake_url = await put(cake, 'cake')
      const decor_url = decor ? await put(decor, 'decor') : null

      const { data, error } = await supabase.from('cakes').upsert(
        { guest_id: guestId, name, cake_url, decor_url, updated_at: new Date().toISOString() },
        { onConflict: 'guest_id' }
      ).select().maybeSingle()
      if (error) throw error

      setRow(data)
      setStatus({ text: 'Up on the table. Everyone can see it now.' })
    } catch (e) {
      setStatus({ bad: true, text: 'Upload failed. ' + (e.message || '') })
    } finally { setBusy(null) }
  }

  const ask = async (mode) => {
    if (!cake) { setStatus({ bad: true, text: 'Take a photo of your cake first.' }); return }
    setBusy(mode); setStatus(null)
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode,
          cake: { media_type: 'image/jpeg', data: cake.base64 },
          decor: decor ? { media_type: 'image/jpeg', data: decor.base64 } : null
        })
      })
      const out = await r.json()
      if (!r.ok) throw new Error(out.error || 'That did not work.')

      const field = mode === 'ideas' ? 'ai_ideas' : 'ai_roast'
      setRow((p) => ({ ...(p || {}), [field]: out.text }))

      if (supabaseReady && row) {
        await supabase.from('cakes').update({ [field]: out.text }).eq('guest_id', guestId)
      }
    } catch (e) {
      setStatus({ bad: true, text: e.message })
    } finally { setBusy(null) }
  }

  return (
    <div className="stack">
      <div className="card">
        <span className="sticker">Work in progress</span>
        <p className="eyebrow">Your station</p>
        <h2 className="title">Show us the cake</h2>
        <p className="lede">One of the cake. One of your sprinkles, if you want ideas that use what you actually have.</p>
      </div>

      <div className="card">
        <div className="slots">
          <Slot title="The cake" hint="Take photo" shot={cake} onPick={(f) => take(f, 'cake')} />
          <Slot title="Your sprinkles" hint="Optional" shot={decor} onPick={(f) => take(f, 'decor')} />
        </div>
      </div>

      {status && <div className={'notice' + (status.bad ? ' bad' : '')}>{status.text}</div>}

      <button className="btn" onClick={share} disabled={busy === 'upload'}>
        {busy === 'upload' ? 'Sendingâ€¦' : row ? 'Replace my cake' : 'Put it on the table'}
      </button>

      <div className="card">
        <span className="sticker pink">The oracle</span>
        <p className="eyebrow">Ask the machine</p>
        <h2 className="title">Stuck, or feeling brave?</h2>
        <div className="duo">
          <button className="btn blush" onClick={() => ask('ideas')} disabled={!!busy}>
            {busy === 'ideas' ? 'Thinkingâ€¦' : 'Give me ideas'}
          </button>
          <button className="btn ghost" onClick={() => ask('roast')} disabled={!!busy}>
            {busy === 'roast' ? 'Sharpeningâ€¦' : 'Roast my cake'}
          </button>
        </div>
      </div>

      {cake && <PutMeOnMyCake cake={cake} />}
 </div>
 )
}
