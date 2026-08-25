import { create } from 'zustand'
import { supabase } from '../config/supabase'

export const useUserStore = create((set) => ({
  user: null,
  userName: localStorage.getItem('userName') || '',
  loading: true,
  
  setUserName: (name) => {
    localStorage.setItem('userName', name)
    set({ userName: name })
  },
  
  initAuth: async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (!data.session) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signInAnonymously()
        if (signUpError) throw signUpError
        set({ user: signUpData.user })
      } else {
        set({ user: data.session.user })
      }
    } catch (error) {
      console.error('Auth error:', error)
      set({ user: { id: 'anonymous-' + Date.now() } })
    } finally {
      set({ loading: false })
    }
  }
}))
