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

    const sql = `
      SELECT 
        c.*, 
        n.descripcion AS notas 
      FROM clientes c
      LEFT JOIN notas n ON c.nota_id = n.nota_id
      WHERE c.cliente_id = ?`;
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

// ✅ FUNCIÓN: Actualizar solo las notas de un cliente (con tabla 'notas' separada)
const updateNotasCliente = async (req, res) => {
  const { id } = req.params;
  const { notas } = req.body;
  const clienteId = parseInt(id);

  if (notas === undefined) {
    return res.status(400).json({ success: false, error: "El campo 'notas' es requerido" });
  }

  let connection;
  try {
    connection = await pool.promise().getConnection();
    await connection.beginTransaction();

    // 1. Obtener el nota_id actual del cliente
    const [rows] = await connection.execute('SELECT nota_id FROM clientes WHERE cliente_id = ?', [clienteId]);

    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, error: "Cliente no encontrado" });
    }

    const notaIdActual = rows[0].nota_id;

    if (notaIdActual) {
      // 2a. Si ya existe una nota, la actualizamos
      if (notas.trim() === '') {
        // Si el texto de la nota está vacío, desvinculamos y eliminamos la nota
        await connection.execute('UPDATE clientes SET nota_id = NULL WHERE cliente_id = ?', [clienteId]);
        await connection.execute('DELETE FROM notas WHERE nota_id = ?', [notaIdActual]);
      } else {
        // Si hay texto, actualizamos la descripción
        await connection.execute('UPDATE notas SET descripcion = ? WHERE nota_id = ?', [notas, notaIdActual]);
      }
    } else if (notas.trim() !== '') {
      // 2b. Si no existe una nota y el texto no está vacío, creamos una nueva
      const [insertResult] = await connection.execute('INSERT INTO notas (descripcion) VALUES (?)', [notas]);
      const nuevaNotaId = insertResult.insertId;

      // 3. Vinculamos la nueva nota al cliente
      await connection.execute('UPDATE clientes SET nota_id = ? WHERE cliente_id = ?', [nuevaNotaId, clienteId]);
    }
    // Si no hay notaId y el texto está vacío, no hacemos nada.

    await connection.commit();
    res.json({ success: true, message: "Notas actualizadas exitosamente" });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error al actualizar notas:", error.message);
    res.status(500).json({ success: false, error: "Error interno del servidor al actualizar notas" });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { getAllClientes, createCliente, updateCliente, getClienteById, deleteCliente, updateNotasCliente };

/*
// Versión anterior de updateNotasCliente (para referencia)
const updateNotasCliente_old = (req, res) => {
  const { id } = req.params;
  const { notas } = req.body;

  if (notas === undefined) {
    return res.status(400).json({
      success: false,
      error: "El campo 'notas' es requerido"
    });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ success: false, error: "Error de conexión" });
    }

    const sql = `UPDATE clientes SET notas = ? WHERE cliente_id = ?`;
    connection.execute(sql, [notas, id], (error, results) => {
      connection.release();
      if (error) {
        return res.status(500).json({ success: false, error: "Error al actualizar notas" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ success: false, error: "Cliente no encontrado" });
      }
      res.json({ success: true, message: "Notas actualizadas exitosamente" });
    });
  });
};*/