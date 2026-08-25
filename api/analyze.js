// Vercel serverless function. Keeps the Anthropic key on the server,
// so it is never shipped to your friends' phones.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel.' })

  const { mode, cake, decor } = req.body || {}
  if (!cake?.data || !cake?.media_type) return res.status(400).json({ error: 'No cake photo received.' })

  const PROMPTS = {
    ideas:
      'You are helping at a small, friendly cake-decorating party. The first image is someone\'s cake in progress. ' +
      (decor ? 'The second image shows the decorations and sprinkles actually available to them. Only suggest things you can genuinely see in that second image. ' : '') +
      'Give exactly three short decorating ideas they could do in the next ten minutes. Each idea: a bold four-word name, then one sentence of how. ' +
      'Warm, specific, a little witty. No preamble, no numbering, no markdown. Separate ideas with a blank line.',
    roast:
      'You are the gently savage judge at a friendly cake-decorating party among close friends. Look at this cake. ' +
      'Write a two-sentence roast that is genuinely funny and affectionate — tease the cake, never the person, and never their body, skill, or worth. ' +
      'Then on a new line write "Score: X/10" with a generous score between 6 and 10. No preamble, no markdown.'
  }

  const prompt = PROMPTS[mode]
  if (!prompt) return res.status(400).json({ error: 'Unknown mode.' })

  const content = [{ type: 'image', source: { type: 'base64', media_type: cake.media_type, data: cake.data } }]
  if (decor?.data && mode === 'ideas') {
    content.push({ type: 'image', source: { type: 'base64', media_type: decor.media_type, data: decor.data } })
  }
  content.push({ type: 'text', text: prompt })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content }]
      })
    })

    if (!r.ok) {
      const detail = await r.text()
      return res.status(502).json({ error: 'Anthropic said no.', detail: detail.slice(0, 300) })
    }

    const data = await r.json()
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 200) })
  }
}
