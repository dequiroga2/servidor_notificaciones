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

<<<<<<< HEAD
const allowedOrigins = [
  'http://localhost:5173'
  // 'https://tu-app-de-chat.onrender.com' 
=======
// Configuración de CORS: permite que solo tu app local de React se conecte.
// ¡IMPORTANTE! Cuando subas tu app de React a un dominio, deberás añadirlo aquí.
// --- INICIO DE LA CONFIGURACIÓN DE CORS (CORREGIDA) ---

// Lista de dominios que tienen permiso para conectarse a este servidor
const allowedOrigins = [
  'http://localhost:5173' // Para tu desarrollo local
  // Cuando despliegues tu app de React, añadirás su URL aquí.
  // Ej: 'https://tu-app-de-chat.onrender.com' 
>>>>>>> 15df23c0081af697e45a9d9a99d0343588ecebdd
];
const corsOptions = {
  origin: (origin, callback) => {
<<<<<<< HEAD
    if (allowedOrigins.includes(origin) || !origin) {
=======
    // La petición se permite si su origen está en la lista de permitidos
    if (allowedOrigins.includes(origin) || !origin) { // !origin permite herramientas como Postman o n8n
>>>>>>> 15df23c0081af697e45a9d9a99d0343588ecebdd
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
  const { uid, videoUrl } = req.body;

  if (!uid || !videoUrl) {
    return res.status(400).send('uid y videoUrl son requeridos');
  }

  console.log(`Notificación recibida para UID ${uid} con URL: ${videoUrl}`);

  // ✅ ACTUALIZADO: Buscar al cliente por su UID
  const client = clients[uid];

  if (client) {
    client.write(`data: ${JSON.stringify({ videoUrl })}\n\n`);
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
<<<<<<< HEAD
  console.log(`✅ Servidor de notificaciones (seguro) corriendo en http://localhost:${PORT}`);
});
=======
  console.log(`✅ Servidor de notificaciones corriendo en http://localhost:${PORT}`);
});
>>>>>>> 15df23c0081af697e45a9d9a99d0343588ecebdd
