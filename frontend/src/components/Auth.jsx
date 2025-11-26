import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      alert('¡Revisa tu correo para el enlace de inicio de sesión!')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row flex-center">
      <div className="col-6 form-widget" aria-live="polite">
        <h1 className="header">Autenticación</h1>
        <p className="description">Inicia sesión con tu correo electrónico a continuación</p>
        <form onSubmit={handleLogin}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            className="inputField"
            type="email"
            placeholder="Tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="button block" aria-live="polite" disabled={loading}>
            {loading ? <span>Cargando...</span> : <span>Enviar enlace mágico</span>}
          </button>
        </form>
      </div>
    </div>
  )
}
