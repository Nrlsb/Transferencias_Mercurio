const transferenciaService = require('../services/transferenciaService');
const { MercadoPagoConfig, Payment } = require("mercadopago");
const dotenv = require("dotenv");

dotenv.config();

// Configuración del cliente MP (Igual que en webhookController)
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const payment = new Payment(client);

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

// NUEVO: Sincronización Manual con Mercado Pago
const syncTransferencia = async (req, res) => {
  try {
    // 1. Verificamos permisos (Opcional: podrías dejar que cualquiera sincronice, pero mejor admin)
    if (req.user.is_admin !== true) {
        return res.status(403).json({ error: "Acceso denegado. Solo admins pueden sincronizar datos." });
    }

    const { id } = req.params; // ID del pago MP

    console.log(`🔄 Sincronizando pago ${id} manualmente...`);

    // 2. Consultamos a Mercado Pago "en vivo"
    const paymentDetails = await payment.get({ id });

    // 3. Usamos el servicio existente para guardar/actualizar los datos
    await transferenciaService.createTransferenciaFromWebhook(paymentDetails);

    console.log(`✅ Pago ${id} sincronizado correctamente.`);
    
    // 4. Devolvemos éxito
    res.status(200).json({ message: "Datos actualizados desde Mercado Pago", data: paymentDetails });

  } catch (error) {
    console.error("❌ Error en syncTransferencia:", error.message);
    res.status(500).json({ error: "Error al sincronizar con Mercado Pago." });
  }
};

module.exports = {
  getTransferencias,
  claimTransferencia,
  unclaimTransferencia,
  syncTransferencia // Exportamos la nueva función
};