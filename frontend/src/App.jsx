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
          // Si el área es 'automotor', el color principal es negro, si no, el azul corporativo.
          main: userArea === 'automotor' ? '#000000' : '#1e3773',
        },
        secondary: {
          main: '#007BFF', // Azul Vibrante (Acción)
        },
        background: {
          default: '#F4F6F9', // Gris azulado muy claro
          paper: '#FFFFFF',   // Blanco puro
        },
        text: {
          primary: '#183050', // Azul oscuro para texto principal
          secondary: '#6c757d', // Gris neutro para secundario
        },
        success: {
          main: '#8CC63F', // Verde Lima (Aprobado)
          contrastText: '#fff',
        },
        warning: {
          main: '#FFC20E', // Amarillo (Alerta)
          contrastText: '#183050',
        },
        info: {
          main: '#C6007E', // Magenta (Pendiente/Reclamo)
          contrastText: '#fff',
        },
      },
      typography: {
        fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
        h1: { fontWeight: 700, color: '#183050' },
        h5: { fontWeight: 600, color: '#183050' },
        h6: { fontWeight: 600, color: '#183050' },
        subtitle1: { fontWeight: 500 },
        button: { fontWeight: 600, textTransform: 'none' },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              padding: '8px 24px',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
              },
            },
            containedPrimary: {
              backgroundColor: '#007BFF',
              '&:hover': {
                backgroundColor: '#0056b3',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
              border: 'none',
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
              color: '#6c757d',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#fff',
            },
            root: {
              borderBottom: '1px solid #f1f3f5',
              padding: '16px',
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              backgroundColor: '#fff',
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