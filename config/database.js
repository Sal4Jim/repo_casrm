const mysql = require('mysql2'); // ← Importante: sin /promise

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'casrm_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear el pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión (con callback)
const testConnection = (callback) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Error de conexión:", err.message);
      if (callback) callback({ success: false, error: err.message });
      return;
    }

    // Probar consulta simple
    connection.execute('SELECT 1 + 1 AS result', (error, results) => {
      // Siempre liberar la conexión
      connection.release();

      if (error) {
        console.error("❌ Error en prueba:", error.message);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      console.log("✅ Conexión a MySQL exitosa");
      console.log("🧪 Prueba de consulta:", results[0].result);
      
      if (callback) callback({ 
        success: true, 
        message: "Conexión OK",
        result: results[0].result 
      });
    });
  });
};

// Exportar el pool para usar en las rutas
module.exports = { pool, testConnection };