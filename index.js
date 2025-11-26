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
       // Extraer ID de la URL del recurso
       // Ejemplo resource: https://.../payments/123456
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

      console.log("✅ DATOS DEL PAGO:");
      console.log("------------------");
      console.log(`ID: ${paymentDetails.id}`);
      console.log(`Estado: ${paymentDetails.status}`);
      console.log(`Monto: ${paymentDetails.transaction_amount}`);
      console.log(`Desc: ${paymentDetails.description}`);
      console.log("------------------");
    } else {
      // Solo logueamos si no es un evento de pago (para depuración)
      // console.log("ℹ️ Evento recibido sin ID de pago compatible.");
    }

  } catch (error) {
    // Manejo de errores silencioso para no crashear el servidor
    // El error más común al probar es "Payment not found" porque el ID es falso
    console.error("⚠️ Error procesando pago (Posiblemente ID de prueba inválido):", error.message);
  }
});

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});