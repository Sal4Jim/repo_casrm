// controllers/producto.controller.js

const { pool } = require('../config/database');

// Obtener todos los productos con paginación
exports.getProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // Default limit 10 if not specified
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    const searchTerm = `%${search.trim()}%`;

    const whereClause = `WHERE p.activo = 1 AND (? = '' OR p.nombre LIKE ?)`;
    const searchParams = [search, searchTerm];

    // 1. Contar el total de productos que coinciden con el filtro
    const countSql = `
      SELECT COUNT(*) AS total 
      FROM productos p 
      ${whereClause}
    `;
    const [countResults] = await pool.promise().execute(countSql, searchParams);
    const total = countResults[0].total;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    // 2. Obtener los productos para la página actual
    let sql = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.categoria_id
      ${whereClause}
      ORDER BY p.nombre ASC
    `;

    const queryParams = [...searchParams];

    if (limit > 0) {
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }

    const [results] = await pool.promise().execute(sql, queryParams);

    res.json({
      success: true,
      productos: results,
      total,
      page,
      totalPages,
      limit
    });

  } catch (error) {
    console.error("❌ Error en consulta SQL de productos:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener productos" });
  }
};

// Crear un nuevo producto
exports.createProduct = (req, res) => {
  const { nombre, precio_compra, precio_venta, stock, categoria_id, presentacion } = req.body;

  const query = `
    INSERT INTO productos (nombre, precio_compra, precio_venta, stock, categoria_id, presentacion)
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  const values = [nombre, precio_compra, precio_venta, stock, categoria_id, presentacion];

  pool.execute(query, values, (err, result) => {
    if (err) {
      console.error('Error al crear producto:', err);
      return res.status(500).json({ error: 'Error al crear producto' });
    }
    const nuevoProducto = {
      producto_id: result.insertId,
      nombre,
      precio_compra,
      precio_venta,
      stock,
      categoria_id,
      presentacion
    };
    res.status(201).json(nuevoProducto);
  });
};

// Actualizar producto
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { nombre, precio_compra, precio_venta, stock, categoria_id, presentacion } = req.body;

  const query = `
    UPDATE productos
    SET nombre = ?, precio_compra = ?, precio_venta = ?, stock = ?, categoria_id = ?, presentacion = ?
    WHERE producto_id = ?;
  `;
  const values = [nombre, precio_compra, precio_venta, stock, categoria_id, presentacion, id];

  pool.execute(query, values, (err, result) => {
    if (err) {
      console.error('Error al actualizar producto:', err);
      return res.status(500).json({ error: 'Error al actualizar producto' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto actualizado correctamente' });
  });
};

// Desactivar/Eliminar lógicamente un producto
exports.toggleProductStatus = (req, res) => {
  const { id } = req.params;
  // Por ahora, solo desactivamos. El body podría usarse para reactivar en el futuro.
  const nuevoEstado = 0; // 0 para inactivo

  const query = 'UPDATE productos SET activo = ? WHERE producto_id = ?';

  pool.execute(query, [nuevoEstado, id], (err, result) => {
    if (err) {
      console.error('Error al desactivar producto:', err);
      return res.status(500).json({ success: false, error: 'Error al desactivar el producto' });
    }
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    res.json({ success: true, message: 'Producto desactivado correctamente' });
  });
};