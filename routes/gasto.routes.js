const express = require('express');
const router = express.Router();
const gastoController = require('../controllers/gasto.controller');

// GET /api/gastos - Obtener todos los gastos
router.get('/', gastoController.getGastos);

// POST /api/gastos - Crear un nuevo gasto
router.post('/', gastoController.createGasto);

module.exports = router;