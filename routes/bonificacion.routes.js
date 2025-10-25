// routes/bonificacion.routes.js
const express = require('express');
const router = express.Router();
const bonificacionController = require('../controllers/bonificacion.controller');

// Obtener todas las bonificaciones
router.get('/', bonificacionController.getBonificaciones);

// Obtener solo las bonificaciones activas
router.get('/activas', bonificacionController.getBonificacionesActivas);

// Crear una nueva bonificación
router.post('/', bonificacionController.createBonificacion);

// Actualizar una bonificación (stock, presentacion, activo)
router.put('/:id', bonificacionController.updateBonificacion);

// Eliminar una bonificación
router.delete('/:id', bonificacionController.deleteBonificacion);

module.exports = router;