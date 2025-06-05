require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;

pool.getConnection()
  .then(conn => {
    console.log('✅ Conexión a MySQL OK');
    conn.release();
  })
  .catch(err => {
    console.error('❌ No pude conectar a MySQL:', err);
  });
