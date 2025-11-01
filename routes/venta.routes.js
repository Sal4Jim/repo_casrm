const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/venta.controller');

// GET /api/ventas - Obtener todas las ventas (para reportes)
router.get('/', ventaController.getAllVentas);

// POST /api/ventas - Crear una nueva venta
router.post('/', ventaController.createVenta);

// GET /api/ventas/cliente/:cliente_id - Obtener ventas por cliente
router.get('/cliente/:cliente_id', ventaController.getVentasByCliente);

// GET /api/ventas/:id - Obtener una venta específica con sus detalles
router.get('/:id', ventaController.getVentaById);

router.get('/:id/pdf', ventaController.generatePdfVenta);

router.put('/:id/anular', ventaController.anularVenta);

module.exports = router;