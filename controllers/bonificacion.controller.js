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

// GET /api/bonificaciones/activas - Obtener solo bonificaciones activas
exports.getBonificacionesActivas = (req, res) => {
    const query = `
        SELECT b.*, c.nombre as categoria_nombre
        FROM bonificaciones b
        LEFT JOIN categorias c ON b.categoria_id = c.categoria_id
        WHERE b.activo = 1
        ORDER BY b.bonificacion_id DESC;
    `;
    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Error al obtener bonificaciones activas:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.json(results);
    });
};

// POST /api/bonificaciones - Crear una nueva bonificación desde un producto
exports.createBonificacion = async (req, res) => {
    const { producto_id, stock } = req.body;

    if (!producto_id || stock === undefined) {
        return res.status(400).json({ error: 'Faltan campos requeridos: producto_id y stock.' });
    }

    try {
        // 1. Buscar el producto original
        const [productos] = await pool.promise().execute('SELECT * FROM productos WHERE producto_id = ?', [producto_id]);

        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto original no encontrado.' });
        }
        const productoOriginal = productos[0];

        // 2. Crear la nueva bonificación
        const insertQuery = `
            INSERT INTO bonificaciones (producto_id, nombre, categoria_id, valor_bonif, stock, presentacion, activo)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `;
        const values = [
            producto_id,
            productoOriginal.nombre,
            productoOriginal.categoria_id,
            productoOriginal.precio_venta, // Copia el precio de venta como valor
            stock,
            productoOriginal.presentacion, // Copia la presentación del producto
        ];

        const [result] = await pool.promise().execute(insertQuery, values);

        // 3. Obtener el nombre de la categoría para la respuesta
        const [categorias] = await pool.promise().execute('SELECT nombre FROM categorias WHERE categoria_id = ?', [productoOriginal.categoria_id]);
        const categoria_nombre = categorias.length > 0 ? categorias[0].nombre : null;

        // 3. Devolver el objeto creado
        const nuevaBonificacion = {
            bonificacion_id: result.insertId,
            producto_id,
            nombre: productoOriginal.nombre,
            categoria_nombre: categoria_nombre,
            valor_bonif: productoOriginal.precio_venta,
            stock,
            presentacion: productoOriginal.presentacion,
            activo: 1,
        };

        res.status(201).json(nuevaBonificacion);

    } catch (err) {
        console.error('Error al crear la bonificación:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// PUT /api/bonificaciones/:id - Actualizar una bonificación
exports.updateBonificacion = (req, res) => {
    const { id } = req.params;
    const { stock, presentacion, activo, valor_bonif } = req.body;

    // Construir la consulta dinámicamente
    let fields = [];
    let values = [];
    if (stock !== undefined) { fields.push('stock = ?'); values.push(stock); }
    if (valor_bonif !== undefined) { fields.push('valor_bonif = ?'); values.push(valor_bonif); }
    if (presentacion !== undefined) { fields.push('presentacion = ?'); values.push(presentacion); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo); }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    values.push(id);
    const query = `UPDATE bonificaciones SET ${fields.join(', ')} WHERE bonificacion_id = ?`;

    pool.execute(query, values, (err, result) => {
        if (err) {
            console.error('Error al actualizar la bonificación:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Bonificación no encontrada.' });
        }
        res.json({ message: 'Bonificación actualizada correctamente.' });
    });
};

// DELETE /api/bonificaciones/:id - Eliminar una bonificación
exports.deleteBonificacion = (req, res) => {
    const { id } = req.params;
    pool.execute('DELETE FROM bonificaciones WHERE bonificacion_id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar la bonificación:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Bonificación no encontrada.' });
        }
        res.status(204).send(); // No content
    });
};