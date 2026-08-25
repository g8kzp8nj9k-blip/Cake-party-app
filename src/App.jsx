import React, { useRef, useState } from "react"
import { useUserStore } from "./store/userStore"
import { squash } from "./lib/photo"
import { supabase, supabaseReady } from "./lib/supabase"
import Census from "./components/Census"
import MyCake from "./components/MyCake"
import Gallery from "./components/Gallery"
import "./App.css"

const TABS = [
{ id: "questions", label: "Census" },
{ id: "cake", label: "My cake" },
{ id: "gallery", label: "The table" }
]

export default function App() {
const [tab, setTab] = useState("questions")
const { name, setName, selfie, setSelfie, guestId } = useUserStore()
const [draft, setDraft] = useState(name)
const input = useRef(null)

const commit = () => setName(draft)

const takeSelfie = async (file) => {
try {
const shot = await squash(file, 500, 0.8)
setSelfie(shot.preview)
if (supabaseReady && draft.trim()) {
const path = guestId + "/selfie.jpg"
const up = await supabase.storage.from("cakes").upload(path, shot.blob, { contentType: "image/jpeg", upsert: true })
if (!up.error) {
const url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl + "?v=" + Date.now()
setSelfie(url)
await supabase.from("answers").upsert(
{ guest_id: guestId, name: draft.trim(), selfie_url: url, updated_at: new Date().toISOString() },
{ onConflict: "guest_id" }
)
}
}
} catch (e) {}
}

return (
<div className="app">
<div className="ticker">
<span>No. 01 &middot; Mini cakes</span>
<span>Not a competition</span>
</div>

<header className="masthead">
<h1>Cake<em>Party</em></h1>
<p>We meet &middot; we hang &middot; we decorate</p>
</header>

<div className="guestbook">
<label htmlFor="guest">Sign the guest book</label>
<div className="gb-row">
<button className="gb-selfie" onClick={() => input.current && input.current.click()} aria-label="Add a selfie">
{selfie ? <img src={selfie} alt="You" /> : <span className="gb-plus">+</span>}
</button>
<input id="guest" value={draft} placeholder="your name" maxLength={30}
onChange={(e) => setDraft(e.target.value)} onBlur={commit}
onKeyDown={(e) => { if (e.key === "Enter") { commit(); e.currentTarget.blur() } }} />
</div>
<input ref={input} type="file" accept="image/*" hidden
onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) takeSelfie(f); e.target.value = "" }} />
</div>

<main>
{tab === "questions" && <Census />}
{tab === "cake" && <MyCake />}
{tab === "gallery" && <Gallery />}
</main>

<footer className="rule">Bring your favourite bottle</footer>

<nav className="nav">
{TABS.map((t) => (
<button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
))}
</nav>
</div>
)
}
