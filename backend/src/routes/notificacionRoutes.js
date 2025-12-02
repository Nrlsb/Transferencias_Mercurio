const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const authMiddleware = require('../../authMiddleware');

// Ruta para que los usuarios no-admin obtengan sus notificaciones de transferencias manuales nuevas.
// Está protegida y solo el usuario autenticado puede ver sus propias notificaciones.
router.get('/', authMiddleware, notificacionController.getNotificaciones);

module.exports = router;
