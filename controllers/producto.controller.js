// controllers/producto.controller.js

const { pool } = require('../config/database');

// Obtener todos los productos con nombre de categoría
exports.getProducts = (req, res) => {
  const query = `
    SELECT p.*, c.nombre AS categoria_nombre
    FROM productos p
    JOIN categorias c ON p.categoria_id = c.categoria_id
    ORDER BY p.producto_id;
  `;
  pool.execute(query, (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.json(results);
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

// Eliminar producto
exports.deleteProduct = (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM productos WHERE producto_id = ?';

  pool.execute(query, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado correctamente' });
  });
};