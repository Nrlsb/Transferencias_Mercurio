const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// 1. Cargar variables de entorno PRIMERO
dotenv.config();

// 2. Importar rutas DESPUÉS de cargar las variables
const routes = require('./src/routes/transferenciaRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rutas
app.use('/', routes);

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor (Refactorizado) corriendo en http://localhost:${port}`);
});