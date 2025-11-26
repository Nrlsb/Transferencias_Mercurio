const express = require("express");
// Se importan las clases específicas del nuevo SDK
const { MercadoPagoConfig, Payment } = require("mercadopago");
const dotenv = require("dotenv");

// Carga las variables de entorno del archivo .env
dotenv.config();

// 1. Inicializa el cliente de Mercado Pago con el Access Token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// 2. Crea una instancia del servicio de Pagos
const payment = new Payment(client);

// Crea la aplicación Express
const app = express();
const port = 3000;

// Middleware para procesar JSON (Webhooks nuevos)
app.use(express.json());
// Middleware para procesar datos de formulario/URL (IPN y botón "Probar")
app.use(express.urlencoded({ extended: false }));

// Endpoint raíz
app.get("/", (req, res) => {
    res.send("El servidor de webhooks está funcionando y listo para recibir pagos.");
});

// Endpoint del Webhook
app.post("/webhook", async (req, res) => {
  // 1. Responder SIEMPRE con 200 OK rápidamente.
  // Esto evita que Mercado Pago marque el envío como fallido por timeout (especialmente en Render free tier).
  res.sendStatus(200);

  console.log("🔔 ¡Notificación recibida!");

  try {
    // Capturamos datos de ambas fuentes posibles
    const body = req.body || {};
    const query = req.query || {};

    let paymentId;
    let source = '';

    // ESTRATEGIA DE DETECCIÓN:

    // Caso 1: Webhook V2 (El estándar actual para pagos)
    // Suele venir en el body con { type: "payment", data: { id: "..." } }
    if (body.type === "payment" && body.data && body.data.id) {
        paymentId = body.data.id;
        source = 'Webhook V2';
    } 
    // Caso 2: IPN o Botón "Probar" (Query Params)
    // Suele venir en la URL: ?topic=payment&id=12345
    else if (query.topic === "payment" && query.id) {
        paymentId = query.id;
        source = 'IPN (Query)';
    }
    // Caso 3: IPN Legacy en Body
    else if (body.topic === "payment" && body.resource) {
        // A veces el ID viene dentro de una URL en 'resource'
        // Ejemplo: https://api.mercadolibre.com/collections/notifications/123456
        const parts = body.resource.split('/');
        paymentId = parts[parts.length - 1];
        source = 'IPN (Legacy Body)';
    }

    // Si encontramos un ID de pago, procedemos
    if (paymentId) {
        console.log(`👉 Origen detectado: ${source}`);
        console.log(`💡 ID de pago capturado: ${paymentId}`);
        console.log("⏳ Esperando 3 segundos para asegurar consistencia en MP...");

        // Pausa de 3 segundos (Sleep)
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(`🔍 Consultando API de Mercado Pago para el ID: ${paymentId}...`);

        // Consultamos la API oficial
        const paymentDetails = await payment.get({ id: paymentId });

        console.log("✅ ¡DETALLES DEL PAGO OBTENIDOS!");
        console.log("---------------------------------");
        console.log(`🆔 ID Transacción: ${paymentDetails.id}`);
        console.log(`📊 Estado: ${paymentDetails.status} (${paymentDetails.status_detail})`);
        console.log(`💰 Monto: $${paymentDetails.transaction_amount}`);
        console.log(`📝 Descripción: ${paymentDetails.description}`);
        
        if (paymentDetails.payer) {
            console.log(`👤 Pagador: ${paymentDetails.payer.email}`);
        }
        
        if (paymentDetails.payment_method) {
            console.log(`💳 Método: ${paymentDetails.payment_method_id} (${paymentDetails.payment_type_id})`);
        }
        console.log("---------------------------------");

    } else {
        // Si llega algo que no es un pago, lo mostramos en logs para depurar
        console.log("⚠️ Notificación recibida pero NO se detectó un ID de pago válido.");
        console.log("Body recibido:", JSON.stringify(body));
        console.log("Query recibido:", JSON.stringify(query));
    }

  } catch (error) {
    console.error("❌ Error procesando la notificación:", error.message);
    // Nota: Aunque falle el procesamiento interno, ya respondimos 200 OK a Mercado Pago.
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
});