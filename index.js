const express = require("express");
const { MercadoPagoConfig, Payment } = require("mercadopago");
const dotenv = require("dotenv");

// Carga las variables de entorno
dotenv.config();

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const payment = new Payment(client);

const app = express();
const port = 3000;

// Middlewares necesarios para recibir datos
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Servidor de webhooks activo.");
});

// Ruta del Webhook
app.post("/webhook", async (req, res) => {
  // Respondemos 200 OK inmediatamente para evitar timeouts
  res.sendStatus(200);

  try {
    const body = req.body || {};
    const query = req.query || {};
    
    let paymentId;
    let source = "";

    // 1. Detección Webhook V2 (Standard)
    if (body.type === "payment" && body.data && body.data.id) {
      paymentId = body.data.id;
      source = "Webhook V2";
    }
    // 2. Detección IPN / Botón Probar (Query Params)
    else if (query.topic === "payment" && query.id) {
      paymentId = query.id;
      source = "IPN (Query)";
    }
    // 3. Detección IPN Legacy (Topic en Body)
    else if (body.topic === "payment" && body.resource) {
       const parts = body.resource.split("/");
       paymentId = parts[parts.length - 1];
       source = "IPN (Body)";
    }

    if (paymentId) {
      console.log(`🔔 Notificación recibida (${source}). ID Pago: ${paymentId}`);
      
      // Pausa técnica para consistencia de datos (3s)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`🔍 Consultando API para pago ${paymentId}...`);
      
      const paymentDetails = await payment.get({ id: paymentId });

      console.log("✅ DATOS COMPLETOS DEL PAGO:");
      console.log("=========================================");
      console.log(`🆔 ID Transacción:   ${paymentDetails.id}`);
      console.log(`📅 Fecha Aprobado:   ${paymentDetails.date_approved}`);
      console.log(`📊 Estado:           ${paymentDetails.status} (${paymentDetails.status_detail})`);
      console.log(`💰 Monto Bruto:      $${paymentDetails.transaction_amount} ${paymentDetails.currency_id}`);
      
      // Detalles financieros (útil para ver comisiones y neto recibido)
      if (paymentDetails.transaction_details) {
        console.log(`wm Monto Neto:       $${paymentDetails.transaction_details.net_received_amount}`);
        console.log(`📉 Comisión MP:      $${paymentDetails.fee_details && paymentDetails.fee_details.length > 0 ? paymentDetails.fee_details[0].amount : 0}`);
      }

      console.log(`💳 Método de Pago:   ${paymentDetails.payment_method_id} (${paymentDetails.payment_type_id})`);
      console.log(`📝 Descripción:      ${paymentDetails.description}`);
      
      // Información del Pagador
      if (paymentDetails.payer) {
        console.log("-----------------------------------------");
        console.log("👤 INFORMACIÓN DEL PAGADOR:");
        console.log(`   - Email:          ${paymentDetails.payer.email}`);
        console.log(`   - ID Usuario MP:  ${paymentDetails.payer.id}`);
        // Identificación (DNI/CUIT) a veces viene null en transferencias simples
        if (paymentDetails.payer.identification) {
            console.log(`   - Documento:      ${paymentDetails.payer.identification.type} ${paymentDetails.payer.identification.number}`);
        }
      }

      // Referencia Externa (útil para unir con tu base de datos propia)
      if (paymentDetails.external_reference) {
        console.log(`🔗 Ref. Externa:     ${paymentDetails.external_reference}`);
      }
      
      console.log("=========================================");

    } else {
      // console.log("ℹ️ Evento recibido sin ID de pago compatible.");
    }

  } catch (error) {
    console.error("⚠️ Error procesando pago:", error.message);
  }
});

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});