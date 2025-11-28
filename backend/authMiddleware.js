const jwt = require('jsonwebtoken');
const config = require('./src/config/config'); // Importamos la configuración centralizada

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acceso no autorizado: Formato de token inválido (Bearer requerido).' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado.' });
    }

    // Validamos usando el secreto validado desde config
    const decoded = jwt.verify(token, config.jwtSecret);

    // Adjuntamos el usuario decodificado a la request
    // Esto asegura que transferenciaController siga funcionando con req.user.id
    req.user = decoded; 
    
    // console.log(`👤 Usuario autenticado (Custom Auth): ${decoded.email}`);
    next();
  } catch (error) {
    // Diferenciamos errores para mejor depuración (sin exponer detalles sensibles al cliente si no se desea)
    if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Sesión expirada. Por favor inicie sesión nuevamente.' });
    } else if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Token inválido.' });
    }

    console.error('Error de autenticación desconocido:', error.message);
    return res.status(500).json({ error: 'Error al procesar la autenticación.' });
  }
};

module.exports = authMiddleware;