const { pool } = require('../config/database');

const createCliente = async (req, res) => {
    const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;


    if (!nombre || !telefono || !ciudad) {
        return res.status(400).json({
            success: false,
            error: "Los campos 'nombre', 'teléfono' y 'ciudad' son obligatorios."
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
    try {
        // Usamos pool.promise() para poder usar await
        const [results] = await pool.promise().execute(sql, values);

        console.log("✅ Cliente creado exitosamente, ID:", results.insertId);
        res.status(201).json({
            success: true,
            message: "Cliente creado exitosamente",
            id: results.insertId
        });

    } catch (error) {
        console.error("❌ Error al insertar cliente:", error.message);
        res.status(500).json({
            success: false,
            error: "Error interno del servidor: " + error.message
        });
    }
};

const getAllClientes = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || 'activo'; // 'activo', 'inactivo', o 'todos'
    const offset = (page - 1) * limit;

    try {
        const searchTerm = `%${search.trim()}%`;
        let statusCondition = 'c.activo = 1'; // Por defecto, solo activos
        if (status === 'inactivo') {
            statusCondition = 'c.activo = 0';
        } else if (status === 'todos') {
            statusCondition = '1=1'; // Siempre verdadero, para mostrar todos
        }

        // Construimos la cláusula WHERE una sola vez para reutilizarla
        const whereClause = `WHERE (${statusCondition}) AND (? = '' OR c.nombre LIKE ? OR c.ruc LIKE ? OR c.ciudad LIKE ? OR c.telefono LIKE ?)`;
        const searchParams = [search, searchTerm, searchTerm, searchTerm, searchTerm];

        // 1. Contar el total de clientes que coinciden con el filtro
        const countSql = `SELECT COUNT(*) AS total FROM clientes c ${whereClause}`;
        const [countResults] = await pool.promise().execute(countSql, searchParams);
        const total = countResults[0].total;
        const totalPages = Math.ceil(total / limit);

        // 2. Obtener los clientes para la página actual
        const sql = `
        SELECT cliente_id, nombre, ruc, ciudad, telefono, direccion, email, c.activo
        FROM clientes c
        ${whereClause}
        ORDER BY nombre ASC 
        LIMIT ? OFFSET ?
      `;

        // Añadimos los parámetros de paginación al final
        const finalParams = [...searchParams, limit, offset];
        const [results] = await pool.promise().execute(sql, finalParams);

        res.json({
            success: true,
            clientes: results,
            total,
            page,
            totalPages,
            limit,
            search
        });

    } catch (error) {
        console.error("❌ Error en consulta SQL de clientes:", error.message);
        res.status(500).json({
            success: false,
            error: "Error al obtener clientes"
        });
    }
};

const updateCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion, ruc, ciudad, telefono, agencia, email, nota_id } = req.body;

    if (!nombre || !telefono || !ciudad) {
        return res.status(400).json({
            success: false,
            error: "Los campos 'nombre', 'teléfono' y 'ciudad' son obligatorios."
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

    try {
        const [results] = await pool.promise().execute(sql, values);

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

    } catch (error) {
        console.error("❌ Error al actualizar cliente:", error.message);
        res.status(500).json({
            success: false,
            error: "Error interno del servidor"
        });
    }
};

const getClienteById = async (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT 
            c.cliente_id, c.nombre, c.ruc, c.ciudad, c.telefono, c.direccion, c.email, c.agencia, c.activo,
            n.descripcion AS notas 
        FROM clientes c
        LEFT JOIN notas n ON c.nota_id = n.nota_id
        WHERE c.cliente_id = ?`;

    try {
        const [results] = await pool.promise().execute(sql, [id]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, error: "Cliente no encontrado" });
        }

        res.json({ success: true, cliente: results[0] });

    } catch (error) {
        console.error(`❌ Error al obtener cliente ${id}:`, error.message);
        res.status(500).json({ success: false, error: "Error en la consulta" });
    }
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
