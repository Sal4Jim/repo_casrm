const express = require('express');
const router = express.Router();
const responsableController = require('../controllers/responsable.controller');

// GET /api/responsables - Obtener todos los responsables activos
router.get('/', responsableController.getResponsables);

// POST /api/responsables - Crear un nuevo responsable
router.post('/', responsableController.createResponsable);

// PUT /api/responsables/:id - Actualizar un responsable
router.put('/:id', responsableController.updateResponsable);

// PUT /api/responsables/:id/status - Cambiar el estado (activo/inactivo) de un responsable
router.put('/:id/status', responsableController.toggleResponsableStatus);

module.exports = router;