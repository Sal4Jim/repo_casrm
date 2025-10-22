const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacion.controller');

// Ruta para crear una nueva cotización
router.post('/', cotizacionController.createCotizacion);
// Ruta para generar y descargar el PDF de una cotización
router.get('/:id/pdf', cotizacionController.generatePdfCotizacion);

module.exports = router;