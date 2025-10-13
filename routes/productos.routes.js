// routes/productos.routes.js

const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');

router.get('/', productoController.getProducts);          // GET /api/productos
router.post('/', productoController.createProduct);      // POST /api/productos
router.put('/:id', productoController.updateProduct);    // PUT /api/productos/:id
router.delete('/:id', productoController.deleteProduct); // DELETE /api/productos/:id

module.exports = router;