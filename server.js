// 1. IMPORTAR DEPENDENCIAS
const express = require('express');
const cors = require('cors');

// 2. INICIALIZAR EXPRESS Y CONFIGURAR CORS
const app = express();
app.use(express.json()); // Middleware para que Express entienda JSON

// Configuración de CORS: permite que solo tu app local de React se conecte.
// ¡IMPORTANTE! Cuando subas tu app de React a un dominio, deberás añadirlo aquí.
const allowedOrigins = [
  'http://localhost:5173', // Para tu desarrollo local
  // 'https://tu-app.onrender.com' // <-- Añade aquí la URL de tu app de React cuando la despliegues
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite peticiones sin origen (como las de Postman o n8n) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};
app.use(cors(corsOptions));


// 3. ALMACENAMIENTO EN MEMORIA PARA CLIENTES CONECTADOS
// Guardaremos aquí las conexiones abiertas de cada usuario.
// La clave es el `userId` y el valor es la respuesta (res) del navegador.
// Nota: Para una app a gran escala, se usaría una base de datos como Redis.
let clients = {};

// 4. ENDPOINT PARA QUE REACT SE CONECTE (SSE)
app.get('/events', (req, res) => {
  // Configurar las cabeceras para una conexión SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Enviar las cabeceras inmediatamente

  // Obtener el ID del usuario desde la URL (ej: /events?userId=abc)
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).send('userId es requerido');
  }

  // Guardar la conexión del cliente para poder enviarle mensajes después
  clients[userId] = res;
  console.log(`Cliente conectado: ${userId}`);

  // Enviar un comentario inicial para mantener la conexión abierta
  res.write(':ok\n\n');

  // Limpiar la conexión cuando el cliente se desconecte
  req.on('close', () => {
    console.log(`Cliente desconectado: ${userId}`);
    delete clients[userId]; // Eliminar al cliente de la lista
  });
});


// 5. ENDPOINT PARA QUE N8N ENVÍE LAS NOTIFICACIONES
app.post('/notify', (req, res) => {
  // Obtener los datos que envía n8n
  const { userId, videoUrl } = req.body;

  if (!userId || !videoUrl) {
    return res.status(400).send('userId y videoUrl son requeridos');
  }

  console.log(`Notificación recibida para ${userId} con URL: ${videoUrl}`);

  // Buscar al cliente conectado que corresponde a ese userId
  const client = clients[userId];

  if (client) {
    // Si el cliente está conectado, le enviamos los datos
    // El formato "data: ...\n\n" es parte del protocolo SSE
    client.write(`data: ${JSON.stringify({ videoUrl })}\n\n`);
    console.log(`Notificación enviada a ${userId}`);
    // Respondemos a n8n que todo salió bien
    res.status(200).send({ message: 'Notificación enviada' });
  } else {
    // Si el cliente ya no está conectado
    console.log(`Cliente ${userId} no encontrado.`);
    res.status(404).send({ message: 'Cliente no encontrado' });
  }
});


// 6. INICIAR EL SERVIDOR
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor de notificaciones corriendo en http://localhost:${PORT}`);
});