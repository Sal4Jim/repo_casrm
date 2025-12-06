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
exports.createProduct = async (req, res) => {
  const { nombre, precio_compra, precio_venta, stock, categoria_id, presentacion } = req.body;

  if (precio_compra < 0 || precio_venta < 0 || stock < 0) {
    return res.status(400).json({ success: false, error: 'Los precios y el stock no pueden ser negativos.' });
  }

  try {
    const query = `
      INSERT INTO productos (nombre, precio_compra, precio_venta, stock, categoria_id, presentacion)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const values = [nombre, precio_compra, precio_venta, stock, categoria_id, presentacion];
    const [result] = await pool.promise().execute(query, values);

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
  } catch (err) {
    console.error('Error al crear producto:', err);
    return res.status(500).json({ error: 'Error al crear producto' });
  }
};

// Actualizar producto
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { nombre, precio_compra, precio_venta, stock, categoria_id, presentacion } = req.body;

  if (precio_compra < 0 || precio_venta < 0 || stock < 0) {
    return res.status(400).json({ success: false, error: 'Los precios y el stock no pueden ser negativos.' });
  }

  try {
    const query = `
      UPDATE productos
      SET nombre = ?, precio_compra = ?, precio_venta = ?, stock = ?, categoria_id = ?, presentacion = ?
      WHERE producto_id = ?;
    `;
    const values = [nombre, precio_compra, precio_venta, stock, categoria_id, presentacion, id];
    const [result] = await pool.promise().execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    return res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// Desactivar/Eliminar lógicamente un producto
exports.toggleProductStatus = async (req, res) => {
  const { id } = req.params;
  const nuevoEstado = 0; // 0 para inactivo

  try {
    const query = 'UPDATE productos SET activo = ? WHERE producto_id = ?';
    const [result] = await pool.promise().execute(query, [nuevoEstado, id]);

    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    res.json({ success: true, message: 'Producto desactivado correctamente' });
  } catch (err) {
    console.error('Error al desactivar producto:', err);
    return res.status(500).json({ success: false, error: 'Error al desactivar el producto' });
  }
};