// routes/categorias.routes.js

const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoria.controller');

router.get('/', categoriaController.getCategorias);      // GET /api/categorias
router.post('/', categoriaController.createCategoria);   // POST /api/categorias

module.exports = router;