document.addEventListener('DOMContentLoaded', function () {
    let currentPage = 1;
    const itemsPerPage = 5;

    // --- VALIDACIÓN EN TIEMPO REAL PARA EL CAMPO TELÉFONO ---
    const telefonoInput = document.getElementById('telefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function (e) {
            // Reemplaza cualquier caracter que NO sea un dígito por una cadena vacía
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    // --- VALIDACIÓN EN TIEMPO REAL PARA NOMBRE Y CIUDAD (NO NÚMEROS) ---
    const nombreInput = document.getElementById('nombre');
    const ciudadInput = document.getElementById('ciudad');

    const filterNumbers = function (e) {
        // Reemplaza cualquier dígito por una cadena vacía
        e.target.value = e.target.value.replace(/\d/g, '');
    };

    if (nombreInput) nombreInput.addEventListener('input', filterNumbers);
    if (ciudadInput) ciudadInput.addEventListener('input', filterNumbers);



    cargarClientes(1, true);

    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCliente);
    }


    const nuevoClienteBtn = document.querySelector('[data-bs-target="#clientModal"]');
    if (nuevoClienteBtn) {
        nuevoClienteBtn.addEventListener('click', function () {
            document.getElementById('clienteForm')?.reset();
            document.getElementById('clienteId').value = '';

            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Nuevo Cliente';
            }
            if (btnGuardar) {
                btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i> Guardar';
            }
        });
    }

    async function guardarCliente() {
        const clienteId = document.getElementById('clienteId')?.value;
        const cliente = {
            nombre: document.getElementById('nombre')?.value.trim(),
            ruc: document.getElementById('ruc')?.value.trim(),
            ciudad: document.getElementById('ciudad')?.value.trim(),
            telefono: document.getElementById('telefono')?.value.trim(),
            direccion: document.getElementById('direccion')?.value.trim(),
            email: document.getElementById('email')?.value.trim(),
            agencia: document.getElementById('agencia')?.value.trim()
        };

        if (!cliente.nombre || !cliente.telefono || !cliente.ciudad) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> Los campos <strong>Nombre</strong>, <strong>Teléfono</strong> y <strong>Ciudad</strong> son obligatorios', 'error');
            return;
        }

        // --- VALIDACIONES ADICIONALES ---
        const contieneNumeros = (texto) => /\d/.test(texto);

        if (contieneNumeros(cliente.nombre)) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> El campo <strong>Nombre</strong> no puede contener números.', 'error');
            return;
        }

        if (contieneNumeros(cliente.ciudad)) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> El campo <strong>Ciudad</strong> no puede contener números.', 'error');
            return;
        }

        const soloNumeros = /^\d+$/;
        if (!soloNumeros.test(cliente.telefono)) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> El campo <strong>Teléfono</strong> solo debe contener números.', 'error');
            return;
        }

        setButtonLoading(btnGuardar, true);

        const url = clienteId ? `/api/clientes/${clienteId}` : '/api/clientes';
        const method = clienteId ? 'put' : 'post';
        const actionText = clienteId ? 'actualizado' : 'guardado';

        try {
            const response = await axios[method](url, cliente);
            if (response.data.success) {
                showToast(`<i class="fas fa-check-circle me-2"></i> Cliente <strong>${cliente.nombre}</strong> ${actionText} exitosamente`, 'success');

                // Usamos un pequeño delay para que el usuario vea el toast antes de cerrar el modal
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
                    if (modal) modal.hide();
                    document.getElementById('clienteForm')?.reset();
                    document.getElementById('clienteId').value = '';
                    cargarClientes(clienteId ? currentPage : 1);
                }, 1500);
            }
        } catch (error) {
            let mensaje = `Error al ${actionText.slice(0, -1)}ar el cliente`;
            if (error.response?.data?.error) {
                mensaje = error.response.data.error;
            } else if (error.request) {
                mensaje = "No se pudo conectar con el servidor";
            }
            showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
        } finally {
            setButtonLoading(btnGuardar, false);
            // Restaurar el texto del botón según si era edición o creación
            if (btnGuardar) {
                const buttonText = clienteId ? '<i class="fas fa-sync-alt me-2"></i> Actualizar' : '<i class="fas fa-save me-2"></i> Guardar';
                btnGuardar.innerHTML = buttonText;
            }
        }
    }

    function actualizarTablaClientes(clientes) {
        const tbody = document.querySelector('#clientsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (clientes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-users fa-2x mb-2 d-block"></i>
                        No hay clientes registrados
                    </td>
                </tr>
            `;
            return;
        }

        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            if (cliente.activo === 0) row.classList.add('table-secondary', 'text-muted');
            row.innerHTML = `
               <td>${cliente.nombre || '<span class="text-muted">No especificado</span>'}</td>
               <td>${cliente.ruc || '<span class="text-muted">-</span>'}</td>
               <td>${cliente.ciudad || '<span class="text-muted">-</span>'}</td>
               <td>${cliente.telefono || '<span class="text-muted">-</span>'}</td>
            <td>
               <button class="btn btn-sm btn-primary me-1 edit-btn" data-bs-toggle="modal" data-bs-target="#clientModal" data-cliente-id="${cliente.cliente_id}">
               <i class="fas fa-edit"></i>
               </button>
               ${cliente.activo === 1
                    ? `<button class="btn btn-sm btn-danger me-1 status-btn" data-cliente-id="${cliente.cliente_id}" data-status="0" title="Desactivar Cliente"><i class="fas fa-user-slash"></i></button>`
                    : `<button class="btn btn-sm btn-success me-1 status-btn" data-cliente-id="${cliente.cliente_id}" data-status="1" title="Reactivar Cliente"><i class="fas fa-user-check"></i></button>`
                }
               <button class="btn btn-sm btn-info me-1" data-bs-toggle="modal" data-bs-target="#customerDetailModal" data-cliente-id="${cliente.cliente_id}">
               <i class="fas fa-info-circle"></i>
               </button>
               <button class="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#addSaleModal" data-cliente-id="${cliente.cliente_id}">
               <i class="fas fa-shopping-cart"></i>
               </button>
            </td>`;
            tbody.appendChild(row);
        });
    }

    function renderPagination(totalPages, currentPage) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        pagination.innerHTML = '';

        if (totalPages <= 1) return;

        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Anterior">&laquo;</a>`;
        if (currentPage > 1) {
            prevLi.addEventListener('click', (e) => {
                e.preventDefault();
                cargarClientes(currentPage - 1);
            });
        }
        pagination.appendChild(prevLi);

        // Números de página con ventana deslizante
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Primera página
        if (startPage > 1) {
            const li = document.createElement('li');
            li.className = 'page-item';
            li.innerHTML = `<a class="page-link" href="#">1</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                cargarClientes(1);
            });
            pagination.appendChild(li);

            if (startPage > 2) {
                const liDots = document.createElement('li');
                liDots.className = 'page-item disabled';
                liDots.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(liDots);
            }
        }

        // Páginas centrales
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                cargarClientes(i);
            });
            pagination.appendChild(li);
        }

        // Última página
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const liDots = document.createElement('li');
                liDots.className = 'page-item disabled';
                liDots.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(liDots);
            }

            const li = document.createElement('li');
            li.className = 'page-item';
            li.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                cargarClientes(totalPages);
            });
            pagination.appendChild(li);
        }

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente">&raquo;</a>`;
        if (currentPage < totalPages) {
            nextLi.addEventListener('click', (e) => {
                e.preventDefault();
                cargarClientes(currentPage + 1);
            });
        }
        pagination.appendChild(nextLi);
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-custom toast-${type} show`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong class="me-auto">
                    ${type === 'success' ? '✅ Éxito' : '❌ Error'}
                </strong>
                <small>ahora</small>
                <button type="button" class="btn-close" onclick="document.getElementById('${toastId}').remove()"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            const el = document.getElementById(toastId);
            if (el && el.parentNode) el.remove();
        }, 4000);
    }

    function setButtonLoading(button, isLoading) {
        if (!button) return;
        button.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...'
            : '<i class="fas fa-save me-2"></i> Guardar';
        button.disabled = isLoading;
    }

    async function cargarClientes(page = 1, showNotification = false) {
        currentPage = page;
        const searchTerm = document.querySelector('.search-box input').value.trim();
        const mostrarInactivos = document.getElementById('switchMostrarInactivos').checked;
        const status = mostrarInactivos ? 'todos' : 'activo';

        // console.log(`🔄 Cargando clientes - Página ${page} ${searchTerm ? `(Búsqueda: "${searchTerm}")` : ''}`);

        const params = new URLSearchParams({
            page: page,
            limit: itemsPerPage,
            status: status
        });
        if (searchTerm) params.append('search', searchTerm);

        try {
            const response = await axios.get(`/api/clientes?${params.toString()}`);
            if (response.data.success) {
                actualizarTablaClientes(response.data.clientes);
                renderPagination(response.data.totalPages, page);
                if (showNotification && !searchTerm) {
                    showToast(`<i class="fas fa-users me-2"></i> ${response.data.total} clientes cargados`, 'success');
                }
            }
        } catch (error) {
            console.error('Error cargando clientes:', error);
            showToast('<i class="fas fa-exclamation-triangle me-2"></i> Error al cargar clientes', 'error');
        }
    }

    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                cargarClientes(1, false);
            }, 400);
        });
    }

    const switchInactivos = document.getElementById('switchMostrarInactivos');
    if (switchInactivos) {
        switchInactivos.addEventListener('change', function () {
            currentPage = 1;
            cargarClientes(1, false);
        });
    }

    let clienteIdParaNotas = null;
    let notasOriginales = '';
    const customerDetailModal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
    const saleDetailModal = new bootstrap.Modal(document.getElementById('saleDetailModal'));

    document.addEventListener('click', async function (e) {
        const editBtn = e.target.closest('.edit-btn');
        const statusBtn = e.target.closest('.status-btn');
        const detailModalBtn = e.target.closest('[data-bs-target="#customerDetailModal"]');
        const printSaleBtn = e.target.closest('.print-sale-btn');
        const exportCsvBtn = e.target.closest('#btnExportarHistorialCSV');

        const anularVentaBtn = e.target.closest('#btnAnularVenta');
        const addSaleModalBtn = e.target.closest('[data-bs-target="#addSaleModal"]');
        const saleDetailBtn = e.target.closest('.sale-detail-btn');

        if (editBtn) {
            const clienteId = editBtn.getAttribute('data-cliente-id');
            try {
                const response = await axios.get(`/api/clientes/${clienteId}`);
                if (response.data.success) {
                    const cliente = response.data.cliente;
                    document.getElementById('clienteId').value = cliente.cliente_id || '';
                    document.getElementById('nombre').value = cliente.nombre || '';
                    document.getElementById('ruc').value = cliente.ruc || '';
                    document.getElementById('ciudad').value = cliente.ciudad || '';
                    document.getElementById('telefono').value = cliente.telefono || '';
                    document.getElementById('direccion').value = cliente.direccion || '';
                    document.getElementById('email').value = cliente.email || '';
                    document.getElementById('agencia').value = cliente.agencia || '';

                    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i> Editar Cliente';
                    if (btnGuardar) {
                        btnGuardar.innerHTML = '<i class="fas fa-sync-alt me-2"></i> Actualizar';
                    }
                }
            } catch (error) {
                showToast('<i class="fas fa-exclamation-triangle me-2"></i> Error al cargar cliente', 'error');
            }
            return;
        }

        if (statusBtn) {
            const clienteId = statusBtn.dataset.clienteId;
            const nuevoStatus = parseInt(statusBtn.dataset.status);
            const accion = nuevoStatus === 1 ? 'reactivar' : 'desactivar';
            const clienteNombre = statusBtn.closest('tr').querySelector('td:first-child').textContent.trim();

            Swal.fire({
                title: '¿Estás seguro?',
                html: `Vas a <strong>${accion}</strong> al cliente <strong>${clienteNombre}</strong>.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: `Sí, ${accion}`,
                cancelButtonText: 'Cancelar',
                reverseButtons: true
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const response = await axios.put(`/api/clientes/${clienteId}/status`, { activo: nuevoStatus === 1 });
                        if (response.data.success) {
                            showToast(`<i class="fas fa-check-circle me-2"></i> Cliente <strong>${clienteNombre}</strong> ${accion}do exitosamente`, 'success');
                            cargarClientes(currentPage);
                        }
                    } catch (error) {
                        const mensaje = error.response?.data?.error || `Error al ${accion} el cliente.`;
                        showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
                    }
                }
            });
            return;
        }

        if (detailModalBtn) {
            const clienteId = detailModalBtn.getAttribute('data-cliente-id');
            if (!clienteId) return;

            clienteIdParaNotas = clienteId;
            setNotasEditMode(false);

            try {
                const response = await axios.get(`/api/clientes/${clienteId}`);
                if (response.data.success) {
                    const cliente = response.data.cliente || {};
                    const setField = (id, value) => {
                        const el = document.getElementById(id);
                        if (el) el[el.tagName === 'TEXTAREA' ? 'value' : 'textContent'] = (value !== undefined && value !== null && String(value).trim() !== '') ? value : (el.tagName === 'TEXTAREA' ? '' : '-');
                    };

                    setField('detail-nombre', cliente.nombre);
                    setField('detail-ciudad', cliente.ciudad);
                    setField('detail-ruc', cliente.ruc);
                    setField('detail-telefono', cliente.telefono);
                    setField('detail-email', cliente.email);
                    setField('detail-agencia', cliente.agencia);
                    setField('detail-direccion', cliente.direccion);
                    setField('detail-notas', cliente.notas);

                    cargarHistorialCompras(clienteId);
                }
            } catch (error) {
                showToast('<i class="fas fa-exclamation-triangle me-2"></i> Error al cargar datos del cliente', 'error');
            }
            return;
        }

        if (saleDetailBtn) {
            const ventaId = saleDetailBtn.dataset.ventaId;
            const numeroCompra = saleDetailBtn.dataset.numeroCompra;
            const clienteNombre = document.getElementById('detail-nombre').textContent;
            if (ventaId) {
                customerDetailModal.hide();
                cargarDetalleVenta(ventaId, clienteNombre, numeroCompra);
            }
            return;
        }

        if (exportCsvBtn) {
            if (clienteIdParaNotas) {
                exportarHistorialCSV(clienteIdParaNotas);
            }
            return;
        }


        if (anularVentaBtn) {
            const ventaId = anularVentaBtn.dataset.ventaId;
            if (!ventaId) return;

            Swal.fire({
                title: '¿Estás seguro?',
                text: "Esta acción anulará la venta y restaurará el stock de los productos. No se puede deshacer.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, anular venta',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const response = await axios.put(`/api/ventas/${ventaId}/anular`);
                        if (response.data.success) {
                            showToast(response.data.message, 'success');
                            saleDetailModal.hide();
                            cargarHistorialCompras(clienteIdParaNotas);
                        }
                    } catch (error) {
                        const mensaje = error.response?.data?.error || 'Error al anular la venta.';
                        showToast(mensaje, 'error');
                    }
                }
            });
        }

        if (addSaleModalBtn) {
            e.preventDefault();
            const clienteId = addSaleModalBtn.getAttribute('data-cliente-id');
            const clienteNombre = addSaleModalBtn.closest('tr').querySelector('td:first-child').textContent.trim();

            // Guardar el ID del cliente en un input oculto o un atributo de datos
            const saleClientIdInput = document.getElementById('saleClientId');
            if (saleClientIdInput && clienteId) {
                saleClientIdInput.value = clienteId;
            }

            const saleClientNameInput = document.getElementById('saleClientName');
            if (saleClientNameInput) {
                saleClientNameInput.value = clienteNombre;
            }

            const addSaleModalEl = document.getElementById('addSaleModal');
            if (addSaleModalEl) {
                const modal = bootstrap.Modal.getOrCreateInstance(addSaleModalEl);
                modal.show();
                // Cargar productos y bonificaciones para los selectores
                cargarProductosVenta();
                cargarBonificacionesVenta();
            }
        }
    });

    // --- LÓGICA PARA EL NUEVO MODAL DE VENTA ---
    let productosVenta = [];
    let bonificacionesDisponibles = [];
    let productosSeleccionadosVenta = [];
    let productoSearchChoices = null;
    let bonificacionSearchChoices = null;

    function cargarProductosVenta() {
        axios.get('/api/productos?limit=1000') // Obtener todos los productos
            .then(response => {
                if (response.data && Array.isArray(response.data.productos)) {
                    productosVenta = response.data.productos;
                    const selectEl = document.getElementById('productoSearch');

                    if (!productoSearchChoices) {
                        productoSearchChoices = new Choices(selectEl, {
                            searchEnabled: true,
                            itemSelectText: 'Seleccionar',
                            placeholder: true,
                            placeholderValue: 'Buscar producto...',
                            allowHTML: false,
                        });
                    }
                    const choicesData = productosVenta.map(p => ({ value: p.producto_id, label: `${p.nombre} (Stock: ${p.stock})` }));
                    productoSearchChoices.clearStore();
                    productoSearchChoices.setChoices(choicesData, 'value', 'label', true);
                }
            })
            .catch(error => {
                console.error('Error al cargar productos para la venta:', error);
                showToast('Error al cargar productos', 'error');
            });
    }

    function cargarBonificacionesVenta() {
        axios.get('/api/bonificaciones/activas')
            .then(response => {
                if (response.data && Array.isArray(response.data)) {
                    bonificacionesDisponibles = response.data;
                    const selectEl = document.getElementById('bonificacionSearch');
                    if (!bonificacionSearchChoices) {
                        bonificacionSearchChoices = new Choices(selectEl, {
                            searchEnabled: true,
                            itemSelectText: 'Seleccionar',
                            placeholder: true,
                            placeholderValue: 'Buscar bonificación...',
                            allowHTML: false,
                        });
                    }

                    const choicesData = bonificacionesDisponibles.map(b => ({
                        value: b.bonificacion_id,
                        label: `${b.nombre} (Stock: ${b.stock})`,
                        data: b
                    }));
                    bonificacionSearchChoices.setChoices(choicesData, 'value', 'label', true);
                }
            })
            .catch(error => {
                console.error('Error al cargar bonificaciones para la venta:', error);
                // No mostramos toast aquí para no ser intrusivos si solo falla esto
            });
    }


    document.getElementById('btnAnadirProducto')?.addEventListener('click', () => {
        const selectEl = document.getElementById('productoSearch');
        const productoId = selectEl.value;
        if (!productoId) {
            showToast('Debe seleccionar un producto', 'error');
            return;
        }

        const producto = productosVenta.find(p => p.producto_id == productoId); // Aquí el error era que se buscaba en el array equivocado
        const cantidad = parseInt(document.getElementById('cantidadProducto').value) || 1;

        if (productosSeleccionadosVenta.find(p => p.id == producto.producto_id)) {
            showToast('Este producto ya ha sido agregado', 'error');
            return;
        }

        if (cantidad > producto.stock) {
            showToast(`Stock insuficiente. Disponible: ${producto.stock}`, 'error');
            return;
        }

        productosSeleccionadosVenta.push({
            id: producto.producto_id,
            nombre: producto.nombre,
            precio: parseFloat(producto.precio_venta),
            cantidad: cantidad,
            stock: producto.stock,
            subtotal: parseFloat(producto.precio_venta) * cantidad,
            isBonificacion: false // Marcar como producto regular
        });

        renderizarProductosVenta();
        calcularTotalesVenta();
        productoSearchChoices.setChoiceByValue(''); // Limpiar select
        document.getElementById('cantidadProducto').value = 1;
    });

    document.getElementById('btnAnadirBonificacion')?.addEventListener('click', () => {
        const selectEl = document.getElementById('bonificacionSearch');
        const bonificacionId = selectEl.value;
        if (!bonificacionId) {
            showToast('Debe seleccionar una bonificación', 'error');
            return;
        }

        const bonificacion = bonificacionesDisponibles.find(b => b.bonificacion_id == bonificacionId);
        const cantidad = parseInt(document.getElementById('cantidadBonificacion').value) || 1;

        if (productosSeleccionadosVenta.find(p => p.id == bonificacion.bonificacion_id && p.isBonificacion)) {
            showToast('Esta bonificación ya ha sido agregada', 'error');
            return;
        }

        if (cantidad > bonificacion.stock) {
            showToast(`Stock de bonificación insuficiente. Disponible: ${bonificacion.stock}`, 'error');
            return;
        }

        productosSeleccionadosVenta.push({
            id: bonificacion.bonificacion_id,
            nombre: bonificacion.nombre,
            precio: 0, // Las bonificaciones no tienen costo
            cantidad: cantidad,
            stock: bonificacion.stock,
            subtotal: 0,
            isBonificacion: true // Marcar como bonificación
        });

        renderizarProductosVenta();
        calcularTotalesVenta();
        if (bonificacionSearchChoices) bonificacionSearchChoices.setChoiceByValue('');
        document.getElementById('cantidadBonificacion').value = 1;
    });

    function renderizarProductosVenta() {
        const tbody = document.getElementById('tablaProductos');
        if (!tbody) return;

        if (productosSeleccionadosVenta.length === 0) {
            tbody.innerHTML = '<tr id="filaVacia"><td colspan="5" class="text-center text-muted"><i class="fas fa-cart-x"></i> No hay productos seleccionados</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        productosSeleccionadosVenta.forEach(producto => {
            const row = document.createElement('tr');
            row.dataset.id = producto.id;
            row.dataset.stock = producto.stock;
            const badge = producto.isBonificacion ? '<span class="badge bg-success ms-2">Bonificación</span>' : '';

            row.innerHTML = `
                <td>
                    <div class="fw-bold">${producto.nombre}${badge}</div>
                    <small class="text-muted">Stock disponible: ${producto.stock}</small>
                </td>
                <td>S/. ${producto.precio.toFixed(2)}</td>
                <td>
                    <input type="number" class="form-control form-control-sm cantidad-input-venta" 
                           value="${producto.cantidad}" min="1" max="${producto.stock}" ${producto.isBonificacion ? '' : ''}>
                </td>
                <td class="fw-bold">S/. ${producto.subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm eliminar-producto-venta">
                        <i class="fas fa-trash" style="pointer-events: none;"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    document.getElementById('tablaProductos')?.addEventListener('input', function (e) {
        if (e.target.classList.contains('cantidad-input-venta')) {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            let cantidad = parseInt(e.target.value) || 1; // Si no es un número, default a 1
            const stock = parseInt(row.dataset.stock);

            if (cantidad < 1) {
                cantidad = 1;
                e.target.value = 1;
            }

            if (cantidad > stock) {
                showToast(`Stock insuficiente. Disponible: ${stock}`, 'error');
                e.target.value = stock;
                return;
            }

            const producto = productosSeleccionadosVenta.find(p => p.id == id);
            // Prevenir cambiar cantidad de bonificaciones si se decide en el futuro
            if (producto && producto.isBonificacion) {
                // Podríamos añadir lógica aquí si no queremos que se edite la cantidad de bonificaciones
            }

            if (producto) {
                producto.cantidad = cantidad;
                producto.subtotal = producto.precio * cantidad;
                renderizarProductosVenta();
                calcularTotalesVenta();
            }
        }
    });

    document.getElementById('tablaProductos')?.addEventListener('click', function (e) {
        if (e.target.closest('.eliminar-producto-venta')) {
            const id = e.target.closest('tr').dataset.id;
            productosSeleccionadosVenta = productosSeleccionadosVenta.filter(p => p.id != id);
            renderizarProductosVenta();
            calcularTotalesVenta();
        }
    });

    document.getElementById('descuentoValor')?.addEventListener('input', calcularTotalesVenta);
    document.getElementById('descuentoTipo')?.addEventListener('change', calcularTotalesVenta);

    function calcularTotalesVenta() {
        const subtotal = productosSeleccionadosVenta.reduce((sum, p) => sum + p.subtotal, 0);
        const descuentoValor = parseFloat(document.getElementById('descuentoValor').value) || 0;
        const descuentoTipo = document.getElementById('descuentoTipo').value;

        let descuento = 0;
        if (descuentoTipo === 'porcentaje') {
            descuento = subtotal * (descuentoValor / 100);
        } else {
            descuento = descuentoValor;
        }

        if (descuento > subtotal) descuento = subtotal;

        const total = subtotal - descuento;

        document.getElementById('subtotalVenta').textContent = `S/. ${subtotal.toFixed(2)}`;
        document.getElementById('descuentoVenta').textContent = `-S/. ${descuento.toFixed(2)}`;
        document.getElementById('totalVenta').textContent = `S/. ${total.toFixed(2)}`;
    }

    // Guardar la venta
    document.getElementById('guardarVenta')?.addEventListener('click', async function () {
        const btn = this;
        const clienteId = document.getElementById('saleClientId').value;

        // Validaciones
        if (!clienteId) {
            showToast('No se ha especificado un cliente.', 'error');
            return;
        }
        if (productosSeleccionadosVenta.filter(p => !p.isBonificacion).length === 0) {
            showToast('Debe agregar al menos un producto a la venta.', 'error');
            return;
        }

        // Recopilar datos de la venta
        const subtotal = productosSeleccionadosVenta.reduce((sum, p) => sum + p.subtotal, 0);
        const descuentoValor = parseFloat(document.getElementById('descuentoValor').value) || 0;
        const descuentoTipo = document.getElementById('descuentoTipo').value;
        let descuentoMonto = descuentoTipo === 'porcentaje' ? subtotal * (descuentoValor / 100) : descuentoValor;
        if (descuentoMonto > subtotal) descuentoMonto = subtotal;
        const total = subtotal - descuentoMonto;

        const productosParaGuardar = productosSeleccionadosVenta.filter(p => !p.isBonificacion);
        const bonificacionesParaGuardar = productosSeleccionadosVenta.filter(p => p.isBonificacion);

        const ventaData = {
            cliente_id: clienteId,
            // Combinar fecha y hora en un solo string ISO para el backend
            fecha: `${document.getElementById('fechaVenta').value}T${document.getElementById('horaVenta').value}`,
            productos: productosParaGuardar,
            subtotal: subtotal,
            descuento: {
                valor: descuentoValor,
                tipo: descuentoTipo,
                monto: descuentoMonto
            },
            total: total,
            bonificaciones: bonificacionesParaGuardar
        };

        // Enviar al backend
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
        try {
            const response = await axios.post('/api/ventas', ventaData);
            showToast(response.data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addSaleModal')).hide();
        } catch (error) {
            const mensaje = error.response?.data?.error || 'Error al guardar la venta.';
            showToast(mensaje, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-2"></i> Guardar Venta';
        }
    });

    // Limpiar modal de venta al cerrar
    const addSaleModalEl = document.getElementById('addSaleModal');
    addSaleModalEl?.addEventListener('hidden.bs.modal', function () {
        productosSeleccionadosVenta = [];
        renderizarProductosVenta();
        document.getElementById('descuentoValor').value = '';
        document.getElementById('descuentoTipo').value = 'monto';
        calcularTotalesVenta();
    });

    addSaleModalEl?.addEventListener('shown.bs.modal', function () {
        // Establecer fecha y hora actuales por separado
        const fechaInput = document.getElementById('fechaVenta');
        const horaInput = document.getElementById('horaVenta');
        const ahora = new Date();

        // Formato YYYY-MM-DD para el input de fecha
        const anio = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const dia = String(ahora.getDate()).padStart(2, '0');
        fechaInput.value = `${anio}-${mes}-${dia}`;

        // Formato HH:MM para el input de hora
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        horaInput.value = `${horas}:${minutos}`;

    });

    // Botón "Editar"
    document.getElementById('btnEditarNota')?.addEventListener('click', function () {
        const notasTextarea = document.getElementById('detail-notas');
        notasOriginales = notasTextarea.value; // Guardar estado original
        setNotasEditMode(true);
    });

    // Botón "Cancelar"
    document.getElementById('btnCancelarNota')?.addEventListener('click', function () {
        const notasTextarea = document.getElementById('detail-notas');
        notasTextarea.value = notasOriginales; // Restaurar
        setNotasEditMode(false);
    });

    // Botón "Guardar"
    document.getElementById('btnGuardarNota')?.addEventListener('click', function () {
        if (!clienteIdParaNotas) {
            showToast('<i class="fas fa-exclamation-triangle me-2"></i> No se pudo identificar al cliente', 'error');
            return;
        }

        const nuevasNotas = document.getElementById('detail-notas').value.trim();

        axios.put(`/api/clientes/${clienteIdParaNotas}/notas`, { notas: nuevasNotas })
            .then(response => {
                if (response.data.success) {
                    showToast('<i class="fas fa-check-circle me-2"></i> Notas guardadas exitosamente', 'success');
                    setNotasEditMode(false);
                }
            })
            .catch(error => {
                const mensaje = error.response?.data?.error || "Error al guardar las notas";
                showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
            });
    });
    function setNotasEditMode(isEditing) {
        const notasTextarea = document.getElementById('detail-notas');
        const btnEditar = document.getElementById('btnEditarNota');
        const btnGuardar = document.getElementById('btnGuardarNota');
        const btnCancelar = document.getElementById('btnCancelarNota');

        if (isEditing) {
            notasTextarea.readOnly = false;
            notasTextarea.focus();
            btnEditar.classList.add('d-none');
            btnGuardar.classList.remove('d-none');
            btnCancelar.classList.remove('d-none');
        } else {
            notasTextarea.readOnly = true;
            btnEditar.classList.remove('d-none');
            btnGuardar.classList.add('d-none');
            btnCancelar.classList.add('d-none');
        }
    }

    function cargarHistorialCompras(clienteId, page = 1) {
        const historialContainer = document.getElementById('historialComprasContainer');
        const badgeContainer = document.querySelector('#customerDetailModal .card-header .badge');
        const paginacionContainer = document.getElementById('historialComprasPaginacionContainer');

        historialContainer.innerHTML = '<div class="list-group-item text-center"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</div>';
        badgeContainer.textContent = '...';
        paginacionContainer.innerHTML = '';

        axios.get(`/api/ventas/cliente/${clienteId}`)
            .then(response => {
                if (response.data.success) {
                    const ventas = response.data.ventas;
                    const totalVentas = ventas.length;
                    const itemsPerPage = 4;
                    const totalPages = Math.ceil(totalVentas / itemsPerPage);

                    badgeContainer.textContent = `${ventas.length} compras`;

                    if (ventas.length === 0) {
                        historialContainer.innerHTML = '<div class="list-group-item text-center text-muted">No hay compras registradas.</div>';
                        return;
                    }

                    // Paginación
                    // 1. Ordenar todas las ventas de más nueva a más antigua
                    const ventasOrdenadas = ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                    // 2. Asignar el número de compra a cada venta
                    ventasOrdenadas.forEach((venta, index) => {
                        venta.numeroCompra = totalVentas - index;
                    });

                    // 3. Paginar el array ya ordenado y numerado
                    const startIndex = (page - 1) * itemsPerPage;
                    const ventasPaginadas = ventasOrdenadas.slice(startIndex, startIndex + itemsPerPage);

                    historialContainer.innerHTML = '';
                    ventasPaginadas.forEach(venta => {
                        const fecha = new Date(venta.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const isAnulada = venta.activa === 0;

                        const item = document.createElement('div');
                        item.className = `list-group-item ${isAnulada ? 'list-group-item-light text-muted' : ''}`;
                        item.innerHTML = `
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">
                                        Compra #${venta.numeroCompra}
                                        ${isAnulada ? '<span class="badge bg-danger ms-2">Anulada</span>' : ''}
                                    </h6>
                                    <p class="text-muted mb-0"><small>${fecha}</small></p>
                                </div>
                                <div class="text-end">
                                    <h6 class="${isAnulada ? 'text-decoration-line-through' : 'text-success'} mb-1">
                                        S/. ${Number(venta.total).toFixed(2)}
                                    </h6>
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-outline-secondary sale-detail-btn" 
                                                data-venta-id="${venta.compra_id}" 
                                                data-numero-compra="${venta.numeroCompra}" 
                                                title="Ver detalles">
                                            <i class="fas fa-eye"></i> Ver
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                        historialContainer.appendChild(item);
                    });

                    // Renderizar controles de paginación si hay más de una página
                    if (totalPages > 1) {
                        const ul = document.createElement('ul');
                        ul.className = 'pagination pagination-sm mb-0';

                        // Botón Anterior
                        const prevLi = document.createElement('li');
                        prevLi.className = `page-item ${page === 1 ? 'disabled' : ''}`;
                        prevLi.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
                        prevLi.addEventListener('click', (e) => { e.preventDefault(); if (page > 1) cargarHistorialCompras(clienteId, page - 1); });
                        ul.appendChild(prevLi);

                        // Indicador de página
                        const pageInfoLi = document.createElement('li');
                        pageInfoLi.className = 'page-item disabled';
                        pageInfoLi.innerHTML = `<span class="page-link">Pág ${page} de ${totalPages}</span>`;
                        ul.appendChild(pageInfoLi);

                        // Botón Siguiente
                        const nextLi = document.createElement('li');
                        nextLi.className = `page-item ${page === totalPages ? 'disabled' : ''}`;
                        nextLi.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
                        nextLi.addEventListener('click', (e) => { e.preventDefault(); if (page < totalPages) cargarHistorialCompras(clienteId, page + 1); });
                        ul.appendChild(nextLi);

                        paginacionContainer.appendChild(ul);
                    }
                }
            })
            .catch(error => {
                console.error('Error al cargar historial de compras:', error);
                historialContainer.innerHTML = '<div class="list-group-item text-center text-danger">Error al cargar historial.</div>';
                badgeContainer.textContent = 'Error';
            });
    }

    function cargarDetalleVenta(ventaId, clienteNombre, numeroCompra) {
        const titulo = numeroCompra ? `Detalle de Venta #${numeroCompra}` : `Detalle de Venta`;
        document.getElementById('saleDetailModalTitle').innerHTML = `<i class="fas fa-receipt me-2"></i> ${titulo}`;
        document.getElementById('saleDetailClient').textContent = clienteNombre;
        const tableBody = document.getElementById('saleDetailTableBody');
        const summaryDiv = document.getElementById('saleDetailSummary');
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
        document.getElementById('btnAnularVenta').dataset.ventaId = ventaId;

        saleDetailModal.show();

        axios.get(`/api/ventas/${ventaId}`)
            .then(response => {
                if (response.data.success) {
                    const venta = response.data.venta;
                    const fechaVenta = new Date(venta.fecha);
                    const fechaFormateada = fechaVenta.toLocaleDateString('es-ES');
                    const horaFormateada = fechaVenta.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    document.getElementById('saleDetailId').textContent = `VNT-10${venta.compra_id}`;
                    document.getElementById('saleDetailDate').textContent = `${fechaFormateada} - ${horaFormateada}`;

                    // Ocultar o mostrar el botón de anular según el estado de la venta
                    const btnAnular = document.getElementById('btnAnularVenta');
                    if (venta.activa === 0) {
                        btnAnular.style.display = 'none';
                    } else {
                        btnAnular.style.display = 'block';
                    }

                    tableBody.innerHTML = '';

                    venta.detalles.forEach(item => {
                        const row = document.createElement('tr');
                        const nombreItem = item.es_bonificacion ? `${item.nombre_bonificacion} <span class="badge bg-success">Bonificación</span>` : item.nombre_producto;
                        row.innerHTML = `
                            <td>${nombreItem}</td>
                            <td class="text-end">S/. ${Number(item.precio_unitario).toFixed(2)}</td>
                            <td class="text-center">${item.cantidad}</td>
                            <td class="text-end">S/. ${Number(item.subtotal).toFixed(2)}</td>
                        `;
                        tableBody.appendChild(row);
                    });

                    summaryDiv.innerHTML = `
                        <p class="mb-1">Subtotal: <span class="fw-bold">S/. ${Number(venta.subtotal).toFixed(2)}</span></p>
                        <p class="mb-1 text-danger">Descuento: <span class="fw-bold">-S/. ${Number(venta.descuento_venta).toFixed(2)}</span></p>
                        <hr class="my-1">
                        <h5 class="mb-0">Total: <span class="fw-bold text-success">S/. ${Number(venta.total).toFixed(2)}</span></h5>
                    `;
                }
            })
            .catch(error => {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar los detalles.</td></tr>';
                console.error('Error al cargar detalle de venta:', error);
            });
    }

    // async function descargarPdfVenta(ventaId, numeroCompra) {
    //     const originalButton = document.querySelector(`.print-sale-btn[data-venta-id="${ventaId}"]`);
    //     const originalContent = originalButton.innerHTML;
    //     originalButton.disabled = true;
    //     originalButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

    //     try {
    //         const response = await axios.get(`/api/ventas/${ventaId}/pdf`, {
    //             responseType: 'blob' // Importante para manejar archivos
    //         });

    //         const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    //         const link = document.createElement('a');
    //         link.href = url;
    //         const fileName = `recibo_venta_${numeroCompra}.pdf`;
    //         link.setAttribute('download', fileName);
    //         document.body.appendChild(link);
    //         link.click();
    //         link.remove();
    //         window.URL.revokeObjectURL(url);

    //         showToast(`Recibo #${numeroCompra} descargado.`, 'success');

    //     } catch (error) {
    //         console.error('Error al descargar el PDF de la venta:', error);
    //         showToast('Error al generar el recibo PDF.', 'error');
    //     } finally {
    //         originalButton.disabled = false;
    //         originalButton.innerHTML = originalContent;
    //     }
    // }

    /**
     * @function exportarHistorialCSV
     * @description Genera y descarga un archivo CSV con el historial de compras de un cliente.
     * @param {number} clienteId - El ID del cliente cuyo historial se va a exportar.
     */
    async function exportarHistorialCSV(clienteId) {
        const btn = document.getElementById('btnExportarHistorialCSV');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        // Cambiamos el contenido del botón para dar feedback visual al usuario.
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        // /**
        //  * @function exportarHistorialCSV
        //  * @description Genera y descarga un archivo CSV con el historial de compras de un cliente.
        //  * @param {number} clienteId - El ID del cliente cuyo historial se va a exportar.
        //  */
        // async function exportarHistorialCSV(clienteId) {
        //     const btn = document.getElementById('btnExportarHistorialCSV');
        //     const originalContent = btn.innerHTML;
        //     btn.disabled = true;
        //     // Cambiamos el contenido del botón para dar feedback visual al usuario.
        //     btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

        try {
            // 1. Hacemos una petición a la API para obtener todas las ventas del cliente.
            const response = await axios.get(`/api/ventas/cliente/${clienteId}`);
            if (!response.data.success || response.data.ventas.length === 0) {
                showToast('No hay compras para exportar.', 'error');
                return;
            }
            //     try {
            //         // 1. Hacemos una petición a la API para obtener todas las ventas del cliente.
            //         const response = await axios.get(`/api/ventas/cliente/${clienteId}`);
            //         if (!response.data.success || response.data.ventas.length === 0) {
            //             showToast('No hay compras para exportar.', 'error');
            //             return;
            //         }

            const ventas = response.data.ventas;
            const totalVentas = ventas.length;
            const clienteNombre = document.getElementById('detail-nombre').textContent.trim().replace(/\s+/g, '_');
            //         const ventas = response.data.ventas;
            //         const totalVentas = ventas.length;
            //         const clienteNombre = document.getElementById('detail-nombre').textContent.trim().replace(/\s+/g, '_');

            // Encabezados del CSV
            // 2. Preparamos el contenido del CSV, empezando por los encabezados.
            let csvContent = "Nro. Compra,Fecha,Total (S/.)\n";
            //         // Encabezados del CSV
            //         // 2. Preparamos el contenido del CSV, empezando por los encabezados.
            //         let csvContent = "Nro. Compra,Fecha,Total (S/.)\n";

            // Filas del CSV
            // 3. Recorremos cada venta para añadir una fila al CSV.
            ventas.forEach((venta, index) => {
                const numeroCompra = totalVentas - index;
                const fecha = new Date(venta.fecha).toLocaleDateString('es-ES');
                const total = Number(venta.total).toFixed(2);
                // Añadimos la línea al contenido del CSV.
                csvContent += `${numeroCompra},${fecha},${total}\n`;
            });
            //         // Filas del CSV
            //         // 3. Recorremos cada venta para añadir una fila al CSV.
            //         ventas.forEach((venta, index) => {
            //             const numeroCompra = totalVentas - index;
            //             const fecha = new Date(venta.fecha).toLocaleDateString('es-ES');
            //             const total = Number(venta.total).toFixed(2);
            //             // Añadimos la línea al contenido del CSV.
            //             csvContent += `${numeroCompra},${fecha},${total}\n`;
            //         });

            // Crear y descargar el archivo
            // 4. Creamos un "Blob", que es un objeto que representa datos crudos (nuestro texto CSV).
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            // 5. Creamos un enlace <a> temporal en memoria.
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            // 6. Le asignamos un nombre al archivo que se descargará.
            link.setAttribute("download", `historial_compras_${clienteNombre}.csv`);
            document.body.appendChild(link);
            // 7. Simulamos un clic en el enlace para iniciar la descarga.
            link.click();
            document.body.removeChild(link);
            //         // Crear y descargar el archivo
            //         // 4. Creamos un "Blob", que es un objeto que representa datos crudos (nuestro texto CSV).
            //         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            //         // 5. Creamos un enlace <a> temporal en memoria.
            //         const link = document.createElement("a");
            //         const url = URL.createObjectURL(blob);
            //         link.setAttribute("href", url);
            //         // 6. Le asignamos un nombre al archivo que se descargará.
            //         link.setAttribute("download", `historial_compras_${clienteNombre}.csv`);
            //         document.body.appendChild(link);
            //         // 7. Simulamos un clic en el enlace para iniciar la descarga.
            //         link.click();
            //         document.body.removeChild(link);

        } catch (error) {
            console.error('Error al exportar historial a CSV:', error);
            showToast('Error al generar el archivo CSV.', 'error');
        } finally {
            // 8. En cualquier caso (éxito o error), restauramos el botón a su estado original.
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }
    //     } catch (error) {
    //         console.error('Error al exportar historial a CSV:', error);
    //         showToast('Error al generar el archivo CSV.', 'error');
    //     } finally {
    //         // 8. En cualquier caso (éxito o error), restauramos el botón a su estado original.
    //         btn.disabled = false;
    //         btn.innerHTML = originalContent;
    //     }
    // }

    // Volver a mostrar el modal de detalle de cliente cuando se cierre el de detalle de venta
    const saleDetailModalEl = document.getElementById('saleDetailModal');
    if (saleDetailModalEl) {
        saleDetailModalEl.addEventListener('hidden.bs.modal', function (event) {
            // Solo volver a mostrar el modal de cliente si no se está cerrando la página o cambiando de modal principal
            if (document.body.classList.contains('modal-open')) {
                customerDetailModal.show();
            }
        });
    }
});
