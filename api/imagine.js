const MATERIALS = {
bisque: {
label: 'Bisque porcelain',
body: 'a small bisque porcelain figurine about two inches tall, matte hand-tinted glaze, sculpted in a 1950s cake-topper style',
provenance: 'Bisque porcelain topper · hand-tinted · maker unknown, c. 1952'
},
icing: {
label: 'Royal icing',
body: 'a small figure piped in royal icing about two inches tall, slightly uneven lines, visible piping ridges, made by a careful but shaky hand',
provenance: 'Royal icing, piped freehand · one attempt · no revisions'
},
cameo: {
label: 'Cameo',
body: 'a small oval carved cameo brooch about two inches tall standing upright on the cake, pale relief profile portrait on a soft ground, carved shell',
provenance: 'Carved shell cameo · profile · date unknown'
},
sugar: {
label: 'Sugar sheet',
body: 'a small printed edible sugar sheet about two inches tall standing upright on the cake, the ink slightly bled into the sugar, edges very faintly curled',
provenance: 'Printed sugar sheet · edible ink · slight bleed'
}
}

function topperPrompt(materialKey) {
const m = MATERIALS[materialKey] || MATERIALS.bisque
return [
'Place ' + m.body + ' on top of this cake.',
'The figure resembles the person in the second photograph.',
'It must sit on the frosting as a real three-dimensional object, with a soft contact shadow beneath it and the same light direction as the rest of the scene.',
'Keep the cake, its frosting, its decorations, the camera angle, the background and the lighting exactly as they are. Change nothing except adding the figure.',
'It is a sculpted object, not a flat cutout, not a pasted photograph, and not a face-shaped sticker.',
'The figure is small relative to the cake. It must not cover the cake or dominate the frame.'
].join(' ')
}

function friendshipPrompt(elements) {
const list = elements.slice(0, 5).map(function (e) { return '- ' + e.element }).join('\n')
return [
'A single photorealistic celebration cake on a plain surface, photographed from a slight three-quarter angle in soft natural daylight.',
'It deliberately combines these decorative elements, each clearly visible and identifiable:',
list,
'The result should look like one real cake that a very enthusiastic person actually made, not a collage and not a digital composite.',
'Warm domestic setting, shallow depth of field, no text, no lettering, no writing anywhere on or near the cake.'
].join('\n')
}

async function generate(key, prompt, images) {
const headers = { authorization: 'Bearer ' + key }
let endpoint, body

if (images.length) {
const form = new FormData()
form.append('model', 'gpt-image-1')
form.append('prompt', prompt)
form.append('size', '1024x1024')
form.append('quality', 'high')
images.forEach(function (img, i) {
const bin = Buffer.from(img.data, 'base64')
form.append('image[]', new Blob([bin], { type: img.media_type }), 'img' + i + '.jpg')
})
endpoint = 'https://api.openai.com/v1/images/edits'
body = form
} else {
endpoint = 'https://api.openai.com/v1/images/generations'
headers['content-type'] = 'application/json'
body = JSON.stringify({ model: 'gpt-image-1', prompt: prompt, size: '1024x1024', quality: 'high' })
}

const r = await fetch(endpoint, { method: 'POST', headers: headers, body: body })
if (!r.ok) throw new Error((await r.text()).slice(0, 300))
const out = await r.json()
return out.data && out.data[0] ? out.data[0].b64_json : null
}

export const config = { maxDuration: 120 }

export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
const key = process.env.OPENAI_API_KEY
if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY is not set in Vercel.' })

const b = req.body || {}
try {
if (b.mode === 'topper') {
if (!b.cake || !b.cake.data) return res.status(400).json({ error: 'No cake photo received.' })
if (!b.selfie || !b.selfie.data) return res.status(400).json({ error: 'No selfie received.' })
const img = await generate(key, topperPrompt(b.material), [b.cake, b.selfie])
const m = MATERIALS[b.material] || MATERIALS.bisque
return res.status(200).json({ image: img, provenance: m.provenance, material: m.label })
}
if (b.mode === 'friendship') {
if (!Array.isArray(b.elements) || !b.elements.length) return res.status(400).json({ error: 'No cake elements received.' })
const img = await generate(key, friendshipPrompt(b.elements), [])
return res.status(200).json({ image: img })
}
return res.status(400).json({ error: 'Unknown mode.' })
} catch (e) {
return res.status(502).json({ error: 'Image generation failed.', detail: String(e.message || e).slice(0, 300) })
}
}
