const { pool } = require('../config/database');

// Función para crear un cliente (con callback)
const createCliente = (req, res) => {
  const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;

  // Validaciones básicas
  if (!nombre || !email) {
    return res.status(400).json({
      success: false,
      error: "Los campos 'nombre' y 'email' son obligatorios."
    });
  }

  // 1. Obtener conexión del pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Error obteniendo conexión:", err.message);
      return res.status(500).json({
        success: false,
        error: "Error de conexión a la base de datos: " + err.message
      });
    }

    // 2. Consulta SQL para insertar
    const sql = `
      INSERT INTO clientes (
        nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id, fecha_log
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    // 3. Valores a insertar
    const values = [
      nombre.trim(),
      direccion ? direccion.trim() : null,
      ruc ? ruc.trim() : null,
      ciudad ? ciudad.trim() : null,
      telefono ? telefono.trim() : null,
      agencia ? agencia.trim() : null,
      email.trim(),
      nota_id !== undefined ? parseInt(nota_id) : null
    ];

    // 4. Ejecutar la consulta
    connection.execute(sql, values, (error, results) => {
      // 5. IMPORTANTE: Siempre liberar la conexión
      connection.release();

      if (error) {
        console.error("❌ Error al insertar cliente:", error.message);
        return res.status(500).json({
          success: false,
          error: "Error interno del servidor: " + error.message
        });
      }

      // 6. Éxito - Responder al frontend
      console.log("✅ Cliente creado exitosamente, ID:", results.insertId);
      res.status(201).json({
        success: true,
        message: "Cliente creado exitosamente",
        id: results.insertId
      });
    });
  });
};

module.exports = { createCliente };