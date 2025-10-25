const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');

// --- Configuración de la Empresa para el PDF ---
const COMPANY_INFO = {
    name: 'CASRM',
    address: 'Cal. Lloque Yupanqui Nro. 302 Urb. Chicago, Trujillo, Perú',
    phone: '+51 940 230 855',
    ruc: '20609736811',
    email: 'ventas@casrm.com' // Añadido para más detalle
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
        observaciones, // <-- AÑADIDO
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
            `INSERT INTO cotizaciones (cliente_nombre, cliente_ruc, cliente_direccion, cliente_telefono, cliente_email, subtotal, descuento_total, total, validez_dias, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cliente_nombre,
                cliente_ruc,
                cliente_direccion || null,
                cliente_telefono || null,
                cliente_email || null,
                subtotal,
                descuento_total,
                total,
                validez_dias,
                observaciones || null // <-- AÑADIDO
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

        // --- ENCABEZADO  ---
        // Caja de informacion de la cotizacion de la izquierda
        const headerY = doc.y;
        doc.fontSize(22).font('Helvetica-Bold').text(COMPANY_INFO.name, 50, headerY, { align: 'left' });
        doc.fontSize(10).font('Helvetica').text(COMPANY_INFO.address, { align: 'left' });
        doc.text(`Email: ${COMPANY_INFO.email}`, { align: 'left' });
        doc.text(`Tel: ${COMPANY_INFO.phone} | RUC: ${COMPANY_INFO.ruc}`, { align: 'left' });

        // Caja de información de la cotización a la derecha
        const boxWidth = 200;
        const boxX = doc.page.width - boxWidth - 50;
        doc.rect(boxX, headerY - 10, boxWidth, 80).stroke();
        doc.fontSize(14).font('Helvetica-Bold').text('COTIZACIÓN', boxX, headerY, { width: boxWidth, align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Nro: COT-${cotizacion.cotizacion_id.toString().padStart(5, '0')}`, boxX + 10, headerY + 25); // Usar .padStart para formatear el ID
        doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-ES')}`, boxX + 10, headerY + 40);
        doc.text(`Válida por: ${cotizacion.validez_dias} días`, boxX + 10, headerY + 55);

        doc.moveDown(3); // Espacio después del encabezado

        // Datos del Cliente
        const clientY = doc.y;
        doc.fillColor('#444').fontSize(11).font('Helvetica-Bold').text('Cotizado a:', 50, clientY); 
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.font('Helvetica').fillColor('black');
        doc.text(`Nombre / Razón Social: ${cotizacion.cliente_nombre}`);
        doc.text(`RUC: ${cotizacion.cliente_ruc}`);
        if (cotizacion.cliente_direccion) doc.text(`Dirección: ${cotizacion.cliente_direccion}`);
        if (cotizacion.cliente_telefono) doc.text(`Telefono: ${cotizacion.cliente_telefono}`);
        if (cotizacion.cliente_email) doc.text(`Email: ${cotizacion.cliente_email}`);
        doc.moveDown(3);

        // Tabla de Productos
        const tableTop = doc.y;
        const itemX = 55;
        const presentacionX = 150;
        const precioX = 280;
        const cantidadX = 350;
        const descuentoX = 420;
        const subtotalX = 500;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Producto', itemX - 5, tableTop);
        doc.text('Presentación', presentacionX, tableTop);
        doc.text('P. Unit.', precioX, tableTop, { width: 60, align: 'right' });
        doc.text('Cant.', cantidadX, tableTop, { width: 50, align: 'right' });
        doc.text('Desc.', descuentoX, tableTop, { width: 60, align: 'right' });
        doc.text('Subtotal', subtotalX, tableTop, { width: 60, align: 'right' });
        doc.font('Helvetica');

        doc.moveTo(50, tableTop + 15)
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
            if (y > doc.page.height - 180) { // Añadir nueva página si se acerca al final (dejando espacio para footer)
                doc.addPage();
                y = 70; // Reiniciar Y para la nueva página
            }
        }

        doc.moveTo(itemX, y + 5)
           .lineTo(doc.page.width - 50, y + 5)
           .stroke();        
        y += 15;

        // Mostrar observaciones si existen
        if (cotizacion.observaciones) {
            doc.font('Helvetica-Bold').fontSize(10).text('Observaciones:', 50, y); // Título para las observaciones
            doc.font('Helvetica').fontSize(9).text(cotizacion.observaciones, { width: doc.page.width - 100 });
            y = doc.y + 15;
        }

        // Resumen de Totales
        const totalsLabelX = 350;
        const totalsValueX = 450;
        const totalsWidth = 100;

        doc.font('Helvetica').fontSize(10).text('Subtotal:', totalsLabelX, y, { width: totalsWidth, align: 'right' });
        doc.text(`S/. ${Number(cotizacion.subtotal).toFixed(2)}`, totalsValueX, y, { width: totalsWidth, align: 'right' });
        y += 15;
        doc.text('Descuento Total:', totalsLabelX, y, { width: totalsWidth, align: 'right' });
        doc.text(`S/. ${Number(cotizacion.descuento_total).toFixed(2)}`, totalsValueX, y, { width: totalsWidth, align: 'right' });
        y += 20;
        doc.font('Helvetica-Bold').fontSize(12).text('TOTAL:', totalsLabelX, y, { width: totalsWidth, align: 'right' });
        doc.text(`S/. ${Number(cotizacion.total).toFixed(2)}`, totalsValueX, y, { width: totalsWidth, align: 'right' });
        doc.font('Helvetica');

        // --- PIE DE PÁGINA (Ahora se posiciona dinámicamente) ---
        // Si el contenido de los totales deja menos de 100px de espacio al final, se añade una nueva página.
        if (doc.y > doc.page.height - 100) {
            doc.addPage();
            y = doc.y; 
        }

        const finalY = doc.page.height - 80;
        doc.moveTo(50, finalY).lineTo(doc.page.width - 50, finalY).stroke(); // Línea horizontal
        doc.fontSize(6).font('Helvetica')
           .text('Precios sujetos a cambio sin previo aviso después de la fecha de vencimiento.', 50, finalY + 10);
        doc.end();

        doc.on('finish', () => {
            if (connection) connection.release();
        });

    } catch (error) {
        if (connection) connection.release();
        console.error('Error al generar PDF de cotización:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al generar el PDF.' });
    }
};