const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');

// ✅ Ruta para OBTENER todos los clientes (GET)
router.get('/', clienteController.getAllClientes);

// ✅ Ruta para CREAR un cliente (POST)
router.post('/', clienteController.createCliente);

module.exports = router;