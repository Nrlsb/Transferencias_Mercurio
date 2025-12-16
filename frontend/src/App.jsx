import { useState, useEffect, useMemo } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { setupInterceptors } from './utils/apiClient';
import './App.css';
import { Box, Skeleton, Typography, ThemeProvider, createTheme, CssBaseline } from '@mui/material'; // Importar Skeleton y Box

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
  
  const theme = useMemo(() => {
    // El area puede venir con mayúsculas o minúsculas, normalizamos a minúscula.
    const userArea = user?.area?.toLowerCase() || '';
    
    return createTheme({
      palette: {
        mode: 'light',
        primary: {
          // Si el área es 'automotor', el color principal es negro, si no, el azul corporativo oscuro.
          main: userArea === 'automotor' ? '#000000' : '#1E293B', // Azul oscuro branding
        },
        secondary: {
          main: '#2563EB', // Azul Vibrante (Acción)
        },
        background: {
          default: '#F1F5F9', // Gris claro
          paper: '#FFFFFF',   // Blanco puro
        },
        text: {
          primary: '#1E293B', // Azul oscuro para texto principal
          secondary: '#64748B', // Gris azulado neutro
        },
        success: {
          main: '#166534', // Verde oscuro texto
          light: '#DCFCE7', // Verde claro fondo
          contrastText: '#fff',
        },
        warning: {
          main: '#D97706', // Ambar
          contrastText: '#fff',
        },
        info: {
          main: '#3B82F6', // Azul info
          contrastText: '#fff',
        },
      },
      typography: {
        fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
        h1: { fontWeight: 700, color: '#1E293B' },
        h5: { fontWeight: 600, color: '#1E293B' },
        h6: { fontWeight: 600, color: '#1E293B' },
        subtitle1: { fontWeight: 500 },
        button: { fontWeight: 600, textTransform: 'none' },
        body1: { fontSize: '1rem' }, // Base size 16px
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              padding: '10px 24px', // Un poco más de padding
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.2)',
              },
            },
            containedPrimary: {
              backgroundColor: '#2563EB',
              '&:hover': {
                backgroundColor: '#1D4ED8',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16, // Bordes más redondeados
              boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid #E2E8F0',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
            rounded: {
              borderRadius: 12,
            }
          },
        },
        MuiTableCell: {
          styleOverrides: {
            head: {
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
            },
            root: {
              borderBottom: '1px solid #F1F3F5',
              padding: '16px',
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              backgroundColor: '#fff',
              '& fieldset': {
                borderColor: '#E2E8F0',
              },
              '&:hover fieldset': {
                borderColor: '#CBD5E1',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#2563EB',
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 500,
              borderRadius: 6,
            },
          },
        },
      },
    });
  }, [user]);

  if (loading) return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppSkeleton />
    </ThemeProvider>
  );

  const mockSession = token ? { access_token: token, user: user } : null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="container">
        {!token ? (
          <Auth onLoginSuccess={handleLoginSuccess} />
        ) : (
          <Dashboard 
              key={user.id} 
              session={mockSession} 
              onLogout={handleLogout}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;