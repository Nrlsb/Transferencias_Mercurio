const { MercadoPagoConfig, Payment } = require("mercadopago");
const transferenciaService = require("../services/transferenciaService");
const dotenv = require("dotenv");

dotenv.config();

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const payment = new Payment(client);

const handleWebhook = async (req, res) => {
  res.sendStatus(200); // Fast ACK

  try {
    const body = req.body || {};
    const query = req.query || {};
    
    let paymentId;
    let source = "";

    if (body.type === "payment" && body.data?.id) {
      paymentId = body.data.id;
      source = "Webhook V2";
    } else if (query.topic === "payment" && query.id) {
      paymentId = query.id;
      source = "IPN (Query)";
    } else if (body.topic === "payment" && body.resource) {
       const parts = body.resource.split("/");
       paymentId = parts[parts.length - 1];
       source = "IPN (Body)";
    }

    if (paymentId) {
      console.log(`🔔 Webhook recibido (${source}). ID: ${paymentId}`);
      
      // Pequeño delay para asegurar consistencia en MP
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const paymentDetails = await payment.get({ id: paymentId });
      
      console.log(`💾 Guardando pago ${paymentDetails.id}...`);
      await transferenciaService.createTransferenciaFromWebhook(paymentDetails);
      console.log("✅ Pago guardado exitosamente.");
    }
  } catch (error) {
    console.error("⚠️ Error procesando webhook:", error.message);
  }
};

module.exports = { handleWebhook };