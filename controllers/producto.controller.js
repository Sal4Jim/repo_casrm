// controllers/producto.controller.js

const { pool } = require('../config/database');

// Obtener todos los productos con nombre de categoría
exports.getProducts = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 0; // Si el límite es 0, se devuelven todos
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("❌ Error obteniendo conexión:", err.message);
      return res.status(500).json({ success: false, error: "Error de conexión a la base de datos" });
    }

    const searchTerm = `%${search.trim()}%`;
    let sql;
    let params;

    // Construcción de la consulta SQL
    const baseQuery = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.categoria_id
    `;
    const whereClause = `WHERE p.activo = 1 AND (? = '' OR p.nombre LIKE ?)`;
    const orderClause = `ORDER BY p.nombre ASC`;
    const limitClause = limit > 0 ? `LIMIT ? OFFSET ?` : '';

    sql = `${baseQuery} ${whereClause} ${orderClause} ${limitClause}`;

    // Parámetros para la consulta
    params = [search, searchTerm];
    if (limit > 0) {
      params.push(limit, offset);
    }

    connection.execute(sql, params, (error, results) => {
      connection.release();

      if (error) {
        console.error("❌ Error en consulta SQL de productos:", error.message);
        return res.status(500).json({ success: false, error: "Error al obtener productos" });
      }

      // Devolver siempre el mismo formato de objeto para consistencia
      res.json({
        success: true,
        productos: results,
      });
    });
  });
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