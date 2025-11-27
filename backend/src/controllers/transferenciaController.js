const transferenciaService = require('../services/transferenciaService');

const getTransferencias = async (req, res) => {
  try {
    const userId = req.user.id; 
    const isAdmin = req.user.is_admin === true; 
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
    const { id } = req.params; 

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

const unclaimTransferencia = async (req, res) => {
    try {
      if (req.user.is_admin !== true) {
          return res.status(403).json({ error: "Acceso denegado. Solo administradores pueden liberar transferencias." });
      }
      const { id } = req.params; 
      const result = await transferenciaService.unclaimTransferencia(id);
      res.status(200).json({ message: "Transferencia liberada exitosamente", data: result });
    } catch (error) {
      console.error("❌ Error en unclaimTransferencia:", error.message);
      res.status(500).json({ error: "No se pudo liberar la transferencia." });
    }
  };

// --- NUEVO CONTROLADOR ---
const getTitularRealMP = async (req, res) => {
    try {
        // Obtenemos el ID de la URL
        const { id } = req.params; 
        
        // Llamamos al servicio que consulta en vivo a MP
        const infoTitular = await transferenciaService.consultarTitularReal(id);
        
        res.status(200).json(infoTitular);
    } catch (error) {
        console.error("❌ Error obteniendo titular real:", error.message);
        res.status(500).json({ error: error.message || "Error al consultar titular en Mercado Pago" });
    }
};

module.exports = {
  getTransferencias,
  claimTransferencia,
  unclaimTransferencia,
  getTitularRealMP // Exportamos el nuevo método
};