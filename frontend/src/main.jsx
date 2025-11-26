import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx'
import './index.css'

// Creamos un tema CLARO (Light Mode) para imitar la Imagen 2
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Azul estándar tipo "Agregar" de la imagen
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f5f5f5', // Fondo gris muy suave para la app
      paper: '#ffffff',   // Fondo blanco puro para las tablas/tarjetas
    },
    text: {
      primary: '#2c3e50', // Un gris oscuro/azulado profesional
      secondary: '#546e7a',
    },
  },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 600, color: '#0d47a1' },
    h6: { fontWeight: 700, color: '#2c3e50' }, // Para títulos de secciones
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Botones con texto normal (No mayúsculas forzadas)
          borderRadius: 20,      // Bordes redondeados tipo "píldora" como en la imagen
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#909497', // Color grisáceo para encabezados de tabla
          textTransform: 'uppercase',
          fontSize: '0.75rem',
        },
        root: {
          borderBottom: '1px solid #e0e0e0', // Bordes sutiles
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