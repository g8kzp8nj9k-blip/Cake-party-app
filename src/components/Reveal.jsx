import React from "react"
import { useUserStore } from "../store/userStore"
import { neighbours, allAxes, axisLine, verdict, rarest } from "../lib/lore"
import "./Reveal.css"

function Face({ name, src, size }) {
const px = size || 46
const s = { width: px, height: px, fontSize: Math.round(px * 0.44) }
if (src) return <img className="face" style={s} src={src} alt={name} />
return <span className="face initial" style={s}>{(name || "?").trim().charAt(0).toUpperCase()}</span>
}

export default function Reveal({ rows, onEdit }) {
const { guestId, name } = useUserStore()
const me = rows.find((r) => r.guest_id === guestId)
if (!me) return null

const v = verdict(me, rows)
const near = neighbours(me, rows)
const axes = allAxes(me, rows).slice(0, 2)
const rare = rarest(me, rows)

return (
<div className="reveal">
<div className="rv-ticker">
<span>Census card</span>
<span>{rows.length} in</span>
</div>

<div className="rv-body">
<p className="rv-name">{name}</p>
<h2 className="rv-verdict">you are <em>{v.title}</em></h2>
<p className="rv-sub">{v.sub}</p>

{near && (
<div className="rv-pair">
<div className="rv-card">
<Face name={near.twin.name} src={near.twin.selfie} />
<p className="rv-label">Cake twin</p>
<p className="rv-person">{near.twin.name}</p>
<p className="rv-score">{near.twin.score}% the same</p>
</div>
<div className="rv-card">
<Face name={near.opposite.name} src={near.opposite.selfie} />
<p className="rv-label">Your opposite</p>
<p className="rv-person">{near.opposite.name}</p>
<p className="rv-score">{near.opposite.score}% the same</p>
</div>
</div>
)}

{axes.length > 0 && (
<div className="rv-card wide">
<p className="rv-label">You in this room</p>
{axes.map((a) => (
<div className="rv-axis" key={a.id}>
<div className="rail">
<span className="band" style={{ left: a.bandLow + "%", width: Math.max(4, a.bandHigh - a.bandLow) + "%" }} />
<span className="dot" style={{ left: a.mine + "%" }} />
</div>
<div className="rail-ends"><span>{a.low}</span><span>{a.high}</span></div>
<p className="rv-line">{axisLine(a)}</p>
</div>
))}
</div>
)}

{rare && (
<div className="rv-rare">
<span className="rv-stamp">{rare.agree.length} of {rare.total}</span>
<p className="rv-label dark">{rare.others.length ? "Almost nobody agrees" : "Nobody agrees with you"}</p>
<p className="rv-opinion">{rare.ask} <em>{rare.answer}</em></p>
{rare.others.length > 0 ? (
<div className="rv-ally">
<Face name={rare.others[0].name} src={rare.others[0].selfie_url} size={24} />
<span>{rare.others.length === 1 ? "Only " + rare.others[0].name + " is with you on this" : rare.others[0].name + " and " + (rare.others.length - 1) + " others agree"}</span>
</div>
) : (
<p className="rv-alone">You are entirely alone here.</p>
)}
</div>
)}

<button className="rv-edit" onClick={onEdit}>Change my answers</button>
</div>
</div>
)
}
