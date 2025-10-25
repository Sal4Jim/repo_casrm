document.addEventListener('DOMContentLoaded', function () {
    // --- Referencias a elementos del DOM ---
    const clienteSearchEl = document.getElementById('clienteSearch');
    const clienteNombreEl = document.getElementById('clienteNombre');
    const clienteRucEl = document.getElementById('clienteRuc');
    const clienteDireccionEl = document.getElementById('clienteDireccion');
    const clienteTelefonoEl = document.getElementById('clienteTelefono');
    const clienteEmailEl = document.getElementById('clienteEmail');

    const productoSearchEl = document.getElementById('productoSearch');
    const productosCotizacionTable = document.getElementById('productosCotizacionTable');

    const resumenSubtotalEl = document.getElementById('resumenSubtotal');
    const resumenDescuentoTotalEl = document.getElementById('resumenDescuentoTotal');
    const resumenTotalEl = document.getElementById('resumenTotal');

    const btnGuardarDescargarPdf = document.getElementById('btnGuardarDescargarPdf');
    const observacionesEl = document.getElementById('observaciones');

    // --- Variables de estado ---
    let clientesChoices;
    let productosChoices;
    let productosEnCotizacion = []; // Almacena los productos añadidos a la cotización
    let productosDisponibles = []; // Almacena los productos cargados en el buscador

    // --- Funciones de Utilidad ---

    // Función para mostrar notificaciones Toast (copiada de gestion-clientes.js)
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        const toastTypeClass = type === 'success' ? 'bg-success' : 'bg-danger';
        toast.className = `toast align-items-center text-white ${toastTypeClass} border-0 show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
        bsToast.show();
    }

    function createToastContainer() {
        let container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1090'; // Asegurar que esté sobre los modales
        document.body.appendChild(container);
        return container;
    }

    // Función para habilitar/deshabilitar botón de guardar
    function checkButtonStatus() {
        const nombreValido = clienteNombreEl.value.trim() !== '';
        const rucValido = clienteRucEl.value.trim() !== '';
        const hayProductos = productosEnCotizacion.length > 0;

        btnGuardarDescargarPdf.disabled = !(nombreValido && rucValido && hayProductos);
    }

    // --- Inicialización de Choices.js para Clientes ---
    clientesChoices = new Choices(clienteSearchEl, {
        shouldSort: false,
        searchEnabled: true,
        placeholderValue: 'Buscar cliente por nombre o RUC...',
        itemSelectText: 'Presione Enter para seleccionar',
        noResultsText: 'No se encontraron clientes',
        noChoicesText: 'Escriba para buscar clientes',
    });

    // Cargar clientes para el autocompletado
    clienteSearchEl.addEventListener('search', async function (event) {
        const searchTerm = event.detail.value;
        if (searchTerm.length < 3) { // Mínimo 3 caracteres para buscar
            clientesChoices.clearChoices();
            return;
        }
        try {
            const response = await axios.get(`/api/clientes?search=${searchTerm}&limit=10`);
            const clientes = response.data.clientes.map(c => ({
                value: c.cliente_id,
                label: `${c.nombre} (${c.ruc || 'N/A'})`,
                data: c // Guardar el objeto completo del cliente
            }));
            clientesChoices.setChoices(clientes, 'value', 'label', true);
        } catch (error) {
            console.error('Error al buscar clientes:', error);
            showToast('Error al buscar clientes.', 'error');
        }
    });

    // Rellenar campos del cliente al seleccionar uno
        clienteSearchEl.addEventListener('change', async function (event) {
        const clienteId = event.detail.value;

        if (clienteId) {
            try {
                // Hacemos una petición para obtener todos los datos del cliente seleccionado
                const response = await axios.get(`/api/clientes/${clienteId}`);
                if (response.data.success) {
                    const cliente = response.data.cliente;
                    clienteNombreEl.value = cliente.nombre || '';
                    clienteRucEl.value = cliente.ruc || '';
                    clienteDireccionEl.value = cliente.direccion || '';
                    clienteTelefonoEl.value = cliente.telefono || '';
                    clienteEmailEl.value = cliente.email || '';
                }
            } catch (error) {
                showToast('Error al cargar los datos completos del cliente.', 'error');
            }
        } else {
            // Si se deselecciona o se borra, limpiar campos
            clienteNombreEl.value = '';
            clienteRucEl.value = '';
            clienteDireccionEl.value = '';
            clienteTelefonoEl.value = '';
            clienteEmailEl.value = '';
        }
        checkButtonStatus();
    });

    // Escuchar cambios manuales en los campos del cliente
    [clienteNombreEl, clienteRucEl, clienteDireccionEl, clienteTelefonoEl, clienteEmailEl].forEach(el => {
        el.addEventListener('input', checkButtonStatus);
    });

    // --- Inicialización de Choices.js para Productos ---
    productosChoices = new Choices(productoSearchEl, {
        shouldSort: false,
        searchEnabled: true,
        placeholderValue: 'Buscar producto por nombre...',
        itemSelectText: 'Presione Enter para añadir',
        noResultsText: 'No se encontraron productos',
        noChoicesText: 'Escriba para buscar productos',
    });

    // Cargar productos para el autocompletado
    productoSearchEl.addEventListener('search', async function (event) {
        const searchTerm = event.detail.value;
        if (searchTerm.length < 1 && productosDisponibles.length > 0) { // No buscar si está vacío, a menos que sea la primera vez
            productosChoices.clearChoices();
            return;
        }
        try {
            const response = await axios.get(`/api/productos?search=${searchTerm}&limit=10`);
            productosDisponibles = response.data.productos; // Guardar los productos completos
            const choicesData = productosDisponibles.map(p => ({ // Asegúrate de que producto_id sea el valor correcto para Choices.js
                value: p.producto_id, // Asegúrate de que producto_id sea el valor correcto para Choices.js
                label: `${p.nombre} (${p.presentacion}) - S/. ${parseFloat(p.precio_venta).toFixed(2)}`,
                data: p // Guardar el objeto completo del producto
            }));
            productosChoices.setChoices(choicesData, 'value', 'label', true);
        } catch (error) {
            console.error('Error al buscar productos:', error);
            showToast('Error al buscar productos.', 'error');
        }
    });

    // Añadir producto a la cotización al seleccionarlo
    productoSearchEl.addEventListener('change', function (event) {
        console.log('Evento change de productoSearchEl disparado.');
        const selectedValue = event.detail.value;
        console.log('Valor seleccionado:', selectedValue);

        if (selectedValue) {
            // Buscar el producto completo en nuestro array de productos disponibles
            const producto = productosDisponibles.find(p => p.producto_id == selectedValue);
            if (!producto) {
                console.error('Producto no encontrado en la lista de disponibles. ID:', selectedValue);
                return;
            }

            console.log('Producto seleccionado (selectedOption.data):', producto);

            // Verificar si el producto ya está en la lista
            const existingProduct = productosEnCotizacion.find(p => p.producto_id == producto.producto_id);

            if (existingProduct) {
                console.log('Producto existente encontrado:', existingProduct);
                existingProduct.cantidad++; // Incrementar cantidad si ya existe
                showToast(`Cantidad de "${producto.nombre}" incrementada.`, 'info');
            } else {
                console.log('Producto NO existente, añadiendo nuevo.');
                productosEnCotizacion.push({
                    idUnico: Date.now() + Math.random(), // ID único para la fila en el frontend
                    producto_id: producto.producto_id,
                    nombre_producto: producto.nombre,
                    presentacion: producto.presentacion,
                    precio_unitario: parseFloat(producto.precio_venta),
                    cantidad: 1,
                    descuento_item: 0.00,
                    subtotal: parseFloat(producto.precio_venta)
                });
                showToast(`"${producto.nombre}" añadido a la cotización.`, 'success');
            }
            renderProductosCotizacion();
            productosChoices.setChoiceByValue(''); // Limpiar el select después de añadir
        } else {
            console.log('No se seleccionó ningún valor válido.');
        }
    });

    // --- Renderizado y Lógica de la Tabla de Productos ---
    function renderProductosCotizacion() {
        productosCotizacionTable.innerHTML = '';
        console.log('Renderizando productos de cotización. productosEnCotizacion:', productosEnCotizacion);
        if (productosEnCotizacion.length === 0) {
            productosCotizacionTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-box-open fa-2x mb-2 d-block"></i>
                        No hay productos en la cotización
                    </td>
                </tr>
            `;
        } else {
            productosEnCotizacion.forEach(prod => {
                const row = document.createElement('tr');
                row.dataset.idUnico = prod.idUnico;
                row.innerHTML = `
                    <td>${prod.nombre_producto}</td>
                    <td>${prod.presentacion}</td>
                    <td>S/. ${prod.precio_unitario.toFixed(2)}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm cantidad-input"
                               value="${prod.cantidad}" min="1" data-id-unico="${prod.idUnico}" style="width: 80px;">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm descuento-input"
                               value="${prod.descuento_item.toFixed(2)}" min="0" step="0.01" data-id-unico="${prod.idUnico}" style="width: 100px;">
                    </td>
                    <td>S/. <span class="subtotal-item">${prod.subtotal.toFixed(2)}</span></td>
                    <td class="actions-column">
                        <button class="btn btn-sm btn-danger delete-product-btn" data-id-unico="${prod.idUnico}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                productosCotizacionTable.appendChild(row);
            });
        }
        calcularTotales();
        checkButtonStatus();
    }

    // Manejar cambios en cantidad y descuento
    productosCotizacionTable.addEventListener('input', function (e) {
        const target = e.target;
        const idUnico = target.dataset.idUnico;
        const prodIndex = productosEnCotizacion.findIndex(p => p.idUnico == idUnico);

        if (prodIndex !== -1) {
            let valor = parseFloat(target.value);
            if (isNaN(valor) || valor < 0) valor = 0;

            if (target.classList.contains('cantidad-input')) {
                productosEnCotizacion[prodIndex].cantidad = Math.floor(valor);
            } else if (target.classList.contains('descuento-input')) {
                productosEnCotizacion[prodIndex].descuento_item = valor;
            }
            // Recalcular subtotal del item
            const prod = productosEnCotizacion[prodIndex];
            prod.subtotal = (prod.precio_unitario * prod.cantidad) - prod.descuento_item;
            if (prod.subtotal < 0) prod.subtotal = 0; // Evitar subtotales negativos

            // Actualizar el span del subtotal en la fila
            target.closest('tr').querySelector('.subtotal-item').textContent = prod.subtotal.toFixed(2);
            calcularTotales();
        }
    });

    // Manejar eliminación de producto
    productosCotizacionTable.addEventListener('click', function (e) {
        const deleteBtn = e.target.closest('.delete-product-btn');
        if (deleteBtn) {
            const idUnico = deleteBtn.dataset.idUnico;
            productosEnCotizacion = productosEnCotizacion.filter(p => p.idUnico != idUnico);
            showToast('Producto eliminado de la cotización.', 'info');
            renderProductosCotizacion();
        }
    });

    // --- Lógica de Totales ---
    function calcularTotales() {
        let subtotalGeneral = 0;
        let descuentoTotalGeneral = 0;

        productosEnCotizacion.forEach(prod => {
            subtotalGeneral += (prod.precio_unitario * prod.cantidad);
            descuentoTotalGeneral += prod.descuento_item;
        });

        const totalFinal = subtotalGeneral - descuentoTotalGeneral;

        resumenSubtotalEl.textContent = subtotalGeneral.toFixed(2);
        resumenDescuentoTotalEl.textContent = descuentoTotalGeneral.toFixed(2);
        resumenTotalEl.textContent = totalFinal.toFixed(2);
    }

    // --- Guardar y Descargar PDF ---
    btnGuardarDescargarPdf.addEventListener('click', async function () {
        // Deshabilitar botón y mostrar carga
        btnGuardarDescargarPdf.disabled = true;
        btnGuardarDescargarPdf.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';

        const cotizacionData = {
            cliente_nombre: clienteNombreEl.value.trim(),
            cliente_ruc: clienteRucEl.value.trim(),
            cliente_direccion: clienteDireccionEl.value.trim(),
            cliente_telefono: clienteTelefonoEl.value.trim(),
            cliente_email: clienteEmailEl.value.trim(),
            subtotal: parseFloat(resumenSubtotalEl.textContent),
            descuento_total: parseFloat(resumenDescuentoTotalEl.textContent),
            total: parseFloat(resumenTotalEl.textContent),
            validez_dias: 15, // Valor por defecto
            observaciones: observacionesEl.value.trim(), // <-- AÑADIDO
            productos: productosEnCotizacion.map(p => ({
                producto_id: p.producto_id,
                nombre_producto: p.nombre_producto,
                presentacion: p.presentacion,
                precio_unitario: p.precio_unitario,
                cantidad: p.cantidad,
                descuento_item: p.descuento_item,
                subtotal: p.subtotal
            }))
        };

        try {
            // Paso 1: Guardar la cotización
            const response = await axios.post('/api/cotizaciones', cotizacionData);
            if (response.data.success) {
                const cotizacionId = response.data.cotizacion_id;
                showToast(`Cotización Nro. ${cotizacionId} guardada exitosamente.`, 'success');

                // Paso 2: Generar y descargar el PDF
                const pdfResponse = await axios.get(`/api/cotizaciones/${cotizacionId}/pdf`, {
                    responseType: 'blob' // Importante para descargar archivos
                });

                const url = window.URL.createObjectURL(new Blob([pdfResponse.data], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `cotizacion_${cotizacionId}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                showToast('PDF de la cotización descargado.', 'success');

                // Limpiar formulario después de guardar
                limpiarFormulario();
            } else {
                throw new Error(response.data.error || 'Error desconocido al guardar la cotización.');
            }
        } catch (error) {
            console.error('Error al guardar o descargar cotización:', error);
            let errorMessage = 'Error al procesar la cotización.';
            if (error.response && error.response.data && error.response.data.error) {
                errorMessage = error.response.data.error;
            }
            showToast(`<i class="fas fa-times-circle me-2"></i> ${errorMessage}`, 'error');
        } finally {
            // Restaurar botón
            btnGuardarDescargarPdf.disabled = false;
            btnGuardarDescargarPdf.innerHTML = '<i class="fas fa-save me-2"></i> Guardar y Descargar PDF';
        }
    });

    // --- Función para limpiar el formulario ---
    function limpiarFormulario() {
        clienteSearchEl.value = '';
        clientesChoices.setChoiceByValue(''); // Limpiar selección de Choices.js
        clienteNombreEl.value = '';
        clienteRucEl.value = '';
        clienteDireccionEl.value = '';
        clienteTelefonoEl.value = '';
        clienteEmailEl.value = '';
        observacionesEl.value = ''; // <-- AÑADIDO

        productoSearchEl.value = '';
        productosChoices.setChoiceByValue(''); // Limpiar selección de Choices.js
        productosEnCotizacion = [];
        renderProductosCotizacion(); // Esto también recalcula totales y actualiza el estado del botón

        showToast('Formulario de cotización limpiado.', 'info');
    }

    // --- Inicialización al cargar la página ---
    renderProductosCotizacion(); // Renderiza la tabla vacía y deshabilita el botón inicialmente
});