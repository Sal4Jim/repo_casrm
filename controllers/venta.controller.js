const { pool } = require('../config/database');

exports.createVenta = async (req, res) => {
    const {
        cliente_id,
        fecha,
        productos,
        subtotal,
        descuento, // { valor, tipo, monto }
        total,
        bonificaciones // array de bonificaciones
    } = req.body;

    // Validaciones básicas
    if (!cliente_id || !fecha || !productos || productos.length === 0) {
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios (cliente, fecha, productos).' });
    }

    let connection;
    try {
        connection = await pool.promise().getConnection();
        await connection.beginTransaction();

        // 1. Insertar en la tabla `venta`
        const ventaQuery = `
            INSERT INTO venta (cliente_id, fecha, subtotal, total, descuento_venta)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [ventaResult] = await connection.execute(ventaQuery, [
            cliente_id,
            fecha,
            subtotal,
            total,
            descuento.monto
        ]);

        const compra_id = ventaResult.insertId;

        // 2. Insertar en `detalle_venta` y actualizar stock
        for (const prod of productos) {
            // Insertar detalle
            const detalleQuery = `
                INSERT INTO detalle_venta (compra_id, producto_id, precio_unitario, cantidad, subtotal)
                VALUES (?, ?, ?, ?, ?)
            `;
            await connection.execute(detalleQuery, [
                compra_id,
                prod.id,
                prod.precio,
                prod.cantidad,
                prod.subtotal
            ]);

            // Actualizar stock del producto
            const stockQuery = `UPDATE productos SET stock = stock - ? WHERE producto_id = ?`;
            await connection.execute(stockQuery, [prod.cantidad, prod.id]);
        }

        // 3. Insertar bonificaciones en `detalle_venta` y actualizar su stock
        if (bonificaciones && bonificaciones.length > 0) {
            for (const bonif of bonificaciones) {
                const detalleBonifQuery = `
                    INSERT INTO detalle_venta (compra_id, producto_id, precio_unitario, cantidad, subtotal, es_bonificacion, bonificacion_id)
                    VALUES (?, NULL, 0, ?, 0, 1, ?)
                `;
                await connection.execute(detalleBonifQuery, [
                    compra_id,
                    bonif.cantidad,
                    bonif.id // El id de la bonificación
                ]);

                // Actualizar stock de la bonificación
                const stockBonifQuery = `UPDATE bonificaciones SET stock = stock - ? WHERE bonificacion_id = ?`;
                await connection.execute(stockBonifQuery, [bonif.cantidad, bonif.id]);
            }
        }


        // 3. Confirmar transacción
        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Venta registrada exitosamente',
            venta_id: compra_id
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error al registrar la venta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al registrar la venta.' });
    } finally {
        if (connection) connection.release();
    }
};

// Obtener todas las ventas de un cliente específico
exports.getVentasByCliente = async (req, res) => {
    const { cliente_id } = req.params;

    try {
        const query = `
            SELECT compra_id, fecha, total 
            FROM venta 
            WHERE cliente_id = ? 
            ORDER BY fecha DESC
        `;
        const [ventas] = await pool.promise().query(query, [cliente_id]);
        res.json({ success: true, ventas });
    } catch (error) {
        console.error('❌ Error al obtener ventas del cliente:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

// Obtener los detalles de una venta específica
exports.getVentaById = async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener datos principales de la venta
        const [ventaRows] = await pool.promise().query('SELECT * FROM venta WHERE compra_id = ?', [id]);
        if (ventaRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Venta no encontrada.' });
        }
        const venta = ventaRows[0];

        // Obtener detalles (productos y bonificaciones)
        const detalleQuery = `
            SELECT 
                dv.*,
                p.nombre AS nombre_producto,
                b.nombre AS nombre_bonificacion
            FROM detalle_venta dv
            LEFT JOIN productos p ON dv.producto_id = p.producto_id
            LEFT JOIN bonificaciones b ON dv.bonificacion_id = b.bonificacion_id
            WHERE dv.compra_id = ?
        `;
        const [detalles] = await pool.promise().query(detalleQuery, [id]);

        venta.detalles = detalles;

        res.json({ success: true, venta });
    } catch (error) {
        console.error(`❌ Error al obtener detalle de la venta ${id}:`, error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/**
 * @function getAllVentas
 * @description Obtiene todas las ventas de la base de datos para los reportes.
 */
exports.getAllVentas = async (req, res) => {
    try {
        const query = `
            SELECT compra_id, cliente_id, fecha, total FROM venta ORDER BY fecha DESC
        `;
        const [ventas] = await pool.promise().query(query);
        res.json({ success: true, ventas });
    } catch (error) {
        console.error('❌ Error al obtener todas las ventas:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};