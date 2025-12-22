const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// 1. Cargar variables de entorno PRIMERO
dotenv.config();

// 2. Importar rutas
const transferenciaRoutes = require('./src/routes/transferenciaRoutes');
const authRoutes = require('./src/routes/authRoutes');
const notificacionRoutes = require('./src/routes/notificacionRoutes');

const app = express();
const port = process.env.PORT || 3000;

// --- MIDDLEWARES BASE ---

// Configuración CORS corregida
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173', // Añadido puerto común de Vite (desarrollo)
  'https://transferencias-mercurio.vercel.app',
  'https://transferencias-mercurio-j4mf.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Si no hay origin (como en apps móviles o Postman) o está en la lista blanca
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error("CORS Blocked Origin:", origin);
      callback(new Error('CORS: El origen de la petición no está permitido.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));



// --- SEGURIDAD ---

// Helmet: Configura cabeceras HTTP seguras
// Se ajusta crossOriginResourcePolicy para evitar conflictos con CORS en algunos navegadores
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones desde esta IP, por favor intente nuevamente en 15 minutos." }
});

app.use(limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// --- RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/', transferenciaRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("🔥 Error no controlado:", err.stack);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${port}`);
});