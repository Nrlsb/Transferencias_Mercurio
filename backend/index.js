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

// --- SEGURIDAD ---

// Helmet: Configura cabeceras HTTP seguras (anti-XSS, anti-sniff, etc.)
app.use(helmet());

// Rate Limiting: Limita peticiones repetidas para prevenir fuerza bruta y DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita a 100 peticiones por IP por ventana
  standardHeaders: true, // Retorna info de rate limit en las cabeceras `RateLimit-*`
  legacyHeaders: false, // Deshabilita las cabeceras `X-RateLimit-*`
  message: { error: "Demasiadas peticiones desde esta IP, por favor intente nuevamente en 15 minutos." }
});

// Aplicar rate limiting globalmente (o podrías aplicarlo solo a /api/auth)
app.use(limiter);

// --- MIDDLEWARES BASE ---

// Configuración CORS más segura
// Configuración CORS más segura
const allowedOrigins = [
  process.env.FRONTEND_URL, // Tu URL de Vercel (definida en .env)
  'http://localhost:3000',     // O el puerto que uses para desarrollo local
  'https://transferencias-mercurio.vercel.app',
  'https://transferencias-mercurio.onrender.com' // Self-reference sometimes helps
].filter(Boolean); // Filtra valores no definidos

app.use(cors({
  origin: function (origin, callback) {
    // Permite peticiones sin origin (como Postman) y las de la lista
    console.log("Origin request:", origin); // LOG PARA DEBUGGING
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("CORS Blocked Origin:", origin);
      callback(new Error('CORS: El origen de la petición no está permitido.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true // Permite el envío de cookies y cabeceras de autorización
}));

app.use(express.json({ limit: '10kb' })); // Limita el tamaño del body para prevenir ataques de payload grande
app.use(express.urlencoded({ extended: false }));

// --- RUTAS ---
app.use('/api/auth', authRoutes); // Nuevas rutas de auth
app.use('/api/notificaciones', notificacionRoutes); // Nuevas rutas de notificaciones
app.use('/', transferenciaRoutes);

// Manejo de errores global (Evita filtrar stack traces al cliente)
app.use((err, req, res, next) => {
  console.error("🔥 Error no controlado:", err.stack);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});