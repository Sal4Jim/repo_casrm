const { pool } = require('../config/database');

/**
 * @function getResponsables
 * @description Obtiene todos los responsables activos de la base de datos.
 */
exports.getResponsables = async (req, res) => {
    try {
        const status = req.query.status || 'activo'; // 'activo', 'inactivo', o 'todos'
        let query = "SELECT responsable_id, nombre, activo FROM responsables";
        
        if (status === 'activo') {
            query += " WHERE activo = 1";
        } else if (status === 'inactivo') {
            query += " WHERE activo = 0";
        }
        // Si es 'todos', no se añade WHERE

        query += " ORDER BY nombre ASC";
        const [responsables] = await pool.promise().query(query);
        res.json({ success: true, responsables: responsables });
    } catch (error) {
        console.error('Error al obtener responsables:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/**
 * @function createResponsable
 * @description Crea un nuevo responsable en la base de datos.
 */
exports.createResponsable = async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, error: 'El nombre es obligatorio.' });
    }
    try {
        const [result] = await pool.promise().execute('INSERT INTO responsables (nombre) VALUES (?)', [nombre.trim()]);
        res.status(201).json({ success: true, message: 'Responsable creado.', responsable: { responsable_id: result.insertId, nombre: nombre.trim() } });
    } catch (error) {
        console.error('Error al crear responsable:', error);
        res.status(500).json({ success: false, error: 'Error al crear el responsable. Es posible que ya exista.' });
    }
};

/**
 * @function updateResponsable
 * @description Actualiza el nombre de un responsable existente.
 */
exports.updateResponsable = async (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, error: 'El nombre es obligatorio.' });
    }
    try {
        const [result] = await pool.promise().execute('UPDATE responsables SET nombre = ? WHERE responsable_id = ?', [nombre.trim(), id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Responsable no encontrado.' });
        }
        res.json({ success: true, message: 'Responsable actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar responsable:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar el responsable.' });
    }
};

/**
 * @function toggleResponsableStatus
 * @description Activa o desactiva un responsable.
 */
exports.toggleResponsableStatus = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body; // Esperamos recibir el nuevo estado (0 o 1)

    if (activo === undefined || ![0, 1].includes(activo)) {
        return res.status(400).json({ success: false, error: 'El estado (activo) es inválido.' });
    }

    try {
        const [result] = await pool.promise().execute('UPDATE responsables SET activo = ? WHERE responsable_id = ?', [activo, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Responsable no encontrado.' });
        }
        const message = activo ? 'Responsable reactivado.' : 'Responsable desactivado.';
        res.json({ success: true, message });
    } catch (error) {
        console.error('Error al cambiar estado del responsable:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};