import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { setupInterceptors } from './utils/apiClient';
import './App.css';
import { Box, Skeleton, Typography } from '@mui/material'; // Importar Skeleton y Box

// Componente Skeleton para la carga inicial de la aplicación
const AppSkeleton = () => (
  <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Skeleton variant="rectangular" width="100%" height={60} />
    <Skeleton variant="text" sx={{ fontSize: '1rem' }} width="60%" />
    <Skeleton variant="rectangular" width="100%" height={200} />
    <Skeleton variant="text" sx={{ fontSize: '1rem' }} width="80%" />
    <Skeleton variant="rectangular" width="100%" height={100} />
  </Box>
);

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Definimos logout primero para poder usarlo en setupInterceptors
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  };

  // Inicializamos el interceptor inmediatamente con la función de logout
  // Esto asegura que cualquier llamada a apiClient tenga acceso al logout
  setupInterceptors(handleLogout);

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

  if (loading) return <AppSkeleton />;

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