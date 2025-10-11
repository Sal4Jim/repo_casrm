const { pool } = require('../config/database');

const createCliente = (req, res) => {
  const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;

  // ✅ NUEVA VALIDACIÓN: nombre, telefono y ciudad son obligatorios
  if (!nombre || !telefono || !ciudad) {
    return res.status(400).json({
      success: false,
      error: "Los campos 'nombre', 'teléfono' y 'ciudad' son obligatorios."
    });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Error obteniendo conexión:", err.message);
      return res.status(500).json({
        success: false,
        error: "Error de conexión a la base de datos: " + err.message
      });
    }

    const sql = `
      INSERT INTO clientes (
        nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id, fecha_log
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      nombre.trim(),                             // ← Obligatorio
      direccion ? direccion.trim() : null,       // ← Opcional
      ruc ? ruc.trim() : null,                   // ← Opcional  
      ciudad.trim(),                             // ← Obligatorio
      telefono.trim(),                           // ← Obligatorio
      agencia ? agencia.trim() : null,           // ← Opcional
      email ? email.trim() : null,               // ← Opcional (antes era obligatorio)
      nota_id !== undefined ? parseInt(nota_id) : null  // ← Opcional
    ];

    connection.execute(sql, values, (error, results) => {
      connection.release();

      if (error) {
        console.error("❌ Error al insertar cliente:", error.message);
        return res.status(500).json({
          success: false,
          error: "Error interno del servidor: " + error.message
        });
      }

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