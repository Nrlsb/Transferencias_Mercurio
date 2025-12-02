const transferenciaService = require('../services/transferenciaService');

const getNotificaciones = async (req, res) => {
  try {
    // Solo los usuarios no-administradores deben tener notificaciones de este tipo.
    if (req.user.is_admin === true) {
      return res.status(200).json([]); // Devolver un array vacío para admins.
    }

    const userId = req.user.id;
    // Reutilizamos el servicio existente para buscar transferencias manuales
    // asignadas al usuario que todavía no han sido reclamadas (son "nuevas" para él).
    const notificaciones = await transferenciaService.getManualTransfersByUserId(userId, true);
    
    res.status(200).json(notificaciones);
  } catch (error) {
    console.error("❌ Error en getNotificaciones:", error.message);
    res.status(500).json({ error: "Error interno al obtener las notificaciones." });
  }
};

module.exports = {
  getNotificaciones,
};
