import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setChecked(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  // Google gives us a signed token; Supabase checks it and starts a session.
  const signInWithGoogleToken = useCallback(async (token, nonce) => {
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })
    if (error) throw error
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { user, checked, signInWithGoogleToken, signOut }
}
