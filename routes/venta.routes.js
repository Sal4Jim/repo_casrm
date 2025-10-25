const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/venta.controller');

// POST /api/ventas - Crear una nueva venta
router.post('/', ventaController.createVenta);

// GET /api/ventas/cliente/:cliente_id - Obtener ventas por cliente
router.get('/cliente/:cliente_id', ventaController.getVentasByCliente);

// GET /api/ventas/:id - Obtener una venta específica con sus detalles
router.get('/:id', ventaController.getVentaById);

module.exports = router;