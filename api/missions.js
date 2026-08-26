export const config = { maxDuration: 60 }

export default async function handler(req, res) {
if (req.method !== "POST") return res.status(405).json({ error: "POST only" })
const key = process.env.ANTHROPIC_API_KEY
if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel." })

const guests = (req.body || {}).guests
if (!Array.isArray(guests) || guests.length < 2) return res.status(400).json({ error: "Need at least two guests." })

const roster = guests.map((g) => {
const r = g.responses || {}
const bits = []
if (r.fondant) bits.push("thinks fondant is " + r.fondant.toLowerCase())
if (r.chocolate) bits.push("says chocolate cake is " + r.chocolate.toLowerCase())
if (r.palette) bits.push("palette: " + r.palette.toLowerCase())
if (r.flavour) bits.push("favourite flavour " + r.flavour.toLowerCase())
if (r.selfcast) bits.push("predicts their own cake will be " + r.selfcast.toLowerCase())
if (r.mostelaborate) bits.push("predicted " + r.mostelaborate + " makes the most elaborate cake")
if (r.wrong) bits.push("when things go wrong they " + r.wrong.toLowerCase())
return "- " + g.name + ": " + (bits.join("; ") || "no answers yet")
}).join("\n")

const prompt = [
"These " + guests.length + " friends are at a small cake-decorating party. Here is what each said in a pre-party questionnaire:",
"", roster, "",
"Give each guest ONE secret mission for the evening. They will never know anyone elses.",
"",
"Use this mix across the group, as far as the numbers allow:",
"- about 3 CENSUS-LINKED: built on something a specific named other guest actually said above.",
"- about 2 LANGUAGE: get a specific word said, or get someone to describe something a certain way.",
"- 1 STORY: find out one specific thing about someone.",
"- 1 DOCUMENTARY: get photographed, or appear in someones photo, without asking.",
"- 1 CRAFT: influence someone elses cake without them noticing.",
"",
"Rules: one or two sentences each. Achievable in an evening among friends.",
"Target opinions and preferences only - never anyones insecurities, body, skill or worth.",
"Never assign someone a mission about themselves. Warm and conspiratorial, never cruel.",
"",
"Return ONLY a JSON array, no markdown fences:",
'[{"name":"<guest name>","text":"<the mission>","category":"census"}]'
].join("\n")

try {
const r = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
})
if (!r.ok) return res.status(502).json({ error: "Could not write missions.", detail: (await r.text()).slice(0, 300) })
const data = await r.json()
const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim()
const clean = text.replace(/```json|```/g, "").trim()
let missions
try { missions = JSON.parse(clean) } catch (e) {
const m = clean.match(/\[[\s\S]*\]/)
if (!m) throw new Error("Unreadable response")
missions = JSON.parse(m[0])
}
return res.status(200).json({ missions })
} catch (e) {
return res.status(500).json({ error: String(e.message || e).slice(0, 200) })
}
}
