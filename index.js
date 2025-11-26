
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

// 2. Crea una instancia del servicio de Pagos, pasándole el cliente
const payment = new Payment(client);

// Crea la aplicación Express
const app = express();
const port = 3000;

// Middleware para que Express pueda interpretar el cuerpo de las solicitudes como JSON
app.use(express.json());

// Endpoint raíz para verificar que el servidor funciona
app.get("/", (req, res) => {
    res.send("El servidor de webhooks para Mercado Pago está funcionando (código corregido).");
});

// Define la ruta del webhook que recibirá las notificaciones
app.post("/webhook", (req, res) => {
  console.log("🔔 ¡Webhook de Mercado Pago recibido!");

  const notification = req.body;

  // Verificamos si la notificación es de un pago
  if (notification.type === "payment") {
    const paymentId = notification.data.id;
    console.log(`💡 ID de pago extraído: ${paymentId}. Añadiendo una pausa de 3 segundos.`);

    // Añadimos un retraso para darle tiempo a la API de procesar el pago completamente.
    setTimeout(() => {
      console.log(`⏳ Consultando ahora los detalles para el pago ${paymentId}...`);
      
      // Usamos el nuevo SDK para buscar los detalles del pago
      payment.get({ id: paymentId })
        .then(paymentDetails => {
          console.log("✅ Detalles del pago obtenidos:");
          console.log("---------------------------------");
          console.log(`- ID: ${paymentDetails.id}`);
          console.log(`- Estado: ${paymentDetails.status}`);
          console.log(`- Monto: ${paymentDetails.transaction_amount}`);
          console.log(`- Descripción: ${paymentDetails.description}`);
          console.log(`- Email del pagador: ${paymentDetails.payer.email}`);
          console.log("---------------------------------");
        })
        .catch(error => {
          console.error("❌ Error al buscar los detalles del pago:", error);
        });
    }, 3000); // 3000 milisegundos = 3 segundos de espera
  }

  // Respondemos a Mercado Pago con un status 200 OK para confirmar la recepción
  res.sendStatus(200);
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
});
