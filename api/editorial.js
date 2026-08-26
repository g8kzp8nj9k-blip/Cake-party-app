export const config = { maxDuration: 60 }

export default async function handler(req, res) {
if (req.method !== "POST") return res.status(405).json({ error: "POST only" })
const key = process.env.ANTHROPIC_API_KEY
if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel." })

const b = req.body || {}
const facts = []
;(b.findings || []).forEach((f) => facts.push(f.text))
;(b.alignments || []).forEach((a) => facts.push(a.names.join(" and ") + " both named " + a.value + " independently."))
;(b.splits || []).forEach((s) => facts.push(s.q + ": " + s.low + " low, " + s.mid + " middle, " + s.high + " high, of " + s.total + "."))
if (b.predictions && b.predictions.winner) facts.push("The room predicted " + b.predictions.winner + " would make the most elaborate cake (" + b.predictions.votes + " of " + b.predictions.total + " votes).")

if (!facts.length) return res.status(400).json({ error: "Not enough answers yet." })

const prompt = [
"You are writing the group-lore page of a one-off zine made by " + (b.count || "several") + " friends after a cake-decorating party.",
"",
"Here are the true facts from their questionnaire. Do not invent any others:",
facts.map((f) => "- " + f).join("\n"),
"",
"Write three short items. Each has a headline of at most five words and one paragraph of one or two sentences.",
"",
"Voice: dry, warm, specific. The fact is the joke - do not add one on top.",
"No exclamation marks. No cheerleading. Never state a number the facts above do not contain.",
"",
"Return ONLY a JSON array, no markdown fences:",
'[{"head":"<headline>","body":"<paragraph>"}]'
].join("\n")

try {
const r = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 900, messages: [{ role: "user", content: prompt }] })
})
if (!r.ok) return res.status(502).json({ error: "Could not write the lore.", detail: (await r.text()).slice(0, 300) })
const data = await r.json()
const text = (data.content || []).filter((x) => x.type === "text").map((x) => x.text).join("").trim()
const clean = text.replace(/```json|```/g, "").trim()
let items
try { items = JSON.parse(clean) } catch (e) {
const m = clean.match(/\[[\s\S]*\]/)
if (!m) throw new Error("Unreadable response")
items = JSON.parse(m[0])
}
return res.status(200).json({ items })
} catch (e) {
return res.status(500).json({ error: String(e.message || e).slice(0, 200) })
}
}
