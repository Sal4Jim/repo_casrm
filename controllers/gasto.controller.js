const { pool } = require('../config/database');

/**
 * @function getGastos
 * @description Obtiene todos los gastos de la base de datos con paginación.
 */
exports.getGastos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { startDate, endDate, search } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (startDate && endDate) {
            whereClause += ` AND g.fecha BETWEEN ? AND ?`;
            params.push(startDate, endDate + ' 23:59:59');
        }

        if (search) {
            whereClause += ` AND (g.descripcion LIKE ? OR r.nombre LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        // 1. Contar total
        const countSql = `
            SELECT COUNT(*) as total 
            FROM gastos g
            LEFT JOIN responsables r ON g.responsable_id = r.responsable_id
            ${whereClause}
        `;

        const [countResult] = await pool.promise().query(countSql, params);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // 2. Obtener datos paginados
        let query = `
            SELECT g.gasto_id, g.descripcion, g.monto, g.fecha, g.responsable_id, r.nombre as persona
            FROM gastos g
            LEFT JOIN responsables r ON g.responsable_id = r.responsable_id
            ${whereClause}
            ORDER BY g.fecha DESC, g.gasto_id DESC
            LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);

        const [gastos] = await pool.promise().query(query, params);

        res.json({
            success: true,
            gastos,
            total,
            page,
            totalPages,
            limit
        });
    } catch (error) {
        console.error('Error al obtener gastos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/**
 * @function createGasto
 * @description Crea un nuevo gasto en la base de datos.
 */
exports.createGasto = async (req, res) => {
    const { descripcion, monto, fecha, responsable_id } = req.body;

    if (!descripcion || !monto || !fecha || !responsable_id) {
        return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
    }

    try {
        const query = `
            INSERT INTO gastos (descripcion, monto, fecha, responsable_id)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.promise().execute(query, [descripcion, monto, fecha, responsable_id]);

        const [responsableRow] = await pool.promise().query('SELECT nombre FROM responsables WHERE responsable_id = ?', [responsable_id]);

        const nuevoGasto = {
            gasto_id: result.insertId,
            descripcion,
            monto: parseFloat(monto),
            fecha: fecha,
            persona: responsableRow[0].nombre
        };

        res.status(201).json({ success: true, message: 'Gasto registrado exitosamente.', gasto: nuevoGasto });

    } catch (error) {
        console.error('Error al crear el gasto:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/**
 * @function updateGasto
 * @description Actualiza un gasto existente en la base de datos.
 */
exports.updateGasto = async (req, res) => {
    const { id } = req.params;
    const { descripcion, monto, fecha, responsable_id } = req.body;

    if (!descripcion || !monto || !fecha || !responsable_id) {
        return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
    }

    try {
        const query = `
            UPDATE gastos 
            SET descripcion = ?, monto = ?, fecha = ?, responsable_id = ?
            WHERE gasto_id = ?
        `;
        const [result] = await pool.promise().execute(query, [descripcion, monto, fecha, responsable_id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Gasto no encontrado.' });
        }

        res.json({ success: true, message: 'Gasto actualizado exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar el gasto:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/**
 * @function deleteGasto
 * @description Elimina un gasto de la base de datos.
 */
exports.deleteGasto = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `DELETE FROM gastos WHERE gasto_id = ?`;
        const [result] = await pool.promise().execute(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Gasto no encontrado.' });
        }

        res.json({ success: true, message: 'Gasto eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar el gasto:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};