const { pool } = require('../config/database');

/**
 * @function getReportesProductos
 * @description Obtiene los productos más vendidos por ingresos y por cantidad en un rango de fechas.
 */
exports.getReportesProductos = async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ success: false, error: 'Se requieren fechas de inicio y fin.' });
    }

    try {
        const query = `
            SELECT 
                p.nombre AS nombre_producto,
                SUM(dv.cantidad) AS total_cantidad,
                SUM(dv.subtotal) AS total_ingresos
            FROM detalle_venta dv
            JOIN venta v ON dv.compra_id = v.compra_id
            JOIN productos p ON dv.producto_id = p.producto_id
            WHERE v.fecha BETWEEN ? AND ?
              AND v.activa = 1
              AND dv.es_bonificacion = 0
              AND dv.producto_id IS NOT NULL
            GROUP BY p.producto_id, p.nombre
        `;

        const [results] = await pool.promise().execute(query, [startDate, endDate]);

        // Ordenar por ingresos y tomar el top 10
        const topPorIngresos = [...results]
            .sort((a, b) => b.total_ingresos - a.total_ingresos)
            .slice(0, 10);

        // Ordenar por cantidad y tomar el top 10
        const topPorCantidad = [...results]
            .sort((a, b) => b.total_cantidad - a.total_cantidad)
            .slice(0, 10);

        res.json({ success: true, topPorIngresos, topPorCantidad });

    } catch (error) {
        console.error('❌ Error al generar reporte de productos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};