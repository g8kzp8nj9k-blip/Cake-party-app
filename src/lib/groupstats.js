import { CENSUS } from "../data/census"
const RARE = CENSUS.filter((q) => q.tags.includes("rarity"))
const AXES = CENSUS.filter((q) => q.tags.includes("axis"))

export function tally(rows, id) {
const counts = {}
rows.forEach((r) => { const v = r.responses && r.responses[id]; if (v) counts[v] = (counts[v] || 0) + 1 })
return counts
}

export function distribution(rows, q) {
const counts = tally(rows, q.id)
return (q.opts || []).map((o) => ({ label: o, n: counts[o] || 0 })).sort((a, b) => b.n - a.n)
}

export function axisSplit(rows, q) {
const vals = rows.map((r) => Number(r.responses && r.responses[q.id])).filter((n) => !Number.isNaN(n))
return {
low: vals.filter((v) => v < 40).length,
mid: vals.filter((v) => v >= 40 && v <= 60).length,
high: vals.filter((v) => v > 60).length,
total: vals.length, q
}
}

export function allSplits(rows) { return AXES.map((q) => axisSplit(rows, q)).filter((s) => s.total > 1) }

export function findings(rows) {
const out = []
const total = rows.length
for (const q of RARE) {
const counts = tally(rows, q.id)
const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
if (!entries.length) continue
const top = entries[0][0], n = entries[0][1]
if (n / total >= 0.7 && total > 2) out.push({ kind: "consensus", text: n + " of " + total + " said " + top + "." })
;(q.opts || []).forEach((o) => { if (!counts[o]) out.push({ kind: "nobody", text: "Nobody chose " + o + "." }) })
if (entries.length >= 3 && n / total <= 0.4) out.push({ kind: "split", text: "No agreement at all on " + q.ask.toLowerCase() + "." })
}
return out
}

export function alignments(rows) {
const norm = (s) => String(s || "").trim().toLowerCase()
const buckets = {}
rows.forEach((r) => {
const v = norm(r.responses && r.responses.guest)
if (!v) return
if (!buckets[v]) buckets[v] = []
buckets[v].push(r.name)
})
return Object.entries(buckets).filter((e) => e[1].length > 1).map((e) => ({ value: e[0], names: e[1] }))
}

export function predictions(rows) {
const counts = tally(rows, "mostelaborate")
const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
return {
winner: entries.length ? entries[0][0] : null,
votes: entries.length ? entries[0][1] : 0,
total: rows.length,
selfcasts: rows.map((r) => ({ name: r.name, said: r.responses && r.responses.selfcast, selfie: r.selfie_url })).filter((x) => x.said)
}
}
