const express = require('express');
const clientesRoutes = require('./routes/clientes.routes');
const productosRoutes = require('./routes/productos.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const ventaRoutes = require('./routes/venta.routes');
const bonificacionesRoutes = require('./routes/bonificaciones.routes');
const gastoRoutes = require('./routes/gasto.routes.js'); // Importar rutas de gastos
const { testConnection } = require('./config/database');

const app = express();

// Middleware para archivos estáticos
app.use(express.static('public'));

// Middleware para parsear JSON
app.use(express.json());

// Rutas de la API
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/bonificaciones', bonificacionesRoutes);
app.use('/api/gastos', gastoRoutes); // Usar rutas de gastos

// Ruta de prueba para la base de datos (con callback)
app.get('/test-db', (req, res) => {
  testConnection((result) => {
    res.json(result);
  });
});

// Ruta de prueba del servidor
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  
  // Probar conexión a la base de datos al iniciar
  console.log('🔌 Probando conexión a la base de datos...');
  testConnection((result) => {
    if (result.success) {
      console.log('✅ Base de datos conectada correctamente');
    } else {
      console.log('❌ Error conectando a base de datos:', result.error);
    }
  });
});