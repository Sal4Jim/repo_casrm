const { pool } = require('../config/database');

/**
 * @function getGastos
 * @description Obtiene todos los gastos de la base de datos.
 */
exports.getGastos = async (req, res) => {
    try {
        const [gastos] = await pool.promise().query("SELECT * FROM gastos ORDER BY fecha DESC, gasto_id DESC");
        res.json({ success: true, gastos });
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
    const { descripcion, monto, fecha, persona } = req.body;

    if (!descripcion || !monto || !fecha || !persona) {
        return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
    }

    try {
        const query = `
            INSERT INTO gastos (descripcion, monto, fecha, persona)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.promise().execute(query, [descripcion, monto, fecha, persona]);

        const nuevoGasto = {
            gasto_id: result.insertId,
            descripcion,
            monto: parseFloat(monto),
            fecha,
            persona: persona // Corregido para coincidir con la tabla
        };

        res.status(201).json({ success: true, message: 'Gasto registrado exitosamente.', gasto: nuevoGasto });

    } catch (error) {
        console.error('Error al crear el gasto:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};