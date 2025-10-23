const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const COMPANY_INFO = {
    name: 'CASRM',
    address: 'Cal. Lloque Yupanqui Nro. 302 Urb. Chicago, Trujillo, Perú',
    phone: '+51 940 230 855',
    ruc: '20609736811',
    email: 'ventas@casrm.com',
    logoPath: 'public/images/logoCASRM.png'
};

/**
 * @function createCotizacion
 * @description Crea una nueva cotización en la base de datos con sus productos asociados.
 * Maneja una transacción de base de datos para asegurar la integridad de los datos.
 *
 * @param {object} req - Objeto de solicitud de Express.
 * @param {object} req.body - Cuerpo de la solicitud, debe contener los datos del cliente y la lista de productos.
 * @param {string} req.body.cliente_nombre - Nombre o razón social del cliente.
 * @param {string} req.body.cliente_ruc - RUC del cliente.
 * @param {string} [req.body.cliente_direccion] - Dirección del cliente (opcional).
 * @param {string} [req.body.cliente_telefono] - Teléfono del cliente (opcional).
 * @param {string} [req.body.cliente_email] - Email del cliente (opcional).
 * @param {number} req.body.subtotal - Subtotal general antes de descuentos.
 * @param {number} req.body.descuento_total - Descuento total aplicado.
 * @param {number} req.body.total - Monto total de la cotización.
 * @param {number} req.body.validez_dias - Días de validez de la oferta.
 * @param {string} [req.body.observaciones] - Observaciones adicionales (opcional).
 * @param {Array<object>} req.body.productos - Array de productos de la cotización.
 *
 * @param {object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Envía una respuesta JSON indicando éxito o error.
 */
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
        observaciones, 
        productos
    } = req.body;

    if (!cliente_nombre || !cliente_ruc || !productos || productos.length === 0) {
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios para la cotización o no hay productos.' });
    }

    let connection;
    try {
        // Obtener una conexión del pool y Iniciar una transacción
        connection = await pool.promise().getConnection(); 
        await connection.beginTransaction();

        // 1. Insertar en la tabla principal `cotizaciones`
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
                observaciones || null
            ]
        );

        const cotizacion_id = cotizacionResult.insertId;

        // 2. Insertar cada producto en la tabla `detalle_cotizacion`
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

        // Confirmar la transacción
        await connection.commit();
        res.status(201).json({ success: true, message: 'Cotización guardada exitosamente', cotizacion_id: cotizacion_id });

    } catch (error) {
        // Revertir la transacción en caso de error
        if (connection) await connection.rollback();
        console.error('Error al crear cotización:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al guardar la cotización.' });
    } finally {
        // Liberar la conexión
        if (connection) connection.release();
    }
};

/**
 * @function generatePdfCotizacion
 * @description Genera un archivo PDF de una cotización existente y lo envía como descarga.
 *
 * @param {object} req - Objeto de solicitud de Express.
 * @param {object} req.params - Parámetros de la URL.
 * @param {string} req.params.id - El ID de la cotización a generar.
 *
 * @param {object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Envía un stream de PDF o una respuesta JSON de error.
 */
exports.generatePdfCotizacion = async (req, res) => {
    const { id } = req.params;
    const cotizacion_id = parseInt(id);

    let connection;
    try {
        connection = await pool.promise().getConnection();

        // 1. Obtener datos de la cabecera de la cotización
        const [cotizacionRows] = await connection.execute(
            `SELECT * FROM cotizaciones WHERE cotizacion_id = ?`,
            [cotizacion_id]
        );

        if (cotizacionRows.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, error: 'Cotización no encontrada.' });
        }
        const cotizacion = cotizacionRows[0];

        // 2. Obtener los detalles (productos) de la cotización
        const [detalleRows] = await connection.execute(
            `SELECT * FROM detalle_cotizacion WHERE cotizacion_id = ?`,
            [cotizacion_id]
        );
        cotizacion.productos = detalleRows; // Adjuntar productos al objeto principal

        // --- INICIO DE GENERACIÓN DE PDF ---
        const doc = new PDFDocument({ margin: 50 });
        const filename = `cotizacion_${cotizacion_id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // --- 1. ENCABEZADO (LOGO Y CAJA DE COTIZACIÓN) ---
        const headerY = doc.y;
        const rightColX = doc.page.width / 2 + 50;

        // Logo (Izquierda)
        try {
            if (fs.existsSync(COMPANY_INFO.logoPath)) {
                doc.image(COMPANY_INFO.logoPath, 30, headerY, { fit: [180, 90], align: 'center', valign: 'center' });
            } else {
                console.warn(`Logo no encontrado en: ${COMPANY_INFO.logoPath}`);
                doc.fontSize(22).font('Helvetica-Bold').text(COMPANY_INFO.name, 50, headerY);
            }
        } catch (e) {
            console.error('Error al cargar el logo:', e);
            doc.fontSize(22).font('Helvetica-Bold').text(COMPANY_INFO.name, 50, headerY);
        }

        // Caja de Cotización (Derecha)
        const boxWidth = 200;
        const boxX = doc.page.width - boxWidth - 50;
        doc.rect(boxX, headerY, boxWidth, 80).stroke();
        doc.fontSize(14).font('Helvetica-Bold').text('COTIZACIÓN', boxX, headerY + 5, { width: boxWidth, align: 'center' });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nro: COT-${cotizacion.cotizacion_id.toString().padStart(5, '0')}`, boxX + 10, headerY + 30);
        doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-ES')}`, boxX + 10, headerY + 45);
        doc.text(`Válida por: ${cotizacion.validez_dias} días`, boxX + 10, headerY + 60);

        // --- 2. INFORMACIÓN DE EMPRESA Y CLIENTE ---
        const infoStartY = headerY + 100; // Espacio después del logo/caja
        let leftY = infoStartY;
        let rightY = infoStartY;

        // Información de la Empresa (Izquierda)
        doc.fontSize(10).font('Helvetica-Bold').text(COMPANY_INFO.name, 50, leftY);
        leftY += 12;
        doc.font('Helvetica').text(COMPANY_INFO.address, 50, leftY);
        leftY += 12;
        doc.text(`Email: ${COMPANY_INFO.email}`, 50, leftY);
        leftY += 12;
        doc.text(`Tel: ${COMPANY_INFO.phone} | RUC: ${COMPANY_INFO.ruc}`, 50, leftY);

        // Información del Cliente (Derecha)
        doc.fillColor('#444').fontSize(11).font('Helvetica-Bold').text('Cotizado a:', rightColX, rightY);
        rightY += 15;
        doc.fontSize(10).font('Helvetica').fillColor('black');
        doc.text(`Nombre / Razón Social: ${cotizacion.cliente_nombre}`, rightColX, rightY, { width: 220 });
        rightY = doc.y + 2; // Ajustar Y después del texto
        doc.text(`RUC: ${cotizacion.cliente_ruc}`, rightColX, rightY, { width: 220 });
        rightY = doc.y + 2;
        if (cotizacion.cliente_direccion) doc.text(`Dirección: ${cotizacion.cliente_direccion}`, rightColX, rightY, { width: 220 });
        rightY = doc.y + 2;
        if (cotizacion.cliente_telefono) doc.text(`Telefono: ${cotizacion.cliente_telefono}`, rightColX, rightY, { width: 220 });
        rightY = doc.y + 2;
        if (cotizacion.cliente_email) doc.text(`Email: ${cotizacion.cliente_email}`, rightColX, rightY, { width: 220 });

        // --- 3. TABLA DE PRODUCTOS ---
        doc.y = Math.max(leftY, rightY) + 30; // Posicionar cursor debajo de la columna más larga
        const tableTop = doc.y;

        // Definir columnas de la tabla
        const tableColumns = {
            producto: { x: 50, width: 140, label: 'Producto' },
            presentacion: { x: 190, width: 120, label: 'Presentación' },
            precio: { x: 310, width: 60, align: 'right', label: 'P. Unit.' },
            cantidad: { x: 370, width: 50, align: 'right', label: 'Cant.' },
            descuento: { x: 420, width: 60, align: 'right', label: 'Desc.' },
            subtotal: { x: 480, width: 70, align: 'right', label: 'Subtotal' }
        };

        // Función para dibujar la cabecera de la tabla
        const drawTableHeader = (y) => {
            doc.fontSize(10).font('Helvetica-Bold');
            for (const colKey in tableColumns) {
                const col = tableColumns[colKey];
                doc.text(col.label, col.x, y, { width: col.width, align: col.align || 'left' });
            }
            doc.moveTo(50, y + 15).lineTo(doc.page.width - 50, y + 15).stroke();
        };

        // Función para calcular la altura de una fila
        const calculateRowHeight = (prod) => {
            // Usar el tamaño de fuente actual para el cálculo
            doc.fontSize(10).font('Helvetica');
            const productNameHeight = doc.heightOfString(prod.nombre_producto, { width: tableColumns.producto.width });
            const presentationHeight = doc.heightOfString(prod.presentacion, { width: tableColumns.presentacion.width });
            const actualRowContentHeight = Math.max(productNameHeight, presentationHeight);
            const rowPadding = 10; // Padding vertical para la fila
            return actualRowContentHeight + rowPadding;
        };

        // Función para dibujar una fila de la tabla (con cálculo de altura)
        const drawTableRow = (prod, y, isEven, rowHeight) => {
            // Dibujar fondo para filas impares (index % 2 !== 0)
            if (isEven) {
                doc.fillColor('#f3f4f6') // Color gris claro
                   .rect(50, y, doc.page.width - 100, rowHeight) // Dibujar rectángulo
                   .fill(); // Rellenar, sin borde
                doc.fillColor('black'); // Restablecer color de relleno para el texto
            }

            doc.fontSize(10).font('Helvetica');
            const textY = y + 5; // Pequeño padding superior para el texto

            doc.text(prod.nombre_producto, tableColumns.producto.x, textY, { width: tableColumns.producto.width, align: 'left' });
            doc.text(prod.presentacion, tableColumns.presentacion.x, textY, { width: tableColumns.presentacion.width, align: 'left' });
            doc.text(`S/. ${Number(prod.precio_unitario).toFixed(2)}`, tableColumns.precio.x, textY, { width: tableColumns.precio.width, align: 'right' });
            doc.text(prod.cantidad.toString(), tableColumns.cantidad.x, textY, { width: tableColumns.cantidad.width, align: 'right' });
            doc.text(`S/. ${Number(prod.descuento_item).toFixed(2)}`, tableColumns.descuento.x, textY, { width: tableColumns.descuento.width, align: 'right' });
            doc.text(`S/. ${Number(prod.subtotal).toFixed(2)}`, tableColumns.subtotal.x, textY, { width: tableColumns.subtotal.width, align: 'right' });
        };

        drawTableHeader(tableTop);
        doc.y = tableTop + 25;

        cotizacion.productos.forEach((prod, index) => {
            const rowHeight = calculateRowHeight(prod);

            // Salto de página si no hay suficiente espacio para la fila actual
            if (doc.y + rowHeight > doc.page.height - 100) { // -100 para dejar espacio para el pie de página y totales
                doc.addPage();
                drawTableHeader(50); // Redibujar cabecera en la nueva página
                doc.y = 75; // Posicionar cursor debajo de la nueva cabecera
            }
            drawTableRow(prod, doc.y, index % 2 !== 0, rowHeight);
            doc.y += rowHeight; // Avanzar doc.y por la altura real de la fila
        });

        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(2);

        // --- 4. OBSERVACIONES Y TOTALES ---
        if (cotizacion.observaciones) {
            doc.font('Helvetica-Bold').text('Observaciones:', 50, doc.y);
            doc.font('Helvetica').fontSize(9).text(cotizacion.observaciones, { width: doc.page.width - 100 });
            doc.moveDown();
        }

        // Totales (a la derecha)
        const totalsLabelX = 350;
        const totalsValueX = 450;
        const totalsWidth = 100;
        let totalsY = doc.y < tableTop + 60 ? tableTop + 60 : doc.y; // Asegurar que los totales no se superpongan si la tabla es muy corta

        doc.font('Helvetica').fontSize(10).text('Subtotal:', totalsLabelX, totalsY, { width: totalsWidth, align: 'right' });
        doc.text(`S/. ${Number(cotizacion.subtotal).toFixed(2)}`, totalsValueX, totalsY, { width: totalsWidth, align: 'right' });
        totalsY += 15;
        doc.text('Descuento Total:', totalsLabelX, totalsY, { width: totalsWidth, align: 'right' });
        doc.text(`S/. ${Number(cotizacion.descuento_total).toFixed(2)}`, totalsValueX, totalsY, { width: totalsWidth, align: 'right' });
        totalsY += 20;
        doc.font('Helvetica-Bold').fontSize(12).text('TOTAL:', totalsLabelX, totalsY, { width: totalsWidth, align: 'right' });
        doc.text(`S/. ${Number(cotizacion.total).toFixed(2)}`, totalsValueX, totalsY, { width: totalsWidth, align: 'right' });

        // --- 5. PIE DE PÁGINA ---
        const finalY = doc.page.height - 80;
        doc.moveTo(50, finalY).lineTo(doc.page.width - 50, finalY).stroke();
        doc.fontSize(6).font('Helvetica').text('Precios sujetos a cambio sin previo aviso después de la fecha de vencimiento.', 50, finalY + 10);

        doc.end();

        doc.on('finish', () => {
            if (connection) connection.release();
        });

    } catch (error) {
        if (connection) connection.release();
        console.error('Error al generar PDF de cotización:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Error interno del servidor al generar el PDF.' });
        }
    }
};
