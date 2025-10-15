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
            search 
          });
        }
      );
    });
  });
};

// ✅ FUNCIÓN: Actualizar un cliente
const updateCliente = (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;

  // Validaciones
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
        error: "Error de conexión a la base de datos"
      });
    }

    const sql = `
      UPDATE clientes 
      SET 
        nombre = ?, 
        direccion = ?, 
        ruc = ?, 
        ciudad = ?, 
        telefono = ?, 
        agencia = ?, 
        email = ?, 
        nota_id = ?
      WHERE cliente_id = ?
    `;

    const values = [
      nombre.trim(),
      direccion ? direccion.trim() : null,
      ruc ? ruc.trim() : null,
      ciudad.trim(),
      telefono.trim(),
      agencia ? agencia.trim() : null,
      email ? email.trim() : null,
      nota_id !== undefined ? parseInt(nota_id) : null,
      id
    ];

    connection.execute(sql, values, (error, results) => {
      connection.release();

      if (error) {
        console.error("❌ Error al actualizar cliente:", error.message);
        return res.status(500).json({
          success: false,
          error: "Error interno del servidor"
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Cliente no encontrado"
        });
      }

      res.json({
        success: true,
        message: "Cliente actualizado exitosamente",
        id: id
      });
    });
  });
};

// ✅ FUNCIÓN: Obtener un cliente por ID
const getClienteById = (req, res) => {
  const { id } = req.params;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ success: false, error: "Error de conexión" });
    }

    const sql = `SELECT * FROM clientes WHERE cliente_id = ?`;
    connection.execute(sql, [id], (error, results) => {
      connection.release();
      if (error) {
        return res.status(500).json({ success: false, error: "Error en la consulta" });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, error: "Cliente no encontrado" });
      }
      res.json({ success: true, cliente: results[0] });
    });
  });
};

// ✅ FUNCIÓN: Eliminar un cliente
const deleteCliente = (req, res) => {
  const { id } = req.params;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Error obteniendo conexión:", err.message);
      return res.status(500).json({
        success: false,
        error: "Error de conexión a la base de datos"
      });
    }

    // Primero, verificar si el cliente existe (opcional pero recomendado)
    const checkSql = `SELECT cliente_id FROM clientes WHERE cliente_id = ?`;
    connection.execute(checkSql, [id], (error, results) => {
      if (error) {
        connection.release();
        return res.status(500).json({
          success: false,
          error: "Error al verificar cliente"
        });
      }

      if (results.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          error: "Cliente no encontrado"
        });
      }

      // Eliminar el cliente
      const deleteSql = `DELETE FROM clientes WHERE cliente_id = ?`;
      connection.execute(deleteSql, [id], (error, results) => {
        connection.release();

        if (error) {
          console.error("❌ Error al eliminar cliente:", error.message);
          return res.status(500).json({
            success: false,
            error: "Error interno del servidor"
          });
        }

        res.json({
          success: true,
          message: "Cliente eliminado exitosamente",
          id: id
        });
      });
    });
  });
};

module.exports = { getAllClientes, createCliente, updateCliente, getClienteById, deleteCliente };