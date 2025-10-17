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

    // === BOTÓN: Nuevo cliente (limpiar formulario y resetear botón) ===
    const nuevoClienteBtn = document.querySelector('[data-bs-target="#clientModal"]');
    if (nuevoClienteBtn) {
        nuevoClienteBtn.addEventListener('click', function () {
            document.getElementById('clienteForm')?.reset();
            document.getElementById('clienteId').value = '';

            // ✅ Restaurar TÍTULO y BOTÓN a "Nuevo"
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Nuevo Cliente';
            }
            if (btnGuardar) {
                btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i> Guardar';
            }
        });
    }

    // === FUNCIÓN PARA GUARDAR CLIENTE ===
    function guardarCliente() {
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

        setButtonLoading(btnGuardar, true);

        if (clienteId) {
            // ✏️ Modo EDICIÓN
            axios.put(`/api/clientes/${clienteId}`, cliente)
                .then(response => {
                    if (response.data.success) {
                        showToast(`<i class="fas fa-check-circle me-2"></i> Cliente <strong>${cliente.nombre}</strong> actualizado exitosamente`, 'success');
                        setTimeout(() => {
                            const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
                            if (modal) modal.hide();
                            document.getElementById('clienteForm')?.reset();
                            document.getElementById('clienteId').value = ''; // Limpiar ID
                            cargarClientes(currentPage); // Recargar página actual
                        }, 1500);
                    }
                })
                .catch(error => {
                    let mensaje = "Error al actualizar el cliente";
                    if (error.response?.data?.error) {
                        mensaje = error.response.data.error;
                    }
                    showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
                })
                .finally(() => {
                    setButtonLoading(btnGuardar, false);
                    // Restaurar texto del botón
                    if (btnGuardar) {
                        btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i> Guardar';
                    }
                });
        } else {
            // ➕ Modo CREACIÓN
            axios.post('/api/clientes', cliente)
                .then(response => {
                    if (response.data.success) {
                        showToast(`<i class="fas fa-check-circle me-2"></i> Cliente <strong>${cliente.nombre}</strong> guardado exitosamente`, 'success');
                        setTimeout(() => {
                            const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
                            if (modal) modal.hide();
                            document.getElementById('clienteForm')?.reset();
                            cargarClientes(1);
                        }, 1500);
                    }
                })
                .catch(error => {
                    let mensaje = "Error al guardar el cliente";
                    if (error.response?.data?.error) {
                        mensaje = error.response.data.error;
                    } else if (error.request) {
                        mensaje = "No se pudo conectar con el servidor";
                    }
                    showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
                })
                .finally(() => {
                    setButtonLoading(btnGuardar, false);
                });
        }
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
               <button class="btn btn-sm btn-primary me-1 edit-btn" data-bs-toggle="modal" data-bs-target="#clientModal" data-cliente-id="${cliente.cliente_id}">
               <i class="fas fa-edit"></i>
               </button>
               <button class="btn btn-sm btn-danger me-1 delete-btn" data-cliente-id="${cliente.cliente_id}">
               <i class="fas fa-trash"></i>
               </button>
               <button class="btn btn-sm btn-info me-1" data-bs-toggle="modal" data-bs-target="#customerDetailModal" data-cliente-id="${cliente.cliente_id}">
               <i class="fas fa-info-circle"></i>
               </button>
               <button class="btn btn-sm btn-warning">
               <i class="fas fa-shopping-cart"></i>
               </button>
            </td>`
                ;
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

    // === MANEJAR EDICIÓN DE CLIENTE === (¡AHORA DENTRO DEL DOMContentLoaded!)
    document.addEventListener('click', function (e) {
        if (e.target.closest('.edit-btn')) {
            const button = e.target.closest('.edit-btn');
            const clienteId = button.getAttribute('data-cliente-id');

            // Cargar datos del cliente
            axios.get(`/api/clientes/${clienteId}`)
                .then(response => {
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

                        // ✅ Cambiar TÍTULO y BOTÓN a "Editar"
                        const modalTitle = document.getElementById('modalTitle');
                        if (modalTitle) {
                            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i> Editar Cliente';
                        }
                        if (btnGuardar) {
                            btnGuardar.innerHTML = '<i class="fas fa-sync-alt me-2"></i> Actualizar';
                        }
                    }
                })
                .catch(error => {
                    showToast('<i class="fas fa-exclamation-triangle me-2"></i> Error al cargar cliente', 'error');
                });
        }
    });
    // === MANEJAR ELIMINACIÓN DE CLIENTE ===
    document.addEventListener('click', function (e) {
        if (e.target.closest('.delete-btn')) {
            const button = e.target.closest('.delete-btn');
            const clienteId = button.getAttribute('data-cliente-id');
            const clienteNombre = button.closest('tr').querySelector('td:first-child').textContent.trim();

            // Confirmación con SweetAlert2
            Swal.fire({
                title: '¿Estás seguro?',
                html: `Vas a eliminar al cliente <strong>${clienteNombre}</strong>.<br>Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    // ✅ Solo eliminar si el usuario confirma
                    axios.delete(`/api/clientes/${clienteId}`)
                        .then(response => {
                            if (response.data.success) {
                                showToast(`<i class="fas fa-check-circle me-2"></i> Cliente <strong>${clienteNombre}</strong> eliminado exitosamente`, 'success');
                                cargarClientes(currentPage); // Recargar la tabla
                            }
                        })
                        .catch(error => {
                            let mensaje = "Error al eliminar el cliente";
                            if (error.response?.data?.error) {
                                mensaje = error.response.data.error;
                            } else if (error.response?.status === 404) {
                                mensaje = "Cliente no encontrado";
                            }
                            showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
                        });
                }
            });


        }
    })
    // === MANEJAR DETALLE DE CLIENTE ===
    document.addEventListener('click', function (e) {
        if (e.target.closest('[data-bs-target="#customerDetailModal"]')) {
            const button = e.target.closest('[data-bs-target="#customerDetailModal"]');
            const clienteId = button.getAttribute('data-cliente-id');
            if (!clienteId) return;

            axios.get(`/api/clientes/${clienteId}`)
                .then(response => {
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
                        setField('detail-notas', cliente.notas); 
                    } else {
                        showToast('<i class="fas fa-exclamation-triangle me-2"></i> No se encontraron datos del cliente', 'error');
                    }
                })
                .catch(error => {
                    showToast('<i class="fas fa-exclamation-triangle me-2"></i> Error al cargar datos del cliente', 'error');
                });
        }
    });
    // === MANEJAR EDICIÓN DE NOTAS EN LÍNEA ===
    let clienteIdParaNotas = null; // Para recordar qué cliente se está editando
    let notasOriginales = ''; // Para poder cancelar

    // Cuando se abre el modal de detalle, guarda el ID
    document.addEventListener('click', function (e) {
        if (e.target.closest('[data-bs-target="#customerDetailModal"]')) {
            const button = e.target.closest('[data-bs-target="#customerDetailModal"]');
            clienteIdParaNotas = button.getAttribute('data-cliente-id');
            // Al abrir, nos aseguramos de que esté en modo lectura
            setNotasEditMode(false);
        }
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
                    showToast('<i class="fas fa-check-circle me-2"></i> Nota guardadas exitosamente', 'success');
                    setNotasEditMode(false); // Volver a modo lectura
                }
            })
            .catch(error => {
                const mensaje = error.response?.data?.error || "Error al guardar las notas";
                showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
            });
    });

    // Función auxiliar para cambiar entre modo edición y lectura
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
});
