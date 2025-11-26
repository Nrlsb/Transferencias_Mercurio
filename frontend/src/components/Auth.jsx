import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // No se necesita alerta, el listener onAuthStateChange en App.jsx se encargará del resto.
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      // Por defecto, Supabase requiere confirmación por email para los nuevos registros.
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row flex-center">
      <div className="col-6 form-widget" aria-live="polite">
        <h1 className="header">Autenticación con Contraseña</h1>
        <p className="description">Inicia sesión o regístrate con tu correo y contraseña.</p>
        
        {/* El formulario principal se asocia con el inicio de sesión */}
        <form onSubmit={handleLogin}>
          <div>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              className="inputField"
              type="email"
              placeholder="Tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="inputField"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div style={{ paddingTop: '1rem' }}>
            <button type="submit" className="button block" aria-live="polite" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
        
        {/* El botón de registro tiene su propio manejador de eventos */}
        <div style={{ paddingTop: '0.5rem' }}>
            <button type="button" className="button block secondary" onClick={handleSignUp} disabled={loading}>
                {loading ? '...' : 'Registrarse'}
            </button>
        </div>

      </div>
    </div>
  );
}