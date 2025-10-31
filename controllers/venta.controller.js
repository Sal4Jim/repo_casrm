const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


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

/**
 * @function anularVenta
 * @description Anula una venta, restaurando el stock de productos y bonificaciones.
 * La venta no se elimina, sino que se marca como inactiva.
 */
exports.anularVenta = async (req, res) => {
    const { id } = req.params;
    const ventaId = parseInt(id);

    let connection;
    try {
        connection = await pool.promise().getConnection();
        await connection.beginTransaction();

        // 1. Verificar que la venta exista y no esté ya anulada
        const [ventaRows] = await connection.execute('SELECT * FROM venta WHERE compra_id = ?', [ventaId]);
        if (ventaRows.length === 0) {
            throw new Error('Venta no encontrada.');
        }
        if (ventaRows[0].activa === 0) {
            throw new Error('Esta venta ya ha sido anulada.');
        }

        // 2. Obtener todos los detalles de la venta (productos y bonificaciones)
        const [detalles] = await connection.execute('SELECT * FROM detalle_venta WHERE compra_id = ?', [ventaId]);

        // 3. Restaurar el stock para cada item
        for (const item of detalles) {
            if (item.producto_id) { // Es un producto regular
                await connection.execute('UPDATE productos SET stock = stock + ? WHERE producto_id = ?', [item.cantidad, item.producto_id]);
            } else if (item.bonificacion_id) { // Es una bonificación
                await connection.execute('UPDATE bonificaciones SET stock = stock + ? WHERE bonificacion_id = ?', [item.cantidad, item.bonificacion_id]);
            }
        }

        // 4. Marcar la venta como inactiva (anulada)
        await connection.execute('UPDATE venta SET activa = 0 WHERE compra_id = ?', [ventaId]);

        // 5. Confirmar la transacción
        await connection.commit();

        res.json({ success: true, message: 'Venta anulada y stock restaurado correctamente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error al anular la venta:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno del servidor al anular la venta.' });
    } finally {
        if (connection) connection.release();
    }
};

// Obtener todas las ventas de un cliente específico
exports.getVentasByCliente = async (req, res) => {
    const { cliente_id } = req.params;

    try {
        const query = `
            SELECT compra_id, fecha, total, activa
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

const COMPANY_INFO = {
    name: 'CASRM',
    address: 'Cal. Lloque Yupanqui Nro. 302 Urb. Chicago, Trujillo, Perú',
    phone: '+51 940 230 855',
    ruc: '20609736811',
    email: 'ventas@casrm.com',
    logoPath: path.join(__dirname, '..', 'public', 'images', 'logoCASRM.png')
};

exports.generatePdfVenta = async (req, res) => {
    const { id } = req.params;
    const ventaId = parseInt(id);

    let connection;
    try {
        connection = await pool.promise().getConnection();

        // 1. Obtener datos de la venta y del cliente
        const [ventaRows] = await connection.execute(
            `SELECT v.*, c.nombre as cliente_nombre, c.ruc as cliente_ruc, c.direccion as cliente_direccion, c.telefono as cliente_telefono
             FROM venta v 
             JOIN clientes c ON v.cliente_id = c.cliente_id 
             WHERE v.compra_id = ?`,
            [ventaId]
        );

        if (ventaRows.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, error: 'Venta no encontrada.' });
        }
        const venta = ventaRows[0];

        // 2. Obtener los detalles (productos y bonificaciones)
        const [detalleRows] = await connection.execute(
            `SELECT dv.*, p.nombre AS nombre_producto, b.nombre AS nombre_bonificacion, p.presentacion 
             FROM detalle_venta dv 
             LEFT JOIN productos p ON dv.producto_id = p.producto_id 
             LEFT JOIN bonificaciones b ON dv.bonificacion_id = b.bonificacion_id 
             WHERE dv.compra_id = ?`,
            [ventaId]
        );
        venta.detalles = detalleRows;

        // --- INICIO DE GENERACIÓN DE PDF ---
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const numeroVentaSecuencial = `VTA-${venta.compra_id.toString().padStart(5, '0')}`;
        const filename = `recibo_venta_${numeroVentaSecuencial}.pdf`;

        doc.info.Title = `Recibo de Venta - ${numeroVentaSecuencial}`;
        doc.info.Author = COMPANY_INFO.name;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // --- ENCABEZADO CON NUEVO COLOR ---
        const headerY = 30;
        if (fs.existsSync(COMPANY_INFO.logoPath)) {
            doc.image(COMPANY_INFO.logoPath, 30, headerY, { fit: [150, 80] });
        } else {
            doc.fontSize(20).font('Helvetica-Bold').text(COMPANY_INFO.name, 50, headerY);
        }

        const boxWidth = 200;
        const boxX = doc.page.width - boxWidth - 50;
        doc.rect(boxX, headerY, boxWidth, 60).stroke();
        doc.fillColor('#28a745') // Color verde para el título
           .fontSize(14).font('Helvetica-Bold').text('RECIBO DE VENTA', boxX, headerY + 10, { width: boxWidth, align: 'center' });
        
        doc.fillColor('black') // Restaurar color negro
           .fontSize(10).font('Helvetica')
           .text(`Nro: ${numeroVentaSecuencial}`, boxX + 10, headerY + 35);
        doc.text(`Fecha: ${new Date(venta.fecha).toLocaleDateString('es-ES')}`, boxX + 10, headerY + 50);

        // --- INFORMACIÓN DEL CLIENTE ---
        doc.y = headerY + 100;
        doc.fillColor('#444').fontSize(11).font('Helvetica-Bold').text('Cliente:', 50, doc.y);
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('black');
        doc.text(`Nombre / Razón Social: ${venta.cliente_nombre}`);
        doc.text(`RUC / DNI: ${venta.cliente_ruc}`);
        if (venta.cliente_telefono) doc.text(`Teléfono: ${venta.cliente_telefono}`);
        if (venta.cliente_direccion) doc.text(`Dirección: ${venta.cliente_direccion}`);

        // --- TABLA DE PRODUCTOS ---
        doc.moveDown(2);
        const tableTop = doc.y;

        const drawTableHeader = (y) => {
            doc.fontSize(10).font('Helvetica-Bold')
               .text('Ítem', 50, y)
               .text('P. Unit.', 300, y, { width: 70, align: 'right' })
               .text('Cant.', 380, y, { width: 50, align: 'center' })
               .text('Subtotal', 440, y, { width: 100, align: 'right' });
            doc.moveTo(50, y + 20).lineTo(doc.page.width - 50, y + 20).stroke();
        };

        drawTableHeader(tableTop);
        doc.y = tableTop + 25; // Move cursor down

        venta.detalles.forEach((item, index) => {
            const nombreItem = item.es_bonificacion ? `${item.nombre_bonificacion} (Bonificación)` : item.nombre_producto;
            
            // Calcular altura de la fila dinámicamente
            const rowHeight = Math.max(
                doc.heightOfString(nombreItem, { width: 240 }),
                20 // Altura mínima de fila
            ) + 10; // Padding

            // Verificar si la fila cabe en la página actual
            if (doc.y + rowHeight > doc.page.height - 150) { // Margen inferior para totales
                doc.addPage();
                drawTableHeader(50);
                doc.y = 75;
            }

            const y = doc.y;

            // Fondo para filas impares
            if (index % 2 !== 0) {
                doc.fillColor('#f3f4f6').rect(50, y, doc.page.width - 100, rowHeight).fill().fillColor('black');
            }

            const textY = y + 5; // Padding superior para el texto

            // Dibujar el contenido de la fila
            doc.font('Helvetica').fontSize(10);
            doc.text(nombreItem, 55, textY, { width: 240 });
            doc.text(`S/. ${Number(item.precio_unitario).toFixed(2)}`, 300, textY, { width: 70, align: 'right' });
            doc.text(item.cantidad.toString(), 380, textY, { width: 50, align: 'center' });
            doc.text(`S/. ${Number(item.subtotal).toFixed(2)}`, 440, textY, { width: 100, align: 'right' });
            doc.y += rowHeight;
        });

        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();

        // --- TOTALES ---
        const totalsLabelX = 350;
        const totalsValueX = 450;
        const totalsWidth = 100;
        let totalsY = doc.y + 15;

        if (totalsY > doc.page.height - 100) {
            doc.addPage();
            totalsY = 60;
        }

        doc.font('Helvetica').fontSize(10);
        doc.text('Subtotal:', totalsLabelX, totalsY, { width: totalsWidth, align: 'right' });
        doc.text(`S/. ${Number(venta.subtotal).toFixed(2)}`, totalsValueX, totalsY, { width: totalsWidth, align: 'right' });
        totalsY += 15;

        doc.text('Descuento:', totalsLabelX, totalsY, { width: totalsWidth, align: 'right' });
        doc.text(`- S/. ${Number(venta.descuento_venta).toFixed(2)}`, totalsValueX, totalsY, { width: totalsWidth, align: 'right' });
        totalsY += 20;

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('TOTAL:', totalsLabelX, totalsY, { width: totalsWidth, align: 'right' }).fillColor('#28a745'); // Color verde para el total
        doc.text(`S/. ${Number(venta.total).toFixed(2)}`, totalsValueX, totalsY, { width: totalsWidth, align: 'right' }).fillColor('black');

        // --- PIE DE PÁGINA (POSICIÓN RELATIVA) ---
        // Mover el cursor hacia abajo después de los totales
        doc.moveDown(4);

        // Si el cursor está muy cerca del final, añadir una nueva página para el agradecimiento
        if (doc.y > doc.page.height - 50) doc.addPage();

        doc.fontSize(9).font('Helvetica-Oblique').text('¡Gracias por su compra!', {
            align: 'center',
        });

        doc.end();

        doc.on('finish', () => {
            if (connection) connection.release();
        });

    } catch (error) {
        if (connection) connection.release();
        console.error('Error al generar PDF de venta:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Error interno del servidor al generar el PDF.' });
        }
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