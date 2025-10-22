const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');

// --- Configuración de la Empresa para el PDF ---
const COMPANY_INFO = {
    name: 'CASRM',
    address: 'CAL.LLOQUE YUPANQUI NRO. 302 URB. CHICAGO, Trujillo, Perú',
    phone: '+51 932 142 279',
    ruc: '20609736811'
};

// POST /api/cotizaciones - Crear una nueva cotización
exports.createCotizacion = async (req, res) => {
    const {
        cliente_nombre,
        cliente_ruc,
        cliente_direccion,
        cliente_telefono,
        cliente_email,
        subtotal,
        descuento_total,
        total,
        validez_dias,
        productos
    } = req.body;

    if (!cliente_nombre || !cliente_ruc || !productos || productos.length === 0) {
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios para la cotización o no hay productos.' });
    }

    let connection;
    try {
        connection = await pool.promise().getConnection();
        await connection.beginTransaction();

        // 1. Insertar en la tabla `cotizaciones`
        const [cotizacionResult] = await connection.execute(
            `INSERT INTO cotizaciones (cliente_nombre, cliente_ruc, cliente_direccion, cliente_telefono, cliente_email, subtotal, descuento_total, total, validez_dias)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cliente_nombre,
                cliente_ruc,
                cliente_direccion || null,
                cliente_telefono || null,
                cliente_email || null,
                subtotal,
                descuento_total,
                total,
                validez_dias
            ]
        );

        const cotizacion_id = cotizacionResult.insertId;

        // 2. Insertar en la tabla `detalle_cotizacion`
        for (const prod of productos) {
            await connection.execute(
                `INSERT INTO detalle_cotizacion (cotizacion_id, producto_id, nombre_producto, presentacion, precio_unitario, cantidad, descuento_item, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cotizacion_id,
                    prod.producto_id || null,
                    prod.nombre_producto,
                    prod.presentacion,
                    prod.precio_unitario,
                    prod.cantidad,
                    prod.descuento_item,
                    prod.subtotal
                ]
            );
        }

        await connection.commit();
        res.status(201).json({ success: true, message: 'Cotización guardada exitosamente', cotizacion_id: cotizacion_id });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al crear cotización:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al guardar la cotización.' });
    } finally {
        if (connection) connection.release();
    }
};

// GET /api/cotizaciones/:id/pdf - Generar y descargar PDF de una cotización
exports.generatePdfCotizacion = async (req, res) => {
    const { id } = req.params;
    const cotizacion_id = parseInt(id);

    let connection;
    try {
        connection = await pool.promise().getConnection();

        // 1. Obtener datos de la cotización
        const [cotizacionRows] = await connection.execute(
            `SELECT * FROM cotizaciones WHERE cotizacion_id = ?`,
            [cotizacion_id]
        );

        if (cotizacionRows.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, error: 'Cotización no encontrada.' });
        }
        const cotizacion = cotizacionRows[0];

        // 2. Obtener detalles de los productos de la cotización
        const [detalleRows] = await connection.execute(
            `SELECT * FROM detalle_cotizacion WHERE cotizacion_id = ?`,
            [cotizacion_id]
        );
        cotizacion.productos = detalleRows;

        // --- Generar PDF ---
        const doc = new PDFDocument({ margin: 50 });
        const filename = `cotizacion_${cotizacion_id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Encabezado de la empresa
        doc.fontSize(20).text(COMPANY_INFO.name, { align: 'center' });
        doc.fontSize(10).text(COMPANY_INFO.address, { align: 'center' });
        doc.text(`Teléfono: ${COMPANY_INFO.phone} | RUC: ${COMPANY_INFO.ruc}`, { align: 'center' });
        doc.moveDown();

        // Título de la cotización
        doc.fontSize(16).text('COTIZACIÓN', { align: 'center' });
        doc.moveDown();

        // Información de la cotización
        doc.fontSize(10);
        doc.text(`Nro. Cotización: COT-${cotizacion.cotizacion_id.toString().padStart(5, '0')}`, { align: 'right' });
        doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-ES')}`, { align: 'right' });
        doc.moveDown();

        // Datos del Cliente
        doc.fontSize(12).text('Datos del Cliente:', { underline: true });
        doc.fontSize(10);
        doc.text(`Nombre/Razón Social: ${cotizacion.cliente_nombre}`);
        doc.text(`RUC: ${cotizacion.cliente_ruc}`);
        if (cotizacion.cliente_direccion) doc.text(`Dirección: ${cotizacion.cliente_direccion}`);
        if (cotizacion.cliente_telefono) doc.text(`Teléfono: ${cotizacion.cliente_telefono}`);
        if (cotizacion.cliente_email) doc.text(`Email: ${cotizacion.cliente_email}`);
        doc.moveDown();

        // Tabla de Productos
        const tableTop = doc.y;
        const itemX = 50;
        const presentacionX = 150;
        const precioX = 280;
        const cantidadX = 350;
        const descuentoX = 420;
        const subtotalX = 500;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Producto', itemX, tableTop);
        doc.text('Presentación', presentacionX, tableTop);
        doc.text('P. Unit.', precioX, tableTop, { width: 60, align: 'right' });
        doc.text('Cant.', cantidadX, tableTop, { width: 50, align: 'right' });
        doc.text('Desc.', descuentoX, tableTop, { width: 60, align: 'right' });
        doc.text('Subtotal', subtotalX, tableTop, { width: 60, align: 'right' });
        doc.font('Helvetica');

        doc.moveTo(itemX, tableTop + 15)
           .lineTo(doc.page.width - 50, tableTop + 15)
           .stroke();

        let y = tableTop + 30;
        for (const prod of cotizacion.productos) {
            doc.text(prod.nombre_producto, itemX, y);
            doc.text(prod.presentacion, presentacionX, y);
            doc.text(`S/. ${Number(prod.precio_unitario).toFixed(2)}`, precioX, y, { width: 60, align: 'right' });
            doc.text(prod.cantidad.toString(), cantidadX, y, { width: 50, align: 'right' });
            doc.text(`S/. ${Number(prod.descuento_item).toFixed(2)}`, descuentoX, y, { width: 60, align: 'right' });
            doc.text(`S/. ${Number(prod.subtotal).toFixed(2)}`, subtotalX, y, { width: 60, align: 'right' });
            y += 20;
            if (y > doc.page.height - 150) { // Añadir nueva página si se acerca al final
                doc.addPage();
                y = 70; // Reiniciar Y para la nueva página
            }
        }

        doc.moveTo(itemX, y + 5)
           .lineTo(doc.page.width - 50, y + 5)
           .stroke();
        doc.moveDown();

        // Resumen de Totales
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Subtotal:`, 400, y + 20, { align: 'right' });
        doc.text(`S/. ${Number(cotizacion.subtotal).toFixed(2)}`, 500, y + 20, { width: 60, align: 'right' });
        doc.text(`Descuento Total:`, 400, y + 35, { align: 'right' });
        doc.text(`S/. ${Number(cotizacion.descuento_total).toFixed(2)}`, 500, y + 35, { width: 60, align: 'right' });
        doc.fontSize(12).text(`TOTAL:`, 400, y + 50, { width: 100, align: 'right' });
        doc.text(`S/. ${Number(cotizacion.total).toFixed(2)}`, 500, y + 50, { width: 60, align: 'right' });
        doc.font('Helvetica');
        doc.moveDown(2);

        // Pie de Página (Leyendas)
        doc.fontSize(9).text('Cotización válida por 15 días.', 50, doc.page.height - 70);
        doc.text('Precios sujetos a cambio.', 50, doc.page.height - 55);

        doc.end();

        // Liberar la conexión solo después de que el stream del PDF haya finalizado
        doc.on('finish', () => {
            if (connection) connection.release();
        });

    } catch (error) {
        if (connection) connection.release();
        console.error('Error al generar PDF de cotización:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al generar el PDF.' });
    }
};