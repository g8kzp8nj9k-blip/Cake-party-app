import React, { useState, useEffect } from 'react'
import { useUserStore } from './store/userStore'
import Questionnaire from './components/Questionnaire'
import PhotoUpload from './components/PhotoUpload'
import Gallery from './components/Gallery'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('questions')
  const [userName, setNameInput] = useState('')
  const { userName: storedName, setUserName, initAuth, loading } = useUserStore()

  useEffect(() => {
    initAuth()
    setNameInput(storedName)
  }, [])

  if (loading) {
    return <div className="loading">Loading your party...</div>
  }

  const handleNameSave = () => {
    if (userName.trim()) {
      setUserName(userName)
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🍰 Cake Party</h1>
        <p>Design • Share • Celebrate</p>
      </div>

      <div className="container">
        <div className="name-section">
          <input
            type="text"
            placeholder="What's your name?"
            value={userName}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSave}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleNameSave()
            }}
            maxLength={30}
          />
          {storedName && <p className="name-saved">✓ {storedName}</p>}
        </div>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            Questions
          </button>
          <button
            className={`tab-btn ${activeTab === 'cake' ? 'active' : ''}`}
            onClick={() => setActiveTab('cake')}
          >
            My Cake
          </button>
          <button
            className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            Gallery
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'questions' && <Questionnaire />}
          {activeTab === 'cake' && <PhotoUpload />}
          {activeTab === 'gallery' && <Gallery />}
        </div>
      </div>

      <footer className="footer">
        <p>Made with 💕 for your cake party</p>
      </footer>
    </div>
  )
}
