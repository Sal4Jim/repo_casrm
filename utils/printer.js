const escpos = require('escpos');
// Importamos el adaptador de RED (WiFi/Ethernet)
const Network = require('escpos-network');

// Función para imprimir el ticket
const imprimirTicket = (venta) => {
    return new Promise((resolve, reject) => {
        try {
            // --- PREVISUALIZACIÓN EN CONSOLA (LEGIBLE) ---
            // Esto es solo para que TÚ puedas ver qué se está imprimiendo sin descifrar códigos raros.
            console.log('\n\n--- [SIMULACIÓN DE TICKET] ---');
            console.log('       TUMISOFT - Ticket de Venta       ');
            console.log('----------------------------------------');
            console.log(`Fecha: ${new Date(venta.fecha).toLocaleString()}`);
            console.log(`Cliente ID: ${venta.cliente_id || 'N/A'}`);
            console.log('----------------------------------------');

            if (venta.productos && venta.productos.length > 0) {
                venta.productos.forEach(prod => {
                    const nombreProducto = prod.nombre || `Producto #${prod.id}`;
                    console.log(`${nombreProducto}`);
                    console.log(`   ${prod.cantidad} x S/ ${Number(prod.precio).toFixed(2)} = S/ ${Number(prod.subtotal).toFixed(2)}`);
                });
            }

            console.log('----------------------------------------');
            console.log(`Subtotal:   S/ ${Number(venta.subtotal).toFixed(2)}`);
            console.log(`Descuento: -S/ ${Number(venta.descuento?.monto || 0).toFixed(2)}`);
            console.log(`TOTAL:      S/ ${Number(venta.total).toFixed(2)}`);
            device.open(function (error) {
                if (error) {
                    console.error("Error al abrir el dispositivo de impresión:", error);
                    return reject(error);
                }

                // Encabezado
                printer
                    .font('a')
                    .align('ct')
                    .style('bu')
                    .size(1, 1)
                    .text('TUMISOFT - Ticket de Venta')
                    .text('--------------------------------');

                // Información de la venta
                printer
                    .align('lt')
                    .style('normal')
                    .text(`Fecha: ${new Date(venta.fecha).toLocaleString()}`)
                    .text(`Cliente ID: ${venta.cliente_id || 'N/A'}`)
                    .text('--------------------------------');

                // Detalles de productos
                if (venta.productos && venta.productos.length > 0) {
                    venta.productos.forEach(prod => {
                        const nombreProducto = prod.nombre || `Producto #${prod.id}`;

                        printer.text(`${nombreProducto}`);
                        printer.align('rt').text(`${prod.cantidad} x S/ ${Number(prod.precio).toFixed(2)} = S/ ${Number(prod.subtotal).toFixed(2)}`);
                        printer.align('lt'); // Reset align
                    });
                }

                // Totales
                printer
                    .text('--------------------------------')
                    .align('rt')
                    .text(`Subtotal: S/ ${Number(venta.subtotal).toFixed(2)}`)
                    .text(`Descuento: -S/ ${Number(venta.descuento?.monto || 0).toFixed(2)}`)
                    .size(1, 1)
                    .text(`TOTAL: S/ ${Number(venta.total).toFixed(2)}`)
                    .text('--------------------------------')
                    .align('ct')
                    .text('¡Gracias por su compra!')
                    .cut()
                    .close();

                resolve(true);
            });
        } catch (err) {
            console.error("Error en la función imprimirTicket:", err);
            reject(err);
        }
    });
};

module.exports = { imprimirTicket };