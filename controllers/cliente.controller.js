const { pool } = require('../config/database');

const createCliente = (req, res) => {
  const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;


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
      nombre.trim(),
      direccion ? direccion.trim() : null,
      ruc ? ruc.trim() : null,
      ciudad.trim(),
      telefono.trim(),
      agencia ? agencia.trim() : null,
      email ? email.trim() : null,
      nota_id !== undefined ? parseInt(nota_id) : null
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

const getAllClientes = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || ''; 
  const status = req.query.status || 'activo'; // 'activo', 'inactivo', o 'todos'
  const offset = (page - 1) * limit;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Error obteniendo conexión:", err.message);
      return res.status(500).json({
        success: false,
        error: "Error de conexión a la base de datos",
      });
    }

    const searchTerm = `%${search.trim()}%`;
    let statusCondition = 'c.activo = 1'; // Por defecto, solo activos
    if (status === 'inactivo') {
      statusCondition = 'c.activo = 0';
    } else if (status === 'todos') {
      statusCondition = '1=1'; // Siempre verdadero, para mostrar todos
    }

   
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

      
      const sql = `
        SELECT cliente_id, nombre, ruc, ciudad, telefono, direccion, email, c.activo
        FROM clientes c
        WHERE (${statusCondition}) AND
              (? = ''
               OR c.nombre LIKE ? 
               OR c.ruc LIKE ? 
               OR c.ciudad LIKE ? 
               OR c.telefono LIKE ?)
        ORDER BY nombre ASC 
        LIMIT ? OFFSET ?
      `;

      connection.execute(
        sql,
        [search, searchTerm, searchTerm, searchTerm, searchTerm, limit, offset], // Los parámetros de statusCondition ya están en el string
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

const updateCliente = (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;


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

const getClienteById = (req, res) => {
  const { id } = req.params;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ success: false, error: "Error de conexión" });
    }

    const sql = `
      SELECT 
        c.cliente_id, c.nombre, c.ruc, c.ciudad, c.telefono, c.direccion, c.email, c.agencia, c.activo,
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

/**
 * @function toggleClienteStatus
 * @description Cambia el estado de un cliente entre activo (1) e inactivo (0).
 */
const toggleClienteStatus = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  if (activo === undefined || typeof activo !== 'boolean') {
    return res.status(400).json({ success: false, error: "Se requiere un estado 'activo' (true/false)." });
  }

  const nuevoEstado = activo ? 1 : 0;
  const mensaje = activo ? 'reactivado' : 'desactivado';

  try {
    const [result] = await pool.promise().execute(
      'UPDATE clientes SET activo = ? WHERE cliente_id = ?',
      [nuevoEstado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
    }

    res.json({ success: true, message: `Cliente ${mensaje} exitosamente.` });
  } catch (error) {
    console.error(`❌ Error al cambiar estado del cliente:`, error);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};

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


    const [rows] = await connection.execute('SELECT nota_id FROM clientes WHERE cliente_id = ?', [clienteId]);

    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, error: "Cliente no encontrado" });
    }

    const notaIdActual = rows[0].nota_id;

    if (notaIdActual) {
      if (notas.trim() === '') {
        await connection.execute('UPDATE clientes SET nota_id = NULL WHERE cliente_id = ?', [clienteId]);
        await connection.execute('DELETE FROM notas WHERE nota_id = ?', [notaIdActual]);
      } else {
        await connection.execute('UPDATE notas SET descripcion = ? WHERE nota_id = ?', [notas, notaIdActual]);
      }
    } else if (notas.trim() !== '') {
      const [insertResult] = await connection.execute('INSERT INTO notas (descripcion) VALUES (?)', [notas]);
      const nuevaNotaId = insertResult.insertId;


      await connection.execute('UPDATE clientes SET nota_id = ? WHERE cliente_id = ?', [nuevaNotaId, clienteId]);
    }


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

module.exports = { getAllClientes, createCliente, updateCliente, getClienteById, toggleClienteStatus, updateNotasCliente };
