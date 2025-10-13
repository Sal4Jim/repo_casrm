// controllers/categoria.controller.js

const { pool } = require('../config/database');

// Obtener todas las categorías
exports.getCategorias = (req, res) => {
  const query = 'SELECT * FROM categorias ORDER BY categoria_id;';
  pool.execute(query, (err, results) => {
    if (err) {
      console.error('Error al obtener categorías:', err);
      return res.status(500).json({ error: 'Error al obtener categorías' });
    }
    res.json(results);
  });
};

// Crear nueva categoría
exports.createCategoria = (req, res) => {
  const { nombre } = req.body;

  const query = 'INSERT INTO categorias (nombre) VALUES (?)';

  pool.execute(query, [nombre], (err, result) => {
    if (err) {
      console.error('Error al crear categoría:', err);
      return res.status(500).json({ error: 'Error al crear categoría' });
    }
    const nuevaCategoria = {
      categoria_id: result.insertId,
      nombre
    };
    res.status(201).json(nuevaCategoria);
  });
};