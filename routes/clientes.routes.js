const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');

router.get('/', clienteController.getAllClientes);
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.get('/:id', clienteController.getClienteById);
router.put('/:id/status', clienteController.toggleClienteStatus); // Reemplaza a delete
router.put('/:id/notas', clienteController.updateNotasCliente);

module.exports = router;