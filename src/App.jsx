import React, { useEffect, useState } from "react"
import { useUserStore } from "./store/userStore"
import Welcome from "./components/Welcome"
import Index from "./components/Index"
import Census from "./components/Census"
import CakeStudio from "./components/CakeStudio"
import CameraRoll from "./components/CameraRoll"
import Zine from "./components/Zine"
import MissionFloat from "./components/MissionFloat"
import "./App.css"

const TITLES = {
  census: "The questionnaire",
  cake: "Your cake",
  photos: "Photos",
  zine: "The issue"
}

export default function App() {
  const { name } = useUserStore()
  const [entered, setEntered] = useState(Boolean(name))
  const [view, setView] = useState(() => (window.location.hash || "#index").slice(1))

  useEffect(() => {
    const onPop = () => setView((window.location.hash || "#index").slice(1))
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const go = (id) => {
    window.history.pushState(null, "", "#" + id)
    setView(id)
  }
  const back = () => window.history.back()

  if (!entered) return <Welcome onDone={() => { setEntered(true); go("index") }} />

  const atIndex = view === "index" || !TITLES[view]

  return (
    <div className="app">
      <div className="ticker">
        {atIndex
          ? <><span>No. 01 &middot; Mini cakes</span><span>Not a competition</span></>
          : <><button className="tk-back" onClick={back}>&larr; Back</button><span>{TITLES[view]}</span></>}
      </div>

      {atIndex && (
        <header className="masthead">
          <h1>Cake<em>Party</em></h1>
          <p>We meet &middot; we hang &middot; we decorate</p>
        </header>
      )}

      <main>
        {atIndex && <Index go={go} />}
        {view === "census" && <Census />}
        {view === "cake" && <CakeStudio />}
        {view === "photos" && <CameraRoll />}
        {view === "zine" && <Zine />}
      </main>

      <MissionFloat />
    </div>
  )
}
