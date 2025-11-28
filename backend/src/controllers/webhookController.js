const { MercadoPagoConfig, Payment } = require("mercadopago");
const transferenciaService = require("../services/transferenciaService");
const config = require("../config/config"); // Importamos configuración centralizada

// Inicializamos cliente con el token validado
const client = new MercadoPagoConfig({
  accessToken: config.mercadoPago.accessToken,
});
const payment = new Payment(client);

const handleWebhook = async (req, res) => {
  // Respondemos 200 OK inmediatamente para que Mercado Pago sepa que recibimos el aviso
  res.sendStatus(200); 

  try {
    const body = req.body || {};
    const query = req.query || {};
    
    // LOG 1: Ver qué nos está mandando el IPN o Webhook
    console.log("🔔 [IPN/Webhook] Notificación entrante:");
    console.log("   👉 Query Params (IPN usa esto):", JSON.stringify(query, null, 2));
    console.log("   👉 Body (Webhook V2 usa esto):", JSON.stringify(body, null, 2));

    let paymentId;
    let source = "";

    // Lógica para detectar si es Webhook V2 o IPN
    if (body.type === "payment" && body.data?.id) {
      paymentId = body.data.id;
      source = "Webhook V2";
    } else if (query.topic === "payment" && query.id) {
      paymentId = query.id;
      source = "IPN (Query)";
    } else if (body.topic === "payment" && body.resource) {
       // A veces IPN manda en body resource: '/v1/payments/123'
       const parts = body.resource.split("/");
       paymentId = parts[parts.length - 1];
       source = "IPN (Body)";
    }

    if (paymentId) {
      console.log(`🚀 Procesando ID: ${paymentId} (Fuente: ${source})`);
      
      // Esperamos 3 segundos para dar tiempo a MP a replicar datos en sus bases
      // Esto es crucial para intentar capturar el nombre si viene con delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`🔎 Consultando API de Mercado Pago para ID: ${paymentId}...`);
      
      // Consultamos la API para obtener el objeto completo
      const paymentDetails = await payment.get({ id: paymentId });
      
      // LOG 2: AQUÍ VEMOS LA VERDAD. 
      // Este log te mostrará el JSON completo que MP nos devuelve.
      // Busca aquí "payer", "first_name", "last_name" o "bank_info".
      console.log("📦 [API RESPONSE] Datos completos del pago:");
      console.log(JSON.stringify(paymentDetails, null, 2));
      
      console.log(`💾 Guardando/Actualizando pago en base de datos...`);
      await transferenciaService.createTransferenciaFromWebhook(paymentDetails);
      console.log("✅ Pago procesado exitosamente.");
    } else {
        console.log("⚠️ Se recibió una notificación pero no se pudo extraer un ID de pago válido.");
    }
  } catch (error) {
    console.error("❌ Error procesando webhook:", error.message);
    if (error.response) {
        console.error("   Detalle API MP:", JSON.stringify(error.response.data, null, 2));
    }
  }
};

module.exports = { handleWebhook };