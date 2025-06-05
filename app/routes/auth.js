// app/routes/auth.js
require('dotenv').config();
const express  = require('express');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const pool     = require('../db');
const { hashPassword, comparePassword } = require('../utils/hash');
const jwtVerify = require('../middleware/jwtVerify');

const router = express.Router();
const MAX_FAIL = parseInt(process.env.MAX_FAILED_ATTEMPTS, 10) || 4;


// -------------------------------------
// Registro de usuario
// -------------------------------------
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email)
    return res.status(400).json({ error: 'Faltan datos' });

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return res.status(400).json({
      error: 'La contraseña debe tener 8+ caracteres, al menos una mayúscula y un número'
    });
  }

  const conn = await pool.getConnection();
  try {
    const hash = await hashPassword(password);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await conn.query(
      `INSERT INTO usuarios
         (username, password_hash, salt, email, created_at, last_updated, role, activo, verification_token)
       VALUES (?, ?, '', ?, NOW(), NOW(), 'user', 0, ?)`,
      [username, hash, email, verifyToken]
    );
    res.json({ message: 'Registro exitoso, revisa tu email para activar la cuenta', verifyToken });
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
      'SELECT id, password_hash, intentos, bloqueado, activo FROM usuarios WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Usuario no existe' });

    const user = rows[0];
    if (user.activo === 0)
      return res.status(403).json({ error: 'Cuenta no verificada' });
    if (user.bloqueado === 1)
      return res.status(403).json({ error: 'Cuenta bloqueada' });

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      const nuevos = user.intentos + 1;
      const bloquea = nuevos >= MAX_FAIL ? 1 : 0;
      await conn.query(
        'UPDATE usuarios SET intentos = ?, bloqueado = ? WHERE id = ?',
        [nuevos, bloquea, user.id]
      );
      await conn.query(
        'INSERT INTO registroactividad(tabla, operacion, id_registro, ip_origen) VALUES(?, ?, ?, ?)',
        ['LOGIN', 'FAIL', user.id, req.ip]
      );
      const msg = bloquea
        ? 'Has sido bloqueado tras varios intentos fallidos'
        : `Contraseña incorrecta. Intentos restantes: ${MAX_FAIL - nuevos}`;
      return res.status(401).json({ error: msg });
    }

    // éxito
    await conn.query('UPDATE usuarios SET intentos = 0 WHERE id = ?', [user.id]);
    await conn.query(
      'INSERT INTO registroactividad(tabla, operacion, id_registro, ip_origen) VALUES(?, ?, ?, ?)',
      ['LOGIN', 'SUCCESS', user.id, req.ip]
    );
    const token = jwt.sign(
      { id: user.id, username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    res.json({ message: 'Login exitoso' });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Cambio de contraseña (usuario autenticado)
// -------------------------------------
router.post('/change-password', jwtVerify, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const username = req.user.username;
  if (!username || !currentPassword || !newPassword)
    return res.status(400).json({ error: 'Faltan datos' });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, password_hash FROM usuarios WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Usuario no existe' });

    const user = rows[0];
    const ok = await comparePassword(currentPassword, user.password_hash);
    if (!ok)
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

    const newHash = await hashPassword(newPassword);
    await conn.query(
      `UPDATE usuarios
         SET password_hash = ?,
             last_updated  = NOW(),
             intentos      = 0,
             bloqueado     = 0
       WHERE id = ?`,
      [newHash, user.id]
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
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    await conn.query(
      'INSERT INTO reset_tokens(token, user_id, expires) VALUES(?, ?, ?)',
      [token, rows[0].id, expires]
    );

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
router.post('/reset-password', jwtVerify, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT user_id, expires FROM reset_tokens WHERE token = ?',
      [token]
    );
    if (rows.length === 0 || new Date(rows[0].expires) < new Date()) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    const userId = rows[0].user_id;

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

    const hash = await hashPassword(newPassword);
    await conn.query(
      `UPDATE usuarios
         SET password_hash = ?,
             last_updated  = NOW(),
             intentos      = 0,
             bloqueado     = 0
       WHERE id = ?`,
      [hash, userId]
    );
    await conn.query('DELETE FROM reset_tokens WHERE token = ?', [token]);
    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Verificar email
// -------------------------------------
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id FROM usuarios WHERE verification_token = ?',
      [token]
    );
    if (rows.length === 0)
      return res.status(400).json({ error: 'Token inválido' });
    await conn.query(
      'UPDATE usuarios SET activo = 1, verification_token = NULL WHERE id = ?',
      [rows[0].id]
    );
    res.json({ message: 'Cuenta activada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Actualizar datos de usuario
// -------------------------------------
router.post('/update', jwtVerify, async (req, res) => {
  const { email } = req.body;
  const id = req.user.id;
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE usuarios SET email = ?, last_updated = NOW() WHERE id = ?', [email, id]);
    res.json({ message: 'Datos actualizados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Cambiar rol (solo admins)
// -------------------------------------
router.post('/set-role', jwtVerify, async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'Datos requeridos' });
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT role FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await conn.query('UPDATE usuarios SET role = ? WHERE id = ?', [role, userId]);
    res.json({ message: 'Rol actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------
// Desbloquear usuario manualmente
// -------------------------------------
router.post('/unlock/:username', jwtVerify, async (req, res) => {
  const { username } = req.params;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT role FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await conn.query('UPDATE usuarios SET intentos = 0, bloqueado = 0 WHERE username = ?', [username]);
    res.json({ message: 'Usuario desbloqueado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
