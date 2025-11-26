const transferenciaService = require('../services/transferenciaService');

const getTransferencias = async (req, res) => {
  try {
    const userId = req.user.id; // Viene del authMiddleware
    const filters = req.query;

    const resultados = await transferenciaService.getTransferencias(userId, filters);
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

module.exports = {
  getTransferencias,
  claimTransferencia
};