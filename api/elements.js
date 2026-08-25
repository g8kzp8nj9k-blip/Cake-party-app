export const config = { maxDuration: 60 }

export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
const key = process.env.ANTHROPIC_API_KEY
if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel.' })

const cakes = (req.body || {}).cakes
if (!Array.isArray(cakes) || !cakes.length) return res.status(400).json({ error: 'No cakes received.' })

const content = []
cakes.forEach(function (c, i) {
content.push({ type: 'text', text: 'Cake ' + (i + 1) + ' - made by ' + c.name + ':' })
content.push({ type: 'image', source: { type: 'base64', media_type: c.media_type, data: c.data } })
})

content.push({
type: 'text',
text: [
'These are ' + cakes.length + ' cakes decorated at a party by friends.',
'For each cake, name the ONE most distinctive visual element - the thing you would recognise it by.',
'',
'Write each as a short noun phrase, five words at most, warm and specific and a little funny.',
'Examples of the right register: "The lopsided bow", "Cherries, far too many", "Piped flowers, suspiciously neat".',
'Tease the decoration, never the person. Never comment on skill or effort.',
'Every element must be different from the others.',
'',
'Return ONLY a JSON array, no preamble and no markdown fences:',
'[{"name": "the makers name", "element": "the phrase"}]'
].join('\n')
})

try {
const r = await fetch('https://api.anthropic.com/v1/messages', {
method: 'POST',
headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 800, messages: [{ role: 'user', content: content }] })
})
if (!r.ok) return res.status(502).json({ error: 'Could not read the cakes.', detail: (await r.text()).slice(0, 300) })

const data = await r.json()
const text = (data.content || []).filter(function (x) { return x.type === 'text' }).map(function (x) { return x.text }).join('').trim()
const clean = text.replace(/```json|```/g, '').trim()

let elements
try {
elements = JSON.parse(clean)
} catch (err) {
const match = clean.match(/\[[\s\S]*\]/)
if (!match) throw new Error('Unreadable response')
elements = JSON.parse(match[0])
}
return res.status(200).json({ elements: elements })
} catch (e) {
return res.status(500).json({ error: String(e.message || e).slice(0, 200) })
}
}
