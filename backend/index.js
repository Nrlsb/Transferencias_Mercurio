const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require('./src/routes/transferenciaRoutes');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rutas (Delegamos todo al archivo de rutas principal)
app.use('/', routes);

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor (Refactorizado) corriendo en http://localhost:${port}`);
});