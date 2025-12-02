import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx'
import './index.css'

// Creamos el tema "Corporativo Moderno" para Mercurio
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e3773', // Azul Marino Oscuro (Brand)
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
          borderRadius: 8, // Bordes redondeados modernos (no píldora exagerada)
          padding: '8px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
          },
        },
        containedPrimary: {
          backgroundColor: '#007BFF', // Botones de acción principal en azul vibrante
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
          boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', // Sombra suave
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
          backgroundColor: '#fff', // Cabecera blanca limpia
        },
        root: {
          borderBottom: '1px solid #f1f3f5', // Bordes muy sutiles
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)