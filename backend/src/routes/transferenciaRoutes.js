const express = require('express');
const router = express.Router();
const transferenciaController = require('../controllers/transferenciaController');
const authMiddleware = require('../../authMiddleware');
const webhookController = require('../controllers/webhookController');

// Rutas API (Protegidas)
router.get('/api/transferencias', authMiddleware, transferenciaController.getTransferencias);
router.post('/api/transferencias/:id/claim', authMiddleware, transferenciaController.claimTransferencia);

// Rutas Admin
router.post('/api/transferencias/:id/unclaim', authMiddleware, transferenciaController.unclaimTransferencia);
router.put('/api/transferencias/:id/confirm', authMiddleware, transferenciaController.toggleConfirmacion); // Nueva ruta

// Ruta Webhook (Pública)
router.post('/webhook', webhookController.handleWebhook);

// Ruta Raíz
router.get('/', (req, res) => res.send("Servidor Mercurio Activo v2.0"));

module.exports = router;