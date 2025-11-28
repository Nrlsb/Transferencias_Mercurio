const express = require('express');
const router = express.Router();
const transferenciaController = require('../controllers/transferenciaController');
const authMiddleware = require('../../authMiddleware');
const webhookController = require('../controllers/webhookController');

// Rutas API (Protegidas) - MERCADO PAGO
router.get('/api/transferencias', authMiddleware, transferenciaController.getTransferencias);
router.post('/api/transferencias/:id/claim', authMiddleware, transferenciaController.claimTransferencia);

// Rutas Admin (Gestión)
router.post('/api/transferencias/:id/unclaim', authMiddleware, transferenciaController.unclaimTransferencia);
router.post('/api/transferencias/confirm-batch', authMiddleware, transferenciaController.confirmBatch);

// NUEVA RUTA: Registrar Click
router.post('/api/transferencias/:id/click', authMiddleware, transferenciaController.registerClick);

// Rutas Manuales (Admin y User)
router.get('/api/admin/users', authMiddleware, transferenciaController.getUsersList); 
router.get('/api/admin/manual-transfers', authMiddleware, transferenciaController.getManualTransfers); 
router.post('/api/admin/manual-transfers', authMiddleware, transferenciaController.createManualTransfer); 
router.get('/api/manual-transfers/me', authMiddleware, transferenciaController.getMyManualTransfers);

// NUEVA RUTA: Reclamar Manual (Marcar como copiada por el cliente)
router.post('/api/manual-transfers/:id/claim', authMiddleware, transferenciaController.claimManualTransfer);

// Ruta Webhook (Pública)
router.post('/webhook', webhookController.handleWebhook);

// Ruta Raíz
router.get('/', (req, res) => res.send("Servidor Mercurio Activo v2.0"));

module.exports = router;