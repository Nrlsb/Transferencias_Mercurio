const transferenciaService = require('../services/transferenciaService');

const getTransferencias = async (req, res) => {
  try {
    const userId = req.user.id; // Viene del authMiddleware
    const isAdmin = req.user.is_admin === true; // Verificamos rol desde el token
    const filters = req.query;

    const resultados = await transferenciaService.getTransferencias(userId, isAdmin, filters);
    res.status(200).json(resultados);
  } catch (error) {
    // Si es un error de validación de negocio (como el DNI corto), devolvemos 400
    if (error.message.includes('DNI debe tener al menos')) {
        return res.status(400).json({ error: error.message });
    }

    console.error("❌ Error en getTransferencias:", error.message);
    res.status(500).json({ error: "Error interno al procesar la búsqueda." });
  }
};

const claimTransferencia = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // ID de pago

    const result = await transferenciaService.claimTransferencia(id, userId);
    res.status(200).json({ message: "Transferencia reclamada exitosamente", data: result });
  } catch (error) {
    console.error("❌ Error en claimTransferencia:", error.message);
    
    if (error.message.includes('ya ha sido reclamada')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: "No se pudo reclamar la transferencia." });
  }
};

// NUEVO CONTROLADOR PARA ANULAR RECLAMO (SOLO ADMIN)
const unclaimTransferencia = async (req, res) => {
    try {
      // Verificación de seguridad adicional
      if (req.user.is_admin !== true) {
          return res.status(403).json({ error: "Acceso denegado. Solo administradores pueden liberar transferencias." });
      }
  
      const { id } = req.params; // ID de pago
      const result = await transferenciaService.unclaimTransferencia(id);
      
      res.status(200).json({ message: "Transferencia liberada exitosamente", data: result });
    } catch (error) {
      console.error("❌ Error en unclaimTransferencia:", error.message);
      res.status(500).json({ error: "No se pudo liberar la transferencia." });
    }
  };

// NUEVO CONTROLADOR: Confirmación Masiva (Batch)
const confirmBatch = async (req, res) => {
  try {
    // Verificación de seguridad
    if (req.user.is_admin !== true) {
        return res.status(403).json({ error: "Acceso denegado. Solo administradores pueden confirmar transferencias." });
    }
    
    const { ids } = req.body; // Esperamos un array de IDs [123, 456]
    
    if(!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Formato de IDs inválido. Se espera un array." });
    }

    const result = await transferenciaService.confirmBatch(ids);
    res.status(200).json({ message: `${result.length} transferencias confirmadas exitosamente.`, data: result });
  } catch (error) {
    console.error("❌ Error en confirmBatch:", error.message);
    res.status(500).json({ error: "No se pudieron confirmar las transferencias." });
  }
};

module.exports = {
  getTransferencias,
  claimTransferencia,
  unclaimTransferencia,
  confirmBatch
};