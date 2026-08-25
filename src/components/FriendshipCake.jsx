import React, { useEffect, useState } from "react"
import { supabase, supabaseReady } from "../lib/supabase"
import { b64ToBlob } from "../lib/photo"
import "./FriendshipCake.css"

async function toBase64(url) {
const r = await fetch(url)
const blob = await r.blob()
return new Promise((res, rej) => {
const fr = new FileReader()
fr.onload = () => res(fr.result.split(",")[1])
fr.onerror = rej
fr.readAsDataURL(blob)
})
}

export default function FriendshipCake() {
const [cakes, setCakes] = useState([])
const [stage, setStage] = useState("idle")
const [step, setStep] = useState(0)
const [elements, setElements] = useState([])
const [image, setImage] = useState(null)
const [showAll, setShowAll] = useState(false)
const [error, setError] = useState(null)

useEffect(() => {
if (!supabaseReady) return
supabase.from("cakes").select("*").then(({ data }) => {
setCakes(data || [])
const done = (data || []).find((c) => c.friendship_url)
if (done) {
setImage(done.friendship_url)
setElements(done.friendship_elements || [])
setStage("done")
}
})
}, [])

useEffect(() => {
if (stage !== "making") return
const t = setInterval(() => setStep((s) => (s < 3 ? s + 1 : s)), 1400)
return () => clearInterval(t)
}, [stage])

const bake = async () => {
if (cakes.length < 2) { setError("Not enough cakes on the table yet."); return }
setStage("making")
setStep(0)
setError(null)
try {
const payload = await Promise.all(
cakes.map(async (c) => ({ name: c.name, media_type: "image/jpeg", data: await toBase64(c.cake_url) }))
)

const er = await fetch("/api/elements", {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({ cakes: payload })
})
const eo = await er.json()
if (!er.ok) throw new Error(eo.detail || eo.error || "Could not read the cakes.")
setElements(eo.elements)

const ir = await fetch("/api/imagine", {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({ mode: "friendship", elements: eo.elements })
})
const io = await ir.json()
if (!ir.ok || !io.image) throw new Error(io.detail || io.error || "Could not bake it.")

let url = "data:image/png;base64," + io.image
if (supabaseReady) {
const path = "friendship/" + Date.now() + ".png"
const up = await supabase.storage.from("cakes").upload(path, b64ToBlob(io.image), { contentType: "image/png", upsert: true })
if (!up.error) {
url = supabase.storage.from("cakes").getPublicUrl(path).data.publicUrl
await supabase.from("cakes").update({ friendship_url: url, friendship_elements: eo.elements }).eq("guest_id", cakes[0].guest_id)
}
}
setImage(url)
setStage("done")
} catch (e) {
setError(e.message)
setStage("idle")
}
}

if (stage === "making") {
return (
<div className="finale">
<p className={"finale-line" + (step >= 0 ? " in" : "")}>{cakes.length} cakes entered.</p>
<p className={"finale-line" + (step >= 1 ? " in" : "")}>{cakes.length} artists.</p>
<p className={"finale-line" + (step >= 2 ? " in" : "")}>One extremely unnecessary cake.</p>
<div className="finale-rule" />
<p className={"finale-tag" + (step >= 3 ? " in" : "")}>Our cake</p>
</div>
)
}

if (stage === "done" && image) {
const shown = showAll ? elements : elements.slice(0, 4)
const rest = elements.length - shown.length
return (
<div className="plate">
<div className="plate-frame">
<img src={image} alt="The friendship cake" />
</div>
<p className="fc-title">The Friendship Cake</p>
<p className="fc-sub">Never baked. Never eaten.</p>
<div className="fc-list">
{shown.map((e, i) => (
<div className="fc-row" key={i}>
<span className="fc-dot" />
<span className="fc-el">{e.element}</span>
<span className="fc-name">{e.name}</span>
</div>
))}
</div>
{rest > 0 && <button className="fc-more" onClick={() => setShowAll(true)}>and {rest} more</button>}
</div>
)
}

return (
<div className="finale idle">
<p className="finale-eyebrow">When everyone is done</p>
<p className="finale-head">Make the ninth cake</p>
<p className="finale-note">{cakes.length} {cakes.length === 1 ? "cake is" : "cakes are"} on the table. Each one gives it something.</p>
{error && <p className="err">{error}</p>}
<button className="btn gold" onClick={bake}>Bake it</button>
</div>
)
}
