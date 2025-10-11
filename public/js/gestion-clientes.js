document.addEventListener('DOMContentLoaded', function () {
    // Variables globales para paginación
    let currentPage = 1;
    const itemsPerPage = 5;

    // === CARGAR CLIENTES AL INICIAR (solo una vez con notificación) ===
    cargarClientes(1, true);

    // === BOTÓN: Guardar cliente ===
    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCliente);
    }

    // === BOTÓN: Nuevo cliente (limpiar formulario) ===
    const nuevoClienteBtn = document.querySelector('[data-bs-target="#clientModal"]');
    if (nuevoClienteBtn) {
        nuevoClienteBtn.addEventListener('click', function () {
            document.getElementById('clienteForm')?.reset();
        });
    }

    // === FUNCIÓN PARA GUARDAR CLIENTE ===
    function guardarCliente() {
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

        setButtonLoading(btnGuardar, true);

        axios.post('/api/clientes', cliente)
            .then(function (response) {
                if (response.data.success) {
                    showToast(
                        `<i class="fas fa-check-circle me-2"></i> Cliente <strong>${cliente.nombre}</strong> guardado exitosamente`,
                        'success'
                    );
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
                        if (modal) modal.hide();
                        document.getElementById('clienteForm')?.reset();
                        cargarClientes(1); // Recargar página 1 sin notificación
                    }, 1500);
                }
            })
            .catch(function (error) {
                let mensaje = "Error al guardar el cliente";
                if (error.response?.data?.error) {
                    mensaje = error.response.data.error;
                } else if (error.request) {
                    mensaje = "No se pudo conectar con el servidor";
                }
                showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
            })
            .finally(function () {
                setButtonLoading(btnGuardar, false);
            });
    }

    // === FUNCIÓN PARA CARGAR CLIENTES CON PAGINACIÓN ===
    function cargarClientes(page = 1, showNotification = false) {
        currentPage = page; // ✅ Actualiza la variable global
        axios.get(`/api/clientes?page=${page}&limit=${itemsPerPage}`)
            .then(function (response) {
                if (response.data.success) {
                    actualizarTablaClientes(response.data.clientes);
                    renderPagination(response.data.totalPages, page);
                    if (showNotification) {
                        showToast(`<i class="fas fa-users me-2"></i> ${response.data.total} clientes cargados`, 'success');
                    }
                }
            })
            .catch(function (error) {
                console.error('Error cargando clientes:', error);
                showToast('<i class="fas fa-exclamation-triangle me-2"></i> Error al cargar clientes', 'error');
            });
    }

    // === ACTUALIZAR TABLA ===
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
            row.innerHTML = `
                <td>${cliente.nombre || '<span class="text-muted">No especificado</span>'}</td>
                <td>${cliente.ruc || '<span class="text-muted">-</span>'}</td>
                <td>${cliente.ciudad || '<span class="text-muted">-</span>'}</td>
                <td>${cliente.telefono || '<span class="text-muted">-</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" data-bs-toggle="modal" data-bs-target="#clientModal">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger me-1">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-info me-1" data-bs-toggle="modal" data-bs-target="#customerDetailModal">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-warning">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // === RENDERIZAR PAGINACIÓN ===
    function renderPagination(totalPages, currentPage) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        pagination.innerHTML = '';

        if (totalPages <= 1) return;

        // Botón "Anterior"
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

        // Números de página
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                cargarClientes(i);
            });
            pagination.appendChild(li);
        }

        // Botón "Siguiente"
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

    // === TOAST ===
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

    // === BOTÓN LOADING ===
    function setButtonLoading(button, isLoading) {
        if (!button) return;
        button.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...'
            : '<i class="fas fa-save me-2"></i> Guardar';
        button.disabled = isLoading;
    }

    // === FUNCIÓN PARA CARGAR CLIENTES CON PAGINACIÓN Y BÚSQUEDA ===
    function cargarClientes(page = 1, showNotification = false, searchTerm = '') {
        currentPage = page;
        console.log(`🔄 Cargando clientes - Página ${page} ${searchTerm ? `(Búsqueda: "${searchTerm}")` : ''}`);

        const params = new URLSearchParams({
            page: page,
            limit: itemsPerPage
        });
        if (searchTerm) params.append('search', searchTerm);

        axios.get(`/api/clientes?${params.toString()}`)
            .then(function (response) {
                if (response.data.success) {
                    actualizarTablaClientes(response.data.clientes);
                    renderPagination(response.data.totalPages, page);
                    if (showNotification && !searchTerm) {
                        showToast(`<i class="fas fa-users me-2"></i> ${response.data.total} clientes cargados`, 'success');
                    }
                }
            })
            .catch(function (error) {
                console.error('Error cargando clientes:', error);
                showToast('<i class="fas fa-exclamation-triangle me-2"></i> Error al cargar clientes', 'error');
            });
    }

    // === BÚSQUEDA (sin botón "×") ===
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            const searchTerm = this.value.trim();
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                cargarClientes(1, false, searchTerm);
            }, 400);
        });
    }
});