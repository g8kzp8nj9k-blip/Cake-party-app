import React, { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { useUserStore } from '../store/userStore'
import './Questionnaire.css'

const QUESTIONS = [
  {
    id: 1,
    question: "How many holes does a straw have?",
    type: "multiple",
    options: ["0", "1", "2", "It depends"]
  },
  {
    id: 2,
    question: "Is a hotdog a sandwich?",
    type: "multiple",
    options: ["Yes", "No", "Maybe", "Absolutely not"]
  },
  {
    id: 3,
    question: "Cake decorating style?",
    type: "multiple",
    options: ["Messy & fun", "Precise & pretty", "Whatever's left", "Chaotic good"]
  },
  {
    id: 4,
    question: "How many times will you redesign?",
    type: "multiple",
    options: ["Once & done", "3-5 times", "Until it's perfect", "What's time?"]
  },
  {
    id: 5,
    question: "Your cake superpower?",
    type: "text",
    placeholder: "e.g., gravity-defying towers, abstract art..."
  }
]

export default function Questionnaire() {
  const [responses, setResponses] = useState({})
  const [allResponses, setAllResponses] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const { userName, user } = useUserStore()

  useEffect(() => {
    fetchAllResponses()
  }, [])

  const fetchAllResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setAllResponses(data || [])
      
      const currentUserRes = data?.find(res => res.user_id === user?.id)
      if (currentUserRes) {
        setResponses(currentUserRes.responses)
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error fetching responses:', error)
    }
  }

  const handleAnswer = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleSubmit = async () => {
    if (!userName.trim()) {
      alert('Please enter your name first!')
      return
    }

    try {
      const { error } = await supabase
        .from('questionnaires')
        .upsert({
          user_id: user?.id,
          user_name: userName,
          responses,
          updated_at: new Date()
        }, {
          onConflict: 'user_id'
        })
      
      if (error) throw error
      setSubmitted(true)
      fetchAllResponses()
    } catch (error) {
      console.error('Error saving responses:', error)
      alert('Failed to save responses')
    }
  }

  if (!submitted) {
    return (
      <div className="questionnaire">
        <div className="card">
          <h2>Let's get to know each other</h2>
          <p className="subtitle">Answer these fun questions before the party 🎉</p>
        </div>

        {QUESTIONS.map(q => (
          <div key={q.id} className="question-card">
            <h3>{q.question}</h3>
            {q.type === 'multiple' ? (
              <div className="options">
                {q.options.map(option => (
                  <button
                    key={option}
                    className={`option-btn ${responses[q.id] === option ? 'selected' : ''}`}
                    onClick={() => handleAnswer(q.id, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                placeholder={q.placeholder}
                value={responses[q.id] || ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                className="text-input"
              />
            )}
          </div>
        ))}

        <button className="submit-btn" onClick={handleSubmit}>
          Share my answers
        </button>
      </div>
    )
  }

  return (
    <div className="questionnaire">
      <div className="card success">
        <h2>✨ Answers submitted!</h2>
        <p>See how your friends answered below</p>
      </div>

      <div className="responses">
        {allResponses.map(res => (
          <div key={res.id} className="response-card">
            <h3>{res.user_name}</h3>
            <div className="response-list">
              {QUESTIONS.map(q => (
                <div key={q.id} className="response-item">
                  <p className="q-text">{q.question}</p>
                  <p className="a-text">{res.responses[q.id] || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
