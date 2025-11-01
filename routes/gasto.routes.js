const express = require('express');
const router = express.Router();
const gastoController = require('../controllers/gasto.controller');

// GET /api/gastos - Obtener todos los gastos
router.get('/', gastoController.getGastos);

// POST /api/gastos - Crear un nuevo gasto
router.post('/', gastoController.createGasto);

// PUT /api/gastos/:id - Actualizar un gasto
router.put('/:id', gastoController.updateGasto);

// DELETE /api/gastos/:id - Eliminar un gasto
router.delete('/:id', gastoController.deleteGasto);

module.exports = router;