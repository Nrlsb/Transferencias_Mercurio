import { useState } from 'react';
import { supabase } from '../supabaseClient';
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

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // El listener en App.jsx manejará la redirección
    } catch (error) {
      setMessage({ type: 'error', text: error.error_description || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage({ type: 'success', text: '¡Registro exitoso! Revisa tu correo para verificar tu cuenta.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.error_description || error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 4 }}>
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Mercurio Transferencias
            </Typography>
            <Typography component="p" variant="body2" align="center" color="text.secondary">
              Inicia sesión o regístrate para continuar
            </Typography>

            {message.text && (
              <Alert severity={message.type === 'error' ? 'error' : 'success'}>
                {message.text}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
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
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </Button>

              <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={handleSignUp}
                disabled={loading}
              >
                Registrarse
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}