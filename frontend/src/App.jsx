import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, verificamos si hay token guardado
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  };

  if (loading) return null; // O un spinner de carga

  // Pasamos un objeto "session" simulado al Dashboard para mantener compatibilidad
  const mockSession = token ? { access_token: token, user: user } : null;

  return (
    <div className="container">
      {!token ? (
        <Auth onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard 
            key={user.id} 
            session={mockSession} 
            onLogout={handleLogout} // Pasamos función de logout explícita
        />
      )}
    </div>
  )
}

export default App;