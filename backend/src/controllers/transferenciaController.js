const transferenciaService = require('../services/transferenciaService');

const getTransferencias = async (req, res) => {
  try {
    const userId = req.user.id; // Viene del authMiddleware
    const isAdmin = req.user.is_admin === true; // Verificamos rol desde el token
    const filters = req.query;

    const resultados = await transferenciaService.getTransferencias(userId, isAdmin, filters);
    res.status(200).json(resultados);
  } catch (error) {
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

// NUEVO: Alternar confirmación (Checkbox Admin)
const toggleConfirmacion = async (req, res) => {
  try {
    if (req.user.is_admin !== true) {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    const { id } = req.params;
    const { confirmed } = req.body; // Esperamos { confirmed: true/false }

    const result = await transferenciaService.toggleConfirmacion(id, confirmed);
    res.status(200).json({ message: "Estado de confirmación actualizado", data: result });
  } catch (error) {
    console.error("❌ Error en toggleConfirmacion:", error.message);
    res.status(500).json({ error: "No se pudo actualizar la confirmación." });
  }
};

const unclaimTransferencia = async (req, res) => {
    try {
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

module.exports = {
  getTransferencias,
  claimTransferencia,
  unclaimTransferencia,
  toggleConfirmacion
};