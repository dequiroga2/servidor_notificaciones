// 1. IMPORTAR DEPENDENCIAS
const express = require('express');
const cors = require('cors');
// ✅ NUEVO: Importar Firebase Admin SDK
const admin = require('firebase-admin');

// ✅ NUEVO: Cargar las credenciales de Firebase
const serviceAccount = require('./firebase-credentials.json');

// ✅ NUEVO: Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// 2. INICIALIZAR EXPRESS Y CONFIGURAR CORS
const app = express();
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173'
  // 'https://tu-app-de-chat.onrender.com' 
];
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por la política de CORS'));
    }
  }
};
app.use(cors(corsOptions));


// 3. ALMACENAMIENTO EN MEMORIA (Ahora la clave será el UID de Firebase)
let clients = {};


// 4. ENDPOINT PARA QUE REACT SE CONECTE (SSE) - ACTUALIZADO
app.get('/events', async (req, res) => { // ✅ La función ahora es async
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // ✅ ACTUALIZADO: Obtener el token desde la URL en lugar de userId
  const token = req.query.token;
  if (!token) {
    return res.status(400).send('token es requerido');
  }

  let uid;
  try {
    // ✅ ACTUALIZADO: Verificar el token con Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
  } catch (error) {
    console.error('Token inválido:', error.message);
    return res.status(401).send('Token inválido');
  }

  // ✅ ACTUALIZADO: Guardar la conexión usando el UID seguro de Firebase
  clients[uid] = res;
  console.log(`Cliente conectado con UID: ${uid}`);

  res.write(':ok\n\n');

  req.on('close', () => {
    console.log(`Cliente desconectado con UID: ${uid}`);
    delete clients[uid];
  });
});


// 5. ENDPOINT PARA QUE N8N ENVÍE LAS NOTIFICACIONES - ACTUALIZADO
app.post('/notify', (req, res) => {
  // ✅ ACTUALIZADO: Ahora esperamos `uid` en lugar de `userId`
  const { uid, videoUrl, imageUrl } = req.body;

  if (!uid || (!videoUrl && !imageUrl)) {
    return res.status(400).send('Se requiere uid y al menos una URL (videoUrl o imageUrl)');
  }

  // ✅ ACTUALIZADO: Buscar al cliente por su UID
  const client = clients[uid];

  if (client) {
    let payload = {};
    if (videoUrl) {
      console.log(`Notificación de VIDEO para UID ${uid}`);
      payload = { videoUrl };
    } else if (imageUrl) {
      console.log(`Notificación de IMAGEN para UID ${uid}`);
      payload = { imageUrl };
    }

    client.write(`data: ${JSON.stringify({ payload })}\n\n`);
    console.log(`Notificación enviada a UID ${uid}`);
    res.status(200).send({ message: 'Notificación enviada' });
  } else {
    console.log(`Cliente con UID ${uid} no encontrado.`);
    res.status(404).send({ message: 'Cliente no encontrado' });
  }
});


// 6. INICIAR EL SERVIDOR
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor de notificaciones (seguro) corriendo en http://localhost:${PORT}`);
});