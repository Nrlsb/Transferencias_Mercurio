const transferenciaService = require('../services/transferenciaService');

// --- CONTROLADORES MERCADO PAGO ---
const getTransferencias = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.is_admin === true;
    const filters = req.query;
    const resultados = await transferenciaService.getTransferencias(userId, isAdmin, filters);
    res.status(200).json(resultados);
  } catch (error) {
    if (error.message.includes('DNI debe tener al menos')) return res.status(400).json({ error: error.message });
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
    if (error.message.includes('ya ha sido reclamada')) return res.status(409).json({ error: error.message });
    res.status(500).json({ error: "No se pudo reclamar la transferencia." });
  }
};

const unclaimTransferencia = async (req, res) => {
    try {
      if (req.user.is_admin !== true) return res.status(403).json({ error: "Acceso denegado." });
      const { id } = req.params;
      const result = await transferenciaService.unclaimTransferencia(id);
      res.status(200).json({ message: "Transferencia liberada exitosamente", data: result });
    } catch (error) {
      console.error("❌ Error en unclaimTransferencia:", error.message);
      res.status(500).json({ error: "No se pudo liberar la transferencia." });
    }
  };

const confirmBatch = async (req, res) => {
  try {
    if (req.user.is_admin !== true) return res.status(403).json({ error: "Acceso denegado." });
    const { ids } = req.body;
    if(!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Formato de IDs inválido." });
    const result = await transferenciaService.confirmBatch(ids);
    res.status(200).json({ message: `${result.length} transferencias confirmadas.`, data: result });
  } catch (error) {
    console.error("❌ Error en confirmBatch:", error.message);
    res.status(500).json({ error: "No se pudieron confirmar las transferencias." });
  }
};

// --- CONTROLADORES TABLA MANUAL (OTROS BANCOS) ---

const getUsersList = async (req, res) => {
  try {
    if (req.user.is_admin !== true) return res.status(403).json({ error: "Acceso denegado." });
    const users = await transferenciaService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error en getUsersList:", error.message);
    res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

const getManualTransfers = async (req, res) => {
  try {
    if (req.user.is_admin !== true) return res.status(403).json({ error: "Acceso denegado." });
    const result = await transferenciaService.getManualTransfers();
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error en getManualTransfers:", error.message);
    res.status(500).json({ error: "Error al obtener transferencias manuales." });
  }
};

const createManualTransfer = async (req, res) => {
  try {
    if (req.user.is_admin !== true) return res.status(403).json({ error: "Acceso denegado." });
    
    const { id_transaccion, banco, monto, userId } = req.body;

    if (!id_transaccion || !banco || !monto || !userId) {
      return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const result = await transferenciaService.createManualTransfer({ id_transaccion, banco, monto, userId });
    res.status(201).json({ message: "Transferencia manual creada exitosamente.", data: result });

  } catch (error) {
    console.error("❌ Error en createManualTransfer:", error.message);
    if (error.message.includes('duplicate key')) {
        return res.status(409).json({ error: "El ID de transacción ya existe en manuales." });
    }
    res.status(500).json({ error: "Error al crear la transferencia manual." });
  }
};

module.exports = {
  getTransferencias,
  claimTransferencia,
  unclaimTransferencia,
  confirmBatch,
  getUsersList,
  getManualTransfers,
  createManualTransfer
};