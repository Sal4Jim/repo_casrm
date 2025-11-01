const express = require('express');
const router = express.Router();
const bonificacionController = require('../controllers/bonificacion.controller');

router.get('/activas', bonificacionController.getBonificacionesActivas);

router.get('/con-stock', bonificacionController.getActiveBonificaciones);

router.post('/', bonificacionController.createBonificacion);

router.put('/:id', bonificacionController.updateBonificacion);

router.delete('/:id', bonificacionController.deleteBonificacion);

module.exports = router;