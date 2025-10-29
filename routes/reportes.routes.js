const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');

// GET /api/reportes/productos?startDate=...&endDate=...
router.get('/productos', reportesController.getReportesProductos);

module.exports = router;