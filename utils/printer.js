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
            console.log('----------------------------------------');
            console.log('       ¡Gracias por su compra!          ');
            console.log('--- [FIN DE SIMULACIÓN] ---\n\n');


            // --- IMPRESIÓN REAL (RED / WIFI) ---
            // CAMBIAR ESTA IP POR LA DE TU IMPRESORA
            const PRINTER_IP = '192.168.100.83'; // IP REAL DE LA IMPRESORA
            const PRINTER_PORT = 9100; // Puerto estándar para impresoras

            const device = new Network(PRINTER_IP, PRINTER_PORT);
            // Usamos 'IBM850' (cp850) que es el estándar para tildes/ñ en estas impresoras
            const options = { encoding: "IBM850" };
            const printer = new escpos.Printer(device, options);

            device.open(function (error) {
                if (error) {
                    console.error("Error al abrir el dispositivo de impresión:", error);
                    return reject(error);
                }

                // Encabezado
                printer
                    .font('a')         // Fuente normal para título
                    .align('ct')
                    .style('b')        // Solo negrita (bold), sin subrayado raro
                    .size(1, 1)
                    .text('TUMISOFT - Ticket de Venta')
                    .text('--------------------------------');

                // Información de la venta
                printer
                    .font('b')         // Fuente B (más pequeña) para el contenido
                    .align('lt')
                    .style('normal')   // Resetear estilos
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
                    .style('b') // Negrita para el total
                    .text(`TOTAL: S/ ${Number(venta.total).toFixed(2)}`)
                    .style('normal')
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