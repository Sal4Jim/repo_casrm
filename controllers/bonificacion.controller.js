const { pool } = require('../config/database');

// Obtener todas las bonificaciones activas y con stock
exports.getActiveBonificaciones = (req, res) => {
    // Se buscan bonificaciones activas y con stock mayor a 0
    const query = `
        SELECT * 
        FROM bonificaciones 
        WHERE activo = 1 AND stock > 0 
        ORDER BY nombre ASC
    `;
    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Error al obtener bonificaciones:', err);
            return res.status(500).json({ error: 'Error al obtener bonificaciones' });
        }
        res.json(results);
    });
};