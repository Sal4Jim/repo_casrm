const { pool } = require('../config/database');

// Función para crear un cliente (con callback)
const createCliente = (req, res) => {
  const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;

  // Validaciones básicas
  if (!nombre || !telefono || !ciudad) {
    return res.status(400).json({
      success: false,
      error: "Los campos 'nombre', 'teléfono' y 'ciudad' son obligatorios."
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
      ciudad.trim(),
      telefono.trim(),
      agencia ? agencia.trim() : null,
      email ? email.trim() : null,
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

// ✅ FUNCIÓN: Obtener todos los clientes
const getAllClientes = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || ''; 
  const offset = (page - 1) * limit;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Error obteniendo conexión:", err.message);
      return res.status(500).json({
        success: false,
        error: "Error de conexión a la base de datos"
      });
    }

    // Escapar el término de búsqueda para evitar inyección SQL (opcional pero recomendado)
    const searchTerm = `%${search.trim()}%`;

    // Contar total con búsqueda
    const countSql = `
      SELECT COUNT(*) AS total 
      FROM clientes 
      WHERE ? = '' 
         OR nombre LIKE ? 
         OR ruc LIKE ? 
         OR ciudad LIKE ? 
         OR telefono LIKE ?
    `;

    connection.execute(countSql, [search, searchTerm, searchTerm, searchTerm, searchTerm], (error, countResults) => {
      if (error) {
        connection.release();
        return res.status(500).json({
          success: false,
          error: "Error al contar clientes"
        });
      }

      const total = countResults[0].total;
      const totalPages = Math.ceil(total / limit);

      // Consulta con búsqueda y paginación
      const sql = `
        SELECT cliente_id, nombre, ruc, ciudad, telefono 
        FROM clientes 
        WHERE ? = '' 
           OR nombre LIKE ? 
           OR ruc LIKE ? 
           OR ciudad LIKE ? 
           OR telefono LIKE ?
        ORDER BY nombre ASC 
        LIMIT ? OFFSET ?
      `;

      connection.execute(
        sql,
        [search, searchTerm, searchTerm, searchTerm, searchTerm, limit, offset],
        (error, results) => {
          connection.release();

          if (error) {
            console.error("❌ Error en consulta SQL:", error.message);
            return res.status(500).json({
              success: false,
              error: "Error al obtener clientes"
            });
          }

          res.json({
            success: true,
            clientes: results,
            total,
            page,
            totalPages,
            limit,
            search // 👈 Opcional: para depuración
          });
        }
      );
    });
  });
};
module.exports = {getAllClientes,createCliente};