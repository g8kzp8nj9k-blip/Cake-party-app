import React, { useState } from 'react'
import { useUserStore } from './store/userStore'
import Questions from './components/Questions'
import MyCake from './components/MyCake'
import Gallery from './components/Gallery'
import './App.css'

const TABS = [
  { id: 'questions', label: 'Questions' },
  { id: 'cake', label: 'My cake' },
  { id: 'gallery', label: 'The table' }
]

export default function App() {
  const [tab, setTab] = useState('questions')
  const { name, setName } = useUserStore()
  const [draft, setDraft] = useState(name)

  const commit = () => setName(draft)

  return (
    <div className="app">
      <div className="ticker">
        <span>No. 01 · Mini cakes</span>
        <span>Not a competition</span>
      </div>

      <header className="masthead">
        <h1>Cake<em>Party</em></h1>
        <p>We meet · we hang · we decorate</p>
      </header>

      <div className="guestbook">
        <label htmlFor="guest">Sign the guest book</label>
        <input
          id="guest"
          value={draft}
          placeholder="your name"
          maxLength={30}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { commit(); e.currentTarget.blur() } }}
        />
      </div>

      <main>
        {tab === 'questions' && <Questions />}
        {tab === 'cake' && <MyCake />}
        {tab === 'gallery' && <Gallery />}
      </main>

      <footer className="rule">Bring your favourite bottle</footer>

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
