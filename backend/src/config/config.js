const dotenv = require('dotenv');

// Cargar variables de entorno desde el archivo .env
dotenv.config();

/**
 * Función auxiliar para validar que una variable de entorno exista.
 * Si no existe, lanza un error y detiene la ejecución (Fail Fast).
 */
const getEnvVariable = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Error Fatal: La variable de entorno ${key} no está definida.`);
    process.exit(1); // Detenemos la aplicación inmediatamente
  }
  return value;
};

// Exportamos un objeto con todas las configuraciones validadas
const config = {
  port: process.env.PORT || 3000,
  jwtSecret: getEnvVariable('JWT_SECRET'),
  supabase: {
    url: getEnvVariable('SUPABASE_URL'),
    serviceKey: getEnvVariable('SUPABASE_SERVICE_KEY'), // Usamos service key para el backend (admin)
  },
  mercadoPago: {
    accessToken: getEnvVariable('MERCADOPAGO_ACCESS_TOKEN'),
  },
  frontendUrl: process.env.FRONTEND_URL || '*', // Opcional, con valor por defecto seguro
};

module.exports = config;