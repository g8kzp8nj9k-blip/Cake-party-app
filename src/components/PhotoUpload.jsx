import React, { useState, useRef } from 'react'
import { supabase } from '../config/supabase'
import { useUserStore } from '../store/userStore'
import './PhotoUpload.css'

export default function PhotoUpload() {
  const [cakePhoto, setCakePhoto] = useState(null)
  const [decorePhoto, setDecorePhoto] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const cakeInputRef = useRef()
  const decoreInputRef = useRef()
  const { userName, user } = useUserStore()

  const handlePhotoCapture = async (file, type) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      if (type === 'cake') {
        setCakePhoto({ file, preview: e.target.result })
      } else {
        setDecorePhoto({ file, preview: e.target.result })
      }
    }
    reader.readAsDataURL(file)
  }

  const uploadPhoto = async () => {
    if (!cakePhoto) {
      setMessage('Please take a photo of your cake!')
      return
    }

    if (!userName.trim()) {
      setMessage('Please set your name first!')
      return
    }

    setIsLoading(true)
    try {
      const timestamp = Date.now()
      
      const cakePath = `${user?.id}-${timestamp}-cake.jpg`
      const { error: cakeError } = await supabase.storage
        .from('cakes')
        .upload(cakePath, cakePhoto.file, { contentType: 'image/jpeg' })
      
      if (cakeError) throw cakeError

      const cakeUrl = supabase.storage
        .from('cakes')
        .getPublicUrl(cakePath).data.publicUrl

      let decoreUrl = null
      if (decorePhoto) {
        const decorePath = `${user?.id}-${timestamp}-decor.jpg`
        const { error: decoreError } = await supabase.storage
          .from('cakes')
          .upload(decorePath, decorePhoto.file, { contentType: 'image/jpeg' })
        
        if (decoreError) throw decoreError
        decoreUrl = supabase.storage
          .from('cakes')
          .getPublicUrl(decorePath).data.publicUrl
      }

      const { error: dbError } = await supabase
        .from('cakes')
        .insert({
          user_id: user?.id,
          user_name: userName,
          cake_photo_url: cakeUrl,
          decor_photo_url: decoreUrl,
          has_ai_suggestions: false
        })

      if (dbError) throw dbError

      setMessage('🎉 Cake uploaded! See it in the gallery!')
      setCakePhoto(null)
      setDecorePhoto(null)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setMessage('Failed to upload photo. Try again!')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="photo-upload">
      <div className="card">
        <h2>📸 Your cake in progress</h2>
        <p className="subtitle">Take a photo of your cake and any decor you have</p>
      </div>

      <div className="photo-section">
        <div className="photo-area">
          <h3>Your cake</h3>
          {cakePhoto?.preview ? (
            <div className="photo-preview">
              <img src={cakePhoto.preview} alt="Your cake" />
              <button 
                className="change-btn"
                onClick={() => cakeInputRef.current?.click()}
              >
                Change photo
              </button>
            </div>
          ) : (
            <button 
              className="photo-btn"
              onClick={() => cakeInputRef.current?.click()}
            >
              📷 Take photo
            </button>
          )}
          <input
            ref={cakeInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handlePhotoCapture(e.target.files?.[0], 'cake')}
            style={{ display: 'none' }}
          />
        </div>

        <div className="photo-area">
          <h3>Decor & sprinkles (optional)</h3>
          {decorePhoto?.preview ? (
            <div className="photo-preview">
              <img src={decorePhoto.preview} alt="Your decor" />
              <button 
                className="change-btn"
                onClick={() => decoreInputRef.current?.click()}
              >
                Change photo
              </button>
            </div>
          ) : (
            <button 
              className="photo-btn secondary"
              onClick={() => decoreInputRef.current?.click()}
            >
              🎨 Photo (optional)
            </button>
          )}
          <input
            ref={decoreInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handlePhotoCapture(e.target.files?.[0], 'decor')}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <button 
        className="upload-btn"
        onClick={uploadPhoto}
        disabled={!cakePhoto || isLoading}
      >
        {isLoading ? 'Uploading...' : '✨ Share my cake'}
      </button>

      <div className="tip">
        💡 Tip: Decor photo helps us suggest fun design ideas based on what you have!
      </div>
    </div>
  )
}
