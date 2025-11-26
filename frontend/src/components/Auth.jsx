import { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Card, 
  CardContent, 
  Alert 
} from '@mui/material';

// Recibimos la función setToken desde App.jsx para actualizar el estado global
export default function Auth({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
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

      if (isRegistering) {
        // Si es registro exitoso, logueamos automáticamente
        setMessage({ type: 'success', text: 'Registro exitoso. Iniciando sesión...' });
        onLoginSuccess(data.token, data.user);
      } else {
        // Login normal
        onLoginSuccess(data.token, data.user);
      }

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
        bgcolor: 'background.default',
        p: 2 
      }}
    >
      <Container component="main" maxWidth="xs">
        <Card sx={{ width: '100%', boxShadow: 4, borderRadius: 2 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 4 }}>
            <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography component="h1" variant="h5" fontWeight="bold" color="primary" gutterBottom>
                Mercurio Transferencias
                </Typography>
                <Typography component="p" variant="body2" color="text.secondary">
                {isRegistering ? 'Crea una cuenta nueva' : 'Inicia sesión para continuar'}
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
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, borderRadius: 2 }}
                disabled={loading}
              >
                {loading ? 'Cargando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
              </Button>

              <Button
                type="button"
                fullWidth
                variant="text"
                onClick={() => {
                    setIsRegistering(!isRegistering);
                    setMessage({ type: '', text: '' });
                }}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}