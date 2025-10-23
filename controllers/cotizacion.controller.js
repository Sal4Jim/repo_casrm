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

        // --- Definición de Constantes de Layout ---
        const MARGEN_IZQUIERDO = 60;
        const MARGEN_SUPERIOR = 50;


        /**
         * Dibuja el logo y la caja de "COTIZACIÓN".
         * @returns {number} - La posición Y inicial para la siguiente sección.
         */
        const generarEncabezado = () => {
            let currentLeftY = MARGEN_SUPERIOR;
            const logoX = 30;
            const logoWidth = 180; 
            const logoHeight = 90; 
            
            try {
                if (fs.existsSync(COMPANY_INFO.logoPath)) {
                    doc.image(COMPANY_INFO.logoPath, logoX, currentLeftY, { 
                        fit: [logoWidth, logoHeight], 
                        align: 'center', 
                        valign: 'center' 
                    });
                    currentLeftY += logoHeight + 40;
                } else {
                    console.warn(`Logo image not found at path: ${COMPANY_INFO.logoPath}. Skipping logo.`);
                    doc.fontSize(22).font('Helvetica-Bold').text(COMPANY_INFO.name, MARGEN_IZQUIERDO, currentLeftY);
                    currentLeftY += 25; 
                }
            } catch (e) {
                console.error('Error loading logo image:', e);
                doc.fontSize(22).font('Helvetica-Bold').text(COMPANY_INFO.name, MARGEN_IZQUIERDO, currentLeftY);
                currentLeftY += 25; 
            }

            // --- Encabezado: Caja de Cotización (Arriba Derecha) ---
            const boxWidth = 200;
            const boxX = doc.page.width - boxWidth - MARGEN_IZQUIERDO;
            const boxY = MARGEN_SUPERIOR;

            doc.rect(boxX, boxY, boxWidth, 80).stroke();
            doc.fontSize(14).font('Helvetica-Bold').text('COTIZACIÓN', boxX, boxY + 5, { width: boxWidth, align: 'center' });
            doc.fontSize(10).font('Helvetica');
            doc.text(`Nro: COT-${cotizacion.cotizacion_id.toString().padStart(5, '0')}`, boxX + 10, boxY + 30);
            doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-ES')}`, boxX + 10, boxY + 45);
            doc.text(`Válida por: ${cotizacion.validez_dias} días`, boxX + 10, boxY + 60);
            return currentLeftY; 
        };

        /**
         * Dibuja la información de la empresa y del cliente, alineadas.
         * @param {number} startLeftY - La posición Y donde comienza la info de la empresa.
         * @returns {number} - La posición Y final después de dibujar ambas columnas.
         */
        
        const generarInformacion = (startLeftY) => {
            const rightColX = doc.page.width / 2 + 50;
            const rightColWidth = doc.page.width / 2 - MARGEN_IZQUIERDO - 20;

            let currentRightY = MARGEN_SUPERIOR + 120;
            
            // --- Información de la Empresa (Izquierda) ---
            let companyInfoY = startLeftY - 60;
            doc.fontSize(10).font('Helvetica-Bold').text(COMPANY_INFO.name, MARGEN_IZQUIERDO, companyInfoY);
            companyInfoY += 12;
            doc.font('Helvetica').text(COMPANY_INFO.address, MARGEN_IZQUIERDO, companyInfoY);
            companyInfoY += 12;
            doc.text(`Email: ${COMPANY_INFO.email}`, MARGEN_IZQUIERDO, companyInfoY);
            companyInfoY += 12;
            doc.text(`Tel: ${COMPANY_INFO.phone} | RUC: ${COMPANY_INFO.ruc}`, MARGEN_IZQUIERDO, companyInfoY);

            // --- Información del Cliente (Derecha) ---
            doc.fillColor('#444').fontSize(11).font('Helvetica-Bold').text('Cotizado a:', rightColX, currentRightY);
            currentRightY += 15; 
            doc.fontSize(10).font('Helvetica').fillColor('black');
            doc.text(`Nombre / Razón Social: ${cotizacion.cliente_nombre}`, rightColX, currentRightY, { width: rightColWidth });
            currentRightY += 12;
            doc.text(`RUC: ${cotizacion.cliente_ruc}`, rightColX, currentRightY, { width: rightColWidth });
            currentRightY += 12;
            
            if (cotizacion.cliente_direccion) {
                doc.text(`Dirección: ${cotizacion.cliente_direccion}`, rightColX, currentRightY, { width: rightColWidth });
                currentRightY += 12;
            }
            if (cotizacion.cliente_telefono) {
                doc.text(`Telefono: ${cotizacion.cliente_telefono}`, rightColX, currentRightY, { width: rightColWidth });
                currentRightY += 12;
            }
            if (cotizacion.cliente_email) {
                doc.text(`Email: ${cotizacion.cliente_email}`, rightColX, currentRightY, { width: rightColWidth });
                currentRightY += 12;
            }
            
            return Math.max(companyInfoY, currentRightY) + 20; // Retorna la Y más baja de ambas columnas + un espacio
        };

        /**
         * Dibuja la tabla de productos (cabecera, filas y líneas).
         * Maneja los saltos de página.
         * @param {number} startY - La posición Y donde comienza la tabla.
         * @returns {number} - La posición Y final después de dibujar la tabla.
         */
        const generarTablaItems = (startY) => {
            const tableTop = startY;
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

            doc.moveTo(50, tableTop + 15).lineTo(doc.page.width - 50, tableTop + 15).stroke();

            let y = tableTop + 30;
            
            for (const prod of cotizacion.productos) {
                doc.text(prod.nombre_producto, itemX, y);
                doc.text(prod.presentacion, presentacionX, y);
                doc.text(`S/. ${Number(prod.precio_unitario).toFixed(2)}`, precioX, y, { width: 60, align: 'right' });
                doc.text(prod.cantidad.toString(), cantidadX, y, { width: 50, align: 'right' });
                doc.text(`S/. ${Number(prod.descuento_item).toFixed(2)}`, descuentoX, y, { width: 60, align: 'right' });
                doc.text(`S/. ${Number(prod.subtotal).toFixed(2)}`, subtotalX, y, { width: 60, align: 'right' });
                y += 20;

                // Control de salto de página
                if (y > doc.page.height - 180) {
                    doc.addPage();
                    y = 70;
                }
            }

            doc.moveTo(itemX, y + 5).lineTo(doc.page.width - 50, y + 5).stroke();
            return y + 15;
        };

        /**
         * Dibuja las observaciones y el resumen de totales.
         * @param {number} startY - La posición Y donde comienza esta sección.
         */
        const generarResumen = (startY) => {
            let y = startY;

            if (cotizacion.observaciones) {
                doc.font('Helvetica-Bold').fontSize(10).text('Observaciones:', 50, y);
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

            if (doc.y > doc.page.height - 100) {
                doc.addPage();
            }
        };

        /**
         * Dibuja el pie de página fijo en la parte inferior.
         */
        const generarPieDePagina = () => {
            const finalY = doc.page.height - 80;
            doc.moveTo(50, finalY).lineTo(doc.page.width - 50, finalY).stroke();
            doc.fontSize(6).font('Helvetica')
               .text('Precios sujetos a cambio sin previo aviso después de la fecha de vencimiento.', 50, finalY + 10);
        };

        const infoStartY = generarEncabezado();
        const tableStartY = generarInformacion(infoStartY);
        const summaryStartY = generarTablaItems(tableStartY);
        generarResumen(summaryStartY);
        generarPieDePagina();
        
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
