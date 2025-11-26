document.addEventListener('DOMContentLoaded', function () {
    const bonificacionesTable = document.getElementById('bonificacionesTable');
    const btnSaveBonificacion = document.getElementById('btnSaveBonificacion');
    const btnUpdateBonificacion = document.getElementById('btnUpdateBonificacion');
    const totalBonificacionesValorEl = document.getElementById('totalBonificacionesValor');
    const productoBaseSelect = document.getElementById('productoBase');

    const bonificacionModal = new bootstrap.Modal(document.getElementById('bonificacionModal'));
    const editBonificacionModal = new bootstrap.Modal(document.getElementById('editBonificacionModal'));


    let bonificaciones = [];
    let productos = [];
    let productoChoices = null;

    // Variables de paginación eliminadas
    const searchBonificaciones = document.getElementById('searchBonificaciones');

    // --- Funciones de notificación (Toast) ---
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        const toastTypeClass = type === 'success' ? 'bg-success' : 'bg-danger';
        toast.className = `toast align-items-center text-white ${toastTypeClass} border-0 show`;
        toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
        toastContainer.appendChild(toast);
        new bootstrap.Toast(toast, { delay: 4000 }).show();
    }

    async function cargarDatosIniciales() {
        try {
            const [bonificacionesData, productosData] = await Promise.all([
                fetch('/api/bonificaciones/activas').then(res => res.json()),
                fetch('/api/productos').then(res => res.json())
            ]);
            bonificaciones = bonificacionesData;
            productos = productosData.productos;

            renderizarBonificaciones();
            calcularYMostrarValorTotal();
            inicializarSelectProductos();
        } catch (error) {
            console.error("Error al cargar datos iniciales:", error);
            showToast('Error al cargar los datos del servidor.', 'error');
        }
    }

    function inicializarSelectProductos() {
        productoChoices = new Choices(productoBaseSelect, {
            shouldSort: false,
            searchEnabled: true,
            placeholderValue: 'Seleccione un producto base',
            itemSelectText: '',
        });

        const opcionesProductos = productos.map(p => ({
            value: p.producto_id,
            label: p.nombre,
        }));

        productoChoices.setChoices(opcionesProductos, 'value', 'label', true);
    }

    // --- Renderizado de la tabla con búsqueda (sin paginación) ---
    function renderizarBonificaciones() {
        // Filtrar bonificaciones según el término de búsqueda
        const searchTerm = searchBonificaciones.value.toLowerCase();
        const bonificacionesFiltradas = bonificaciones.filter(b =>
            (b.nombre && b.nombre.toLowerCase().includes(searchTerm)) ||
            (b.categoria_nombre && b.categoria_nombre.toLowerCase().includes(searchTerm)) ||
            (b.presentacion && b.presentacion.toLowerCase().includes(searchTerm))
        );

        bonificacionesTable.innerHTML = '';
        if (bonificacionesFiltradas.length === 0) {
            bonificacionesTable.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron bonificaciones.</td></tr>';
            return;
        }

        // Renderizar todas las bonificaciones filtradas (sin paginación)
        bonificacionesFiltradas.forEach(b => {
            const fila = document.createElement('tr');
            const valorTotal = (b.stock * b.valor_bonif).toFixed(2);


            fila.innerHTML = `
                <td>${b.nombre}</td>
                <td><span class="category-badge">${b.categoria_nombre || 'N/A'}</span></td>
                <td>${b.presentacion}</td>
                <td>${b.stock}</td>
                <td>S/. ${Number(b.valor_bonif).toFixed(2)}</td>
                <td>S/. ${valorTotal}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" data-action="edit" data-id="${b.bonificacion_id}" title="Editar Bonificación">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${b.bonificacion_id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            bonificacionesTable.appendChild(fila);
        });
    }


    // Event listener para búsqueda
    searchBonificaciones.addEventListener('input', () => {
        renderizarBonificaciones();
    });

    // --- Lógica de Eventos ---

    // Crear nueva bonificación
    btnSaveBonificacion.addEventListener('click', async () => {
        const producto_id = productoChoices.getValue(true);
        const stock = document.getElementById('bonificacionStock').value;

        if (!producto_id || stock === '') {
            showToast('Por favor, complete todos los campos.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/bonificaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ producto_id, stock: Number(stock) })
            });

            if (!response.ok) throw new Error('Error al crear la bonificación.');

            const nuevaBonificacion = await response.json();
            bonificaciones.unshift(nuevaBonificacion); // Añadir al inicio

            renderizarBonificaciones();
            bonificacionModal.hide();

            document.getElementById('bonificacionForm').reset();
            productoChoices.clearInput();
            productoChoices.setChoiceByValue('');
            showToast('Bonificación creada exitosamente.', 'success');
            calcularYMostrarValorTotal();
        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        }
    });

    // Clics en la tabla (editar stock, eliminar)
    bonificacionesTable.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;

        if (action === 'edit') {
            const bonificacion = bonificaciones.find(b => b.bonificacion_id == id);
            if (bonificacion) {
                document.getElementById('editBonificacionId').value = id;
                document.getElementById('editBonificacionName').textContent = bonificacion.nombre;
                document.getElementById('editBonificacionPresentacion').value = bonificacion.presentacion;
                document.getElementById('editBonificacionStock').value = bonificacion.stock;
                document.getElementById('editBonificacionValor').value = Number(bonificacion.valor_bonif).toFixed(2);
                editBonificacionModal.show();
            }
        }

        if (action === 'delete') {
            handleDelete(id);
        }
    });

    // Actualizar bonificación (presentación y valor)
    btnUpdateBonificacion.addEventListener('click', async () => {
        const id = document.getElementById('editBonificacionId').value;
        const presentacion = document.getElementById('editBonificacionPresentacion').value.trim();
        const stock = document.getElementById('editBonificacionStock').value;
        const valor_bonif = document.getElementById('editBonificacionValor').value;

        if (!presentacion || valor_bonif === '' || Number(valor_bonif) < 0 || stock === '' || Number(stock) < 0) {
            showToast('Todos los campos son requeridos y los valores numéricos no pueden ser negativos.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/bonificaciones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presentacion, stock: Number(stock), valor_bonif: Number(valor_bonif) })
            });

            if (!response.ok) throw new Error('Error al actualizar la bonificación.');

            const index = bonificaciones.findIndex(b => b.bonificacion_id == id);
            if (index !== -1) {
                bonificaciones[index].presentacion = presentacion;
                bonificaciones[index].stock = Number(stock);
                bonificaciones[index].valor_bonif = Number(valor_bonif);
            }
            renderizarBonificaciones();
            editBonificacionModal.hide();
            showToast('Bonificación actualizada correctamente.', 'success');
            calcularYMostrarValorTotal();
        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        }
    });

    // Eliminar bonificación (Soft Delete)
    function handleDelete(id) {
        const bonificacion = bonificaciones.find(b => b.bonificacion_id == id);
        if (!bonificacion) return;

        Swal.fire({
            title: '¿Estás seguro?',
            html: `Se desactivará la bonificación <strong>${bonificacion.nombre}</strong>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar', // Mantener texto "eliminar" visualmente como pidió el usuario
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Soft delete: actualizar activo = 0
                    const response = await fetch(`/api/bonificaciones/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ activo: 0 }) // Asumiendo que el backend acepta esto para desactivar
                    });

                    if (!response.ok) throw new Error('Error en el servidor.');

                    // Eliminar de la lista local para que desaparezca de la vista
                    bonificaciones = bonificaciones.filter(b => b.bonificacion_id != id);
                    renderizarBonificaciones();
                    calcularYMostrarValorTotal();
                    showToast('Bonificación eliminada.', 'success');
                } catch (error) {
                    console.error(error);
                    showToast('No se pudo eliminar la bonificación.', 'error');
                }
            }
        });
    }

    // --- Cálculos Adicionales ---
    function calcularYMostrarValorTotal() {
        const valorTotalGeneral = bonificaciones.reduce((total, b) => {
            return total + (b.stock * b.valor_bonif);
        }, 0);
        totalBonificacionesValorEl.textContent = `S/. ${valorTotalGeneral.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Iniciar la carga de datos
    cargarDatosIniciales();
});