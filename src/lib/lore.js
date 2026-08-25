import { CENSUS } from "../data/census"

const tagged = (t) => CENSUS.filter((q) => q.tags.includes(t))
const MATCH = tagged("match")
const AXES = tagged("axis")
const RARE = tagged("rarity")

export function similarity(a, b) {
const both = MATCH.filter((q) => a && b && a[q.id] && b[q.id])
if (!both.length) return 0
const same = both.filter((q) => a[q.id] === b[q.id]).length
return Math.round((same / both.length) * 100)
}

export function neighbours(me, rows) {
const others = rows.filter((r) => r.guest_id !== me.guest_id)
if (!others.length) return null
const scored = others
.map((r) => ({ name: r.name, selfie: r.selfie_url, score: similarity(me.responses, r.responses) }))
.sort((x, y) => y.score - x.score)
return { twin: scored[0], opposite: scored[scored.length - 1] }
}

export function axisReading(me, rows, q) {
const vals = rows.map((r) => Number(r.responses && r.responses[q.id])).filter((n) => !Number.isNaN(n))
const mine = Number(me.responses && me.responses[q.id])
if (Number.isNaN(mine) || vals.length < 2) return null
const sorted = vals.slice().sort((a, b) => a - b)
const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]
const bandLow = at(0.25)
const bandHigh = at(0.75)
const below = vals.filter((v) => v < mine).length
const pct = Math.round((below / (vals.length - 1)) * 100)
let verdict
if (mine > bandHigh + 8) verdict = "high"
else if (mine < bandLow - 8) verdict = "low"
else if (Math.abs(mine - 50) < 12) verdict = "mid"
else verdict = "pack"
return { id: q.id, name: q.axis.name, low: q.axis.low, high: q.axis.high, mine, bandLow, bandHigh, pct, verdict }
}

export function allAxes(me, rows) {
return AXES.map((q) => axisReading(me, rows, q)).filter(Boolean)
}

export function axisLine(a) {
const L = {
restraint: {
high: "The most maximalist person here, by some distance.",
low: "The most restrained person in the room. Someone has to be.",
mid: "Dead centre. The only balanced thing about you.",
pack: "Comfortably in the pack on this one."
},
method: {
high: "Pure improviser. No plan survives contact with you.",
low: "You sketched it first. You always sketch it first.",
mid: "Half planner, half chancer. Dead centre.",
pack: "Roughly where everyone else sits."
},
nerve: {
high: "You would genuinely be fine in a real kitchen.",
low: "You said you would cry. Everyone respects the honesty.",
mid: "Exactly average nerve. Reassuring, somehow.",
pack: "Nerve to spare, but not showing off about it."
}
}
const set = L[a.id] || L.restraint
return set[a.verdict] || set.pack
}

export function verdict(me, rows) {
const axes = allAxes(me, rows)
if (!axes.length) return { title: "the first one here", sub: "Nobody else has answered yet." }
const far = axes.filter((a) => a.verdict === "high" || a.verdict === "low")
if (!far.length) return { title: "the diplomat", sub: "Middle of the room on everything. Suspiciously reasonable." }
const worst = far.sort((a, b) => Math.abs(b.mine - 50) - Math.abs(a.mine - 50))[0]
const TITLES = {
restraint: worst.mine > 50 ? "the maximalist" : "the minimalist",
method: worst.mine > 50 ? "the improviser" : "the planner",
nerve: worst.mine > 50 ? "unshakeable" : "the honest one"
}
return { title: TITLES[worst.id] || "the outlier", sub: "Nobody else answered quite like you. Sorry." }
}

export function rarest(me, rows) {
let best = null
for (const q of RARE) {
const mine = me.responses && me.responses[q.id]
if (!mine) continue
const agree = rows.filter((r) => r.responses && r.responses[q.id] === mine)
if (!best || agree.length < best.agree.length) {
best = { ask: q.ask, answer: mine, agree, total: rows.length }
}
}
if (!best) return null
const others = best.agree.filter((r) => r.guest_id !== me.guest_id)
return { ask: best.ask, answer: best.answer, agree: best.agree, total: best.total, others }
}
