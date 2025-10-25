const express = require('express');
const router = express.Router();
const bonificacionController = require('../controllers/bonificacion.controller');

// GET /api/bonificaciones/activas - Obtener todas las bonificaciones activas
router.get('/activas', bonificacionController.getActiveBonificaciones);

module.exports = router;