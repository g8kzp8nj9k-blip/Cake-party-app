const MAX_EDGE = 1400

export function squash(file, maxEdge = MAX_EDGE, quality = 0.82) {
return new Promise((resolve, reject) => {
const img = new Image()
const url = URL.createObjectURL(file)
img.onload = () => {
URL.revokeObjectURL(url)
const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
const c = document.createElement('canvas')
c.width = Math.round(img.width * scale)
c.height = Math.round(img.height * scale)
c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
c.toBlob(
(blob) => {
const dataUrl = c.toDataURL('image/jpeg', quality)
resolve({ blob, preview: dataUrl, base64: dataUrl.split(',')[1] })
},
'image/jpeg',
quality
)
}
img.onerror = () => {
URL.revokeObjectURL(url)
reject(new Error('Could not read that photo.'))
}
img.src = url
})
}

export function b64ToBlob(b64, type = 'image/png') {
const bin = atob(b64)
const arr = new Uint8Array(bin.length)
for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
return new Blob([arr], { type })
}
