document.addEventListener('DOMContentLoaded', function () {
    let gastos = []; // Ahora solo contendrá los gastos de la página actual
    let responsables = []; // Array para almacenar los responsables
    const gastosPorPagina = 6;
    let paginaActual = 1;
    let totalPages = 1;

    const tablaBody = document.getElementById('gastosTableBody');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationInfo = document.getElementById('pagination-info');
    const searchInput = document.getElementById('searchGastos');
    const gastoForm = document.getElementById('gasto-form');
    const formContainer = document.getElementById('gasto-form-container');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    let editandoId = null;
    const personaSelect = document.getElementById('persona');

    // --- Referencias para la gestión de responsables ---
    const gestionResponsablesModalEl = document.getElementById('gestionResponsablesModal');
    const responsablesTableBody = document.getElementById('responsablesTableBody');
    const responsableModal = new bootstrap.Modal(document.getElementById('responsableModal'));
    const responsableForm = document.getElementById('responsableForm');
    const responsableModalLabel = document.getElementById('responsableModalLabel');
    const btnSaveResponsable = document.getElementById('btnSaveResponsable');

    async function cargarGastos(page = 1) {
        paginaActual = page;
        const searchTerm = searchInput.value.trim();
        const params = new URLSearchParams({
            page: page,
            limit: gastosPorPagina,
            search: searchTerm
        });

        try {
            const response = await fetch(`/api/gastos?${params.toString()}`);
            if (!response.ok) throw new Error('Error al cargar los gastos.');
            const data = await response.json();
            if (data.success) {
                gastos = data.gastos;
                totalPages = data.totalPages;
                mostrarGastos(data.total);
                renderPagination();
            }
        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        }
    }

    async function cargarResponsables() {
        try {
            const response = await fetch('/api/responsables?status=todos');
            if (!response.ok) throw new Error('Error al cargar responsables.');
            const data = await response.json();
            if (data.success) {
                responsables = data.responsables; // Guardar la lista completa
                llenarSelectResponsables(false); // Por defecto, solo activos
            }
        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        }
    }

    function llenarSelectResponsables(incluirInactivos = false) {
        personaSelect.innerHTML = '<option value="" disabled selected>Seleccione un responsable</option>';
        const filtrados = incluirInactivos ? responsables : responsables.filter(r => r.activo);

        filtrados.forEach(r => {
            const option = document.createElement('option');
            option.value = r.responsable_id;
            option.textContent = r.nombre;
            personaSelect.appendChild(option);
        });
    }

    // --- Funciones para la gestión de responsables ---

    async function cargarTodosLosResponsables() {
        try {
            // Ahora usaremos una ruta que traiga a TODOS los responsables (activos e inactivos)
            const response = await fetch('/api/responsables?status=todos');
            const data = await response.json();

            if (data.success) {
                responsables = data.responsables; // Actualizamos la lista local
                renderResponsablesTable();
            }
        } catch (error) {
            showToast('Error al cargar la lista de responsables.', 'error');
        }
    }

    function renderResponsablesTable() {
        responsablesTableBody.innerHTML = '';
        if (responsables.length === 0) {
            responsablesTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay responsables registrados.</td></tr>';
            return;
        }
        responsables.forEach(resp => {
            const row = document.createElement('tr'); // La columna 'activo' debe venir del backend
            row.innerHTML = `
                <td>${resp.nombre}</td>
                <td><span class="badge ${resp.activo ? 'bg-success' : 'bg-secondary'}">${resp.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1 edit-responsable-btn" data-id="${resp.responsable_id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm ${resp.activo ? 'btn-warning' : 'btn-success'}" data-id="${resp.responsable_id}" data-status="${resp.activo ? '0' : '1'}" title="${resp.activo ? 'Desactivar' : 'Activar'}">
                        <i class="fas ${resp.activo ? 'fa-ban' : 'fa-check-circle'}"></i>
                    </button>
                </td>
            `;
            responsablesTableBody.appendChild(row);
        });
    }

    function mostrarGastos(totalItems) {
        tablaBody.innerHTML = '';
        if (gastos.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No se encontraron gastos.</td></tr>';
        } else {
            gastos.forEach(gasto => {
                const fila = document.createElement('tr');
                fila.dataset.gastoId = gasto.gasto_id;
                fila.innerHTML = `
                    <td>${gasto.descripcion}</td>
                    <td>S/. ${Number(gasto.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    <td>${new Date(gasto.fecha).toLocaleDateString('es-PE', { timeZone: 'UTC' })}</td>
                    <td>${gasto.persona || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1 edit-btn" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tablaBody.appendChild(fila);
            });
        }

        const inicio = (paginaActual - 1) * gastosPorPagina + 1;
        const fin = Math.min(inicio + gastosPorPagina - 1, totalItems);
        paginationInfo.innerHTML = `Mostrando <b>${totalItems > 0 ? inicio : 0}</b> a <b>${fin}</b> de <b>${totalItems}</b> gastos`;
    }

    function renderPagination() {
        paginationControls.innerHTML = '';

        if (totalPages <= 1) return;

        // Números de página con ventana deslizante
        const maxVisiblePages = 5;
        let startPage = Math.max(1, paginaActual - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Botón Anterior
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${paginaActual === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Anterior">&laquo;</a>`;
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaActual > 1) {
                cargarGastos(paginaActual - 1);
            }
        });
        paginationControls.appendChild(prevLi);

        // Primera página
        if (startPage > 1) {
            const li = document.createElement('li');
            li.className = 'page-item';
            li.innerHTML = `<a class="page-link" href="#">1</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                cargarGastos(1);
            });
            paginationControls.appendChild(li);

            if (startPage > 2) {
                const liDots = document.createElement('li');
                liDots.className = 'page-item disabled';
                liDots.innerHTML = `<span class="page-link">...</span>`;
                paginationControls.appendChild(liDots);
            }
        }

        // Páginas centrales
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === paginaActual ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                cargarGastos(i);
            });
            paginationControls.appendChild(li);
        }

        // Última página
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const liDots = document.createElement('li');
                liDots.className = 'page-item disabled';
                liDots.innerHTML = `<span class="page-link">...</span>`;
                paginationControls.appendChild(liDots);
            }

            const li = document.createElement('li');
            li.className = 'page-item';
            li.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                cargarGastos(totalPages);
            });
            paginationControls.appendChild(li);
        }

        // Botón siguiente
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${paginaActual === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente">&raquo;</a>`;
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaActual < totalPages) {
                cargarGastos(paginaActual + 1);
            }
        });
        paginationControls.appendChild(nextLi);
    }

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            cargarGastos(1);
        }, 300);
    });

    // Cargar los gastos iniciales desde la base de datos
    cargarGastos();
    cargarResponsables();

    // Set current date by default
    const today = new Date();
    const formattedDate = today.toISOString().substr(0, 10);
    document.getElementById('fecha').value = formattedDate;

    // Toggle form visibility
    toggleFormBtn.addEventListener('click', () => {
        if (formContainer.style.display === 'none' || formContainer.style.display === '') {
            formContainer.style.display = 'block';
            toggleFormBtn.innerHTML = '<i class="fas fa-times me-2"></i> Cerrar Formulario';
        } else {
            formContainer.style.display = 'none';
            toggleFormBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Agregar Gasto';
            // Si se cierra el formulario, reseteamos el modo edición
            resetFormulario();
        }
    });

    function resetFormulario() {
        gastoForm.reset();
        document.getElementById('fecha').value = formattedDate;
        editandoId = null;
        document.querySelector('#gasto-form-container .card-header h5').innerHTML = '<i class="fas fa-file-invoice-dollar me-2"></i> Registro de Gastos';
        document.getElementById('btn-guardar').innerHTML = '<i class="fas fa-save me-2"></i> Guardar Gasto';
        document.getElementById('persona').disabled = false;
        llenarSelectResponsables(false); // Restaurar filtro de solo activos
        document.getElementById('btn-limpiar').style.display = ''; // Mostrar botón limpiar
    }

    // Form clear button
    document.getElementById('btn-limpiar').addEventListener('click', function () {
        document.getElementById('gasto-form').reset();
        document.getElementById('fecha').value = formattedDate;

        // Ocultar formulario y restaurar texto del botón
        formContainer.style.display = 'none';
        toggleFormBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Agregar Gasto';
        document.getElementById('persona').disabled = false;
        llenarSelectResponsables(false); // Restaurar filtro de solo activos
    });

    // Form submit handler
    gastoForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Form validation
        const gastoData = {
            descripcion: document.getElementById('descripcion').value.trim(),
            monto: document.getElementById('monto').value,
            fecha: document.getElementById('fecha').value, // Enviamos solo la fecha, el servidor pondrá la hora.
            responsable_id: document.getElementById('persona').value
        };

        if (!gastoData.descripcion || !gastoData.monto || !gastoData.fecha || !gastoData.responsable_id) {
            showToast('Por favor complete todos los campos.', 'error');
            return;
        }

        const esEdicion = !!editandoId;
        const url = esEdicion ? `/api/gastos/${editandoId}` : '/api/gastos';
        const method = esEdicion ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gastoData)
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || (esEdicion ? 'Error al actualizar el gasto.' : 'Error al guardar el gasto.'));

            showToast(result.message, 'success');

            // Recargar gastos en la página actual o en la 1 si es nuevo
            await cargarGastos(esEdicion ? paginaActual : 1);

            // Limpiar y ocultar el formulario
            resetFormulario();
            formContainer.style.display = 'none';
            toggleFormBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Agregar Gasto';

        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // Funcionalidad de edición y eliminación
    tablaBody.addEventListener('click', function (e) {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const fila = editBtn.closest('tr');
            const gastoId = fila.dataset.gastoId;
            const gastoAEditar = gastos.find(g => g.gasto_id == gastoId);

            if (gastoAEditar) {
                editandoId = gastoId;
                document.getElementById('descripcion').value = gastoAEditar.descripcion;
                document.getElementById('monto').value = gastoAEditar.monto;
                // La fecha viene en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ), el input 'date' necesita 'YYYY-MM-DD'
                document.getElementById('fecha').value = new Date(gastoAEditar.fecha).toISOString().split('T')[0];

                // Buscamos el responsable_id correspondiente al nombre de la persona
                // Como 'gastoAEditar' ya tiene el responsable_id (si el backend lo devuelve), lo usamos.
                // Si el backend no devuelve responsable_id en el listado, tendríamos que buscarlo o pedirlo.
                // Asumimos que el backend devuelve responsable_id en getGastos (lo agregué en el controller).

                if (gastoAEditar.responsable_id) {
                    // Mostrar todos los responsables (incluyendo inactivos) para que aparezca el asignado
                    llenarSelectResponsables(true);
                    document.getElementById('persona').value = gastoAEditar.responsable_id;
                }

                // Cambiar UI del formulario a modo edición
                document.querySelector('#gasto-form-container .card-header h5').innerHTML = '<i class="fas fa-edit me-2"></i> Editando Gasto';
                document.getElementById('btn-guardar').innerHTML = '<i class="fas fa-sync-alt me-2"></i> Actualizar Gasto';
                document.getElementById('persona').disabled = true;
                document.getElementById('btn-limpiar').style.display = 'none'; // Ocultar botón limpiar en edición
                formContainer.style.display = 'block';
                toggleFormBtn.innerHTML = '<i class="fas fa-times me-2"></i> Cerrar Formulario';
                formContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }

        if (deleteBtn) {
            const fila = deleteBtn.closest('tr');
            const gastoId = fila.dataset.gastoId;
            const gastoAEliminar = gastos.find(g => g.gasto_id == gastoId);

            if (gastoAEliminar) {
                Swal.fire({
                    title: '¿Estás seguro?',
                    html: `Se eliminará permanentemente el gasto: <br><strong>${gastoAEliminar.descripcion}</strong>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const response = await fetch(`/api/gastos/${gastoId}`, { method: 'DELETE' });
                            const data = await response.json();
                            if (!response.ok) throw new Error(data.error || 'Error en el servidor.');

                            showToast(data.message, 'success');
                            await cargarGastos(paginaActual); // Recargar la lista manteniendo página

                        } catch (error) {
                            showToast(error.message, 'error');
                        }
                    }
                });
            }
        }
    });

    // Función para mostrar notificaciones Toast
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        const toastTypeClass = type === 'success' ? 'bg-success' : 'bg-danger';
        toast.className = `toast align-items-center text-white ${toastTypeClass} border-0 show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;

        toastContainer.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
        bsToast.show();
    }

    // --- Event Listeners para la gestión de responsables ---

    // Cargar la tabla de responsables cuando se abre el modal principal de gestión
    gestionResponsablesModalEl.addEventListener('show.bs.modal', function () {
        responsablesTableBody.innerHTML = '<tr><td colspan="3" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
        cargarTodosLosResponsables();
    });

    // Abrir modal para nuevo responsable
    document.getElementById('btnNuevoResponsable').addEventListener('click', () => {
        responsableForm.reset();
        document.getElementById('responsableId').value = '';
        responsableModalLabel.innerHTML = '<i class="fas fa-user-plus me-2"></i> Nuevo Responsable';
        btnSaveResponsable.innerHTML = 'Guardar';

        // Ocultar modal de gestión
        const gestionModal = bootstrap.Modal.getInstance(gestionResponsablesModalEl);
        if (gestionModal) gestionModal.hide();

        responsableModal.show();
    });

    // Guardar (crear o editar) responsable
    btnSaveResponsable.addEventListener('click', async () => {
        const id = document.getElementById('responsableId').value;
        const nombre = document.getElementById('responsableName').value.trim();

        if (!nombre) {
            showToast('El nombre es obligatorio.', 'error');
            return;
        }

        const esEdicion = !!id;
        const url = esEdicion ? `/api/responsables/${id}` : '/api/responsables';
        const method = esEdicion ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            showToast(result.message, 'success');

            // Cerrar modal asegurando que usamos la instancia correcta
            const modalEl = document.getElementById('responsableModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || responsableModal;
            if (modalInstance) modalInstance.hide();

            await cargarResponsables(); // Recarga el select del formulario principal
            // No es necesario cargarTodosLosResponsables() aquí porque al reabrirse el modal de gestión se recargará
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // Reabrir el modal de gestión al cerrar el modal de edición/creación
    document.getElementById('responsableModal').addEventListener('hidden.bs.modal', () => {
        const gestionModal = bootstrap.Modal.getInstance(gestionResponsablesModalEl) || new bootstrap.Modal(gestionResponsablesModalEl);
        gestionModal.show();
    });

    // Delegación de eventos en la tabla de responsables
    responsablesTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-responsable-btn');
        const toggleBtn = e.target.closest('button[data-status]');

        // Editar responsable
        if (editBtn) {
            const id = editBtn.dataset.id;
            const responsable = responsables.find(r => r.responsable_id == id);
            if (responsable) {
                document.getElementById('responsableId').value = responsable.responsable_id;
                document.getElementById('responsableName').value = responsable.nombre;
                responsableModalLabel.innerHTML = '<i class="fas fa-edit me-2"></i> Editar Responsable';
                btnSaveResponsable.innerHTML = 'Actualizar';

                // Ocultar modal de gestión
                const gestionModal = bootstrap.Modal.getInstance(gestionResponsablesModalEl);
                if (gestionModal) gestionModal.hide();

                responsableModal.show();
            }
        }

        // Activar/Desactivar responsable
        if (toggleBtn) {
            const id = toggleBtn.dataset.id;
            const nuevoStatus = parseInt(toggleBtn.dataset.status);
            const responsable = responsables.find(r => r.responsable_id == id);
            const accion = nuevoStatus === 1 ? 'reactivar' : 'desactivar';

            Swal.fire({
                title: `¿Estás seguro?`,
                html: `Se va a ${accion} a <strong>${responsable.nombre}</strong>.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: nuevoStatus === 1 ? '#28a745' : '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: `Sí, ${accion}`,
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const response = await fetch(`/api/responsables/${id}/status`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ activo: nuevoStatus })
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error);

                        showToast(data.message, 'success');
                        await cargarResponsables(); // Recargar select
                        await cargarTodosLosResponsables(); // Recargar tabla y actualizar array global
                    } catch (error) {
                        showToast(error.message, 'error');
                    }
                }
            });
        }
    });
});