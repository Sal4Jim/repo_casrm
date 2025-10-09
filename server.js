// server.js
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'casrm_db'
};

// Endpoint simple para probar conexión
app.get('/test-db', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    await connection.end();
    
    res.json({
      success: true,
      message: "✅ Conexión exitosa",
      result: rows[0].result
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Ruta principal
app.get('/', (req, res) => {
  res.send(`
    <h1>Prueba Conexión MySQL</h1>
    <p>Abre: <a href="/test-db">/test-db</a></p>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});