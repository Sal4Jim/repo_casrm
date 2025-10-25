const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/venta.controller');

// POST /api/ventas - Crear una nueva venta
router.post('/', ventaController.createVenta);

module.exports = router;