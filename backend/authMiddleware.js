const jwt = require('jsonwebtoken');

// Usamos la misma clave secreta definida (o importada de .env)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambialo_en_env';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Validamos nuestro JWT propio
    const decoded = jwt.verify(token, JWT_SECRET);

    // Adjuntamos el usuario decodificado a la request
    // Esto asegura que transferenciaController siga funcionando con req.user.id
    req.user = decoded; 
    
    // console.log(`👤 Usuario autenticado (Custom Auth): ${decoded.email}`);
    next();
  } catch (error) {
    console.error('Error de token:', error.message);
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

module.exports = authMiddleware;