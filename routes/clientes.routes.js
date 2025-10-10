const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');

// Ruta para crear un cliente
router.post('/', clienteController.createCliente);

module.exports = router;