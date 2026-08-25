import React, { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import './Gallery.css'

export default function Gallery() {
  const [cakes, setCakes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCake, setSelectedCake] = useState(null)

  useEffect(() => {
    fetchCakes()
    const interval = setInterval(fetchCakes, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchCakes = async () => {
    try {
      const { data, error } = await supabase
        .from('cakes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCakes(data || [])
    } catch (error) {
      console.error('Error fetching cakes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="gallery"><div className="card"><p>Loading cakes...</p></div></div>
  }

  if (cakes.length === 0) {
    return (
      <div className="gallery">
        <div className="card empty-state">
          <p>🍰 No cakes yet!</p>
          <p>Be the first to upload your cake in progress</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gallery">
      <div className="card">
        <h2>🎉 Cake Gallery</h2>
        <p className="subtitle">{cakes.length} beautiful creations</p>
      </div>

      <div className="cakes-grid">
        {cakes.map(cake => (
          <div key={cake.id} className="cake-item">
            <div className="cake-photo">
              <img 
                src={cake.cake_photo_url} 
                alt={`${cake.user_name}'s cake`}
                onClick={() => setSelectedCake(cake)}
              />
              <div className="overlay">
                <p>{cake.user_name}</p>
              </div>
            </div>
            {cake.decor_photo_url && (
              <div className="decor-badge">🎨</div>
            )}
          </div>
        ))}
      </div>

      {selectedCake && (
        <div className="modal" onClick={() => setSelectedCake(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedCake(null)}>✕</button>
            
            <h2>{selectedCake.user_name}'s cake</h2>
            
            <div className="modal-photos">
              <div className="modal-photo">
                <h3>The cake</h3>
                <img src={selectedCake.cake_photo_url} alt="Cake" />
              </div>
              
              {selectedCake.decor_photo_url && (
                <div className="modal-photo">
                  <h3>Decor available</h3>
                  <img src={selectedCake.decor_photo_url} alt="Decor" />
                </div>
              )}
            </div>

            {selectedCake.has_ai_suggestions && (
              <div className="suggestions">
                <h3>✨ AI Design ideas</h3>
                <p>Design suggestions will appear here soon!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
