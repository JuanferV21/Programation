// app/routes/auth.js
require('dotenv').config();
const express  = require('express');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const pool     = require('../db');
const { genSalt, sha256 } = require('../utils/hash');

const router = express.Router();
const MAX_FAIL = parseInt(process.env.MAX_FAILED_ATTEMPTS, 10) || 4;

// Para almacenar tokens de reseteo en memoria (en producción usar tabla)
const resetTokens = {};

// -------------------------------------
// Registro de usuario
// -------------------------------------
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email)
    return res.status(400).json({ error: 'Faltan datos' });

  const conn = await pool.getConnection();
  try {
    const salt = genSalt();
    const hash = sha256(password, salt);
    await conn.query(
      `INSERT INTO usuarios
         (username, password_hash, salt, email, created_at, last_updated)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [username, hash, salt, email]
    );
    res.json({ message: 'Usuario creado. Ya puedes iniciar sesión.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Login
// -------------------------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, password_hash, salt, intentos, bloqueado FROM usuarios WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Usuario no existe' });

    const user = rows[0];
    if (user.bloqueado === 1)
      return res.status(403).json({ error: 'Cuenta bloqueada' });

    const hash = sha256(password, user.salt);
    if (hash !== user.password_hash) {
      const nuevos = user.intentos + 1;
      const bloquea = nuevos >= MAX_FAIL ? 1 : 0;
      await conn.query(
        'UPDATE usuarios SET intentos = ?, bloqueado = ? WHERE id = ?',
        [nuevos, bloquea, user.id]
      );
      const msg = bloquea
        ? 'Has sido bloqueado tras varios intentos fallidos'
        : `Contraseña incorrecta. Intentos restantes: ${MAX_FAIL - nuevos}`;
      return res.status(401).json({ error: msg });
    }

    // éxito
    await conn.query('UPDATE usuarios SET intentos = 0 WHERE id = ?', [user.id]);
    const token = jwt.sign(
      { id: user.id, username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ message: 'Login exitoso', token });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Cambio de contraseña (usuario autenticado)
// -------------------------------------
router.post('/change-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!username || !currentPassword || !newPassword)
    return res.status(400).json({ error: 'Faltan datos' });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, password_hash, salt FROM usuarios WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Usuario no existe' });

    const user = rows[0];
    const curHash = sha256(currentPassword, user.salt);
    if (curHash !== user.password_hash)
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        error:
          'La nueva contraseña debe tener 8+ caracteres, al menos una mayúscula y un número'
      });
    }

    const salt   = genSalt();
    const newHash = sha256(newPassword, salt);
    await conn.query(
      `UPDATE usuarios
         SET password_hash = ?,
             salt          = ?,
             last_updated  = NOW(),
             intentos      = 0,
             bloqueado     = 0
       WHERE id = ?`,
      [newHash, salt, user.id]
    );
    res.json({ message: 'Contraseña actualizada y cuenta desbloqueada' });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Olvidé mi contraseña: genera token
// -------------------------------------
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Usuario requerido' });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id FROM usuarios WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Usuario no existe' });

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutos
    resetTokens[token] = { userId: rows[0].id, expires };

    // En producción enviar por correo; aquí devolvemos el token
    res.json({ message: 'Token generado. Válido 15 min.', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Restablecer contraseña con token
// -------------------------------------
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });

  const data = resetTokens[token];
  if (!data || data.expires < Date.now())
    return res.status(400).json({ error: 'Token inválido o expirado' });

  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    return res.status(400).json({
      error:
        'La contraseña debe tener 8+ caracteres, al menos una mayúscula y un número'
    });
  }

  const conn = await pool.getConnection();
  try {
    const salt = genSalt();
    const hash = sha256(newPassword, salt);
    await conn.query(
      `UPDATE usuarios
         SET password_hash = ?,
             salt          = ?,
             last_updated  = NOW(),
             intentos      = 0,
             bloqueado     = 0
       WHERE id = ?`,
      [hash, salt, data.userId]
    );
    delete resetTokens[token];
    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
