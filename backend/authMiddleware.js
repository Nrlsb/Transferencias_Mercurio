const { createClient } = require('@supabase/supabase-js');

// El cliente de Supabase se inicializa aquí para que el middleware sea autocontenido.
// Las variables de entorno ya están cargadas por 'dotenv' en index.js cuando se usa este middleware.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const authMiddleware = async (req, res, next) => {
  // Extraer el token del encabezado 'Authorization'
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado: no se proporcionó un token válido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Validar el token usando Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Error de autenticación, token inválido o expirado:', error?.message);
      return res.status(403).json({ error: 'Acceso prohibido: el token es inválido o ha expirado.' });
    }

    // Si el token es válido, adjuntamos el usuario al objeto de solicitud
    req.user = user;
    console.log(`👤 Usuario autenticado: ${user.email}`);

    // Continuar a la siguiente función en la cadena (la ruta protegida)
    next();
  } catch (error) {
    console.error('Error inesperado en el middleware de autenticación:', error);
    res.status(500).json({ error: 'Error interno del servidor durante la autenticación.' });
  }
};

module.exports = authMiddleware;
