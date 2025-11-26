const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// 1. Cargar variables de entorno PRIMERO
dotenv.config();

// 2. Importar rutas
const transferenciaRoutes = require('./src/routes/transferenciaRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rutas
app.use('/api/auth', authRoutes); // Nuevas rutas de auth
app.use('/', transferenciaRoutes);

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});