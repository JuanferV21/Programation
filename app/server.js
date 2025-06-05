require('dotenv').config();
const express = require('express');
const path    = require('path');
const helmet  = require('helmet');

const auth = require('./routes/auth');

const app = express();

// 1) Cabeceras de seguridad y parseo de JSON
app.use(helmet());
app.use(express.json());

// 2) Sirvo todo lo que esté en /public como archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 3) API de autenticación
app.use('/api/auth', auth);

// 4) (Opcional) Para que cualquier otra ruta no-API devuelva index.html
//    útil si luego añades rutas basadas en Front-End routing.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// 5) Manejador de errores genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

// 6) Levanto el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});
