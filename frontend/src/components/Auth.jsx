import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Card,
  CardContent,
  Alert,
  FormControlLabel,
  Checkbox,
  Link
} from '@mui/material';

import espintLogo from '../assets/espintBlanco.svg';
import casaPintorLogo from '../assets/casaDelPintorBlanco.svg';
import automotorLogo from '../assets/automotorBlanco.svg';

// Recibimos la función setToken desde App.jsx para actualizar el estado global
export default function Auth({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Al cargar el componente, revisamos si hay un email guardado
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    // Si "Recordar contraseña" está marcado, guardamos el email. Si no, lo eliminamos.
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    const endpoint = '/api/auth/login';
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la operación');
      }

      onLoginSuccess(data.token, data.user);

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main', // Fondo Azul Marino
        p: 2,
        backgroundImage: 'linear-gradient(135deg, #183050 0%, #102035 100%)' // Sutil gradiente
      }}
    >
      <Container component="main" maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Logos Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
          mb: 4,
          opacity: 0.8
        }}>
          <Box component="img" src={espintLogo} alt="Espint" sx={{ height: 30 }} />
          <Box component="img" src={casaPintorLogo} alt="Casa del Pintor" sx={{ height: 30 }} />
          <Box component="img" src={automotorLogo} alt="Automotor" sx={{ height: 30 }} />
        </Box>

        <Card sx={{ width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', borderRadius: 4 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 4 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography component="h1" variant="h4" fontWeight="800" color="primary" gutterBottom sx={{ letterSpacing: '-0.5px' }}>
                Mercurio
              </Typography>
              <Typography component="h2" variant="subtitle1" color="text.secondary" fontWeight="500">
                Gestión de Transferencias
              </Typography>
            </Box>

            {message.text && (
              <Alert severity={message.type === 'error' ? 'error' : 'success'}>
                {message.text}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Correo Electrónico"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Contraseña"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <FormControlLabel
                  control={<Checkbox value="remember" color="primary" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
                  label="Recordar contraseña"
                />

              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, borderRadius: 2 }}
                disabled={loading}
              >
                {loading ? 'Iniciando...' : 'Ingresar al Sistema'}
              </Button>

            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}