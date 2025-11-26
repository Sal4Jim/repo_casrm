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

    // Variables de paginación
    const bonificacionesPorPagina = 6;
    let paginaActualBonificaciones = 1;
    const paginationInfoBonificaciones = document.getElementById('pagination-info-bonificaciones');
    const paginationControlsBonificaciones = document.getElementById('pagination-controls-bonificaciones');
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

    // --- Renderizado de la tabla con paginación y búsqueda ---
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
            paginationInfoBonificaciones.innerHTML = '';
            paginationControlsBonificaciones.innerHTML = '';
            return;
        }

        // Calcular paginación con bonificaciones filtradas
        const inicio = (paginaActualBonificaciones - 1) * bonificacionesPorPagina;
        const fin = inicio + bonificacionesPorPagina;
        const bonificacionesPagina = bonificacionesFiltradas.slice(inicio, fin);

        // Renderizar solo las bonificaciones de la página actual
        bonificacionesPagina.forEach(b => {
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

        // Actualizar controles de paginación con bonificaciones filtradas
        actualizarPaginacionBonificaciones(bonificacionesFiltradas);
    }

    // --- Función para actualizar controles de paginación ---
    function actualizarPaginacionBonificaciones(bonificacionesFiltradas = bonificaciones) {
        const total = bonificacionesFiltradas.length;
        const inicio = (paginaActualBonificaciones - 1) * bonificacionesPorPagina;
        const desde = total === 0 ? 0 : inicio + 1;
        const hasta = Math.min(inicio + bonificacionesPorPagina, total);

        paginationInfoBonificaciones.innerHTML = `Mostrando <b>${desde}</b> a <b>${hasta}</b> de <b>${total}</b> bonificaciones`;

        const totalPaginas = Math.ceil(total / bonificacionesPorPagina);
        paginationControlsBonificaciones.innerHTML = '';

        if (totalPaginas <= 1) return;

        // Botón Anterior
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${paginaActualBonificaciones === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Anterior">&laquo;</a>`;
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaActualBonificaciones > 1) {
                paginaActualBonificaciones--;
                renderizarBonificaciones();
            }
        });
        paginationControlsBonificaciones.appendChild(prevLi);

        // Números de página
        for (let i = 1; i <= totalPaginas; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === paginaActualBonificaciones ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                paginaActualBonificaciones = i;
                renderizarBonificaciones();
            });
            paginationControlsBonificaciones.appendChild(li);
        }

        // Botón Siguiente
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${paginaActualBonificaciones === totalPaginas ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente">&raquo;</a>`;
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaActualBonificaciones < totalPaginas) {
                paginaActualBonificaciones++;
                renderizarBonificaciones();
            }
        });
        paginationControlsBonificaciones.appendChild(nextLi);
    }

    // Event listener para búsqueda
    searchBonificaciones.addEventListener('input', () => {
        paginaActualBonificaciones = 1; // Resetear a página 1 al buscar
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

    // Eliminar bonificación
    function handleDelete(id) {
        const bonificacion = bonificaciones.find(b => b.bonificacion_id == id);
        if (!bonificacion) return;

        Swal.fire({
            title: '¿Estás seguro?',
            html: `Se eliminará permanentemente la bonificación <strong>${bonificacion.nombre}</strong>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/api/bonificaciones/${id}`, { method: 'DELETE' });
                    if (response.status !== 204) throw new Error('Error en el servidor.');

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

    // --- Exportar a CSV ---
    function exportarBonificacionesACSV() {
        if (bonificaciones.length === 0) {
            showToast('No hay bonificaciones para exportar.', 'error');
            return;
        }

        // Encabezados del CSV
        const headers = ['Nombre', 'Categoría', 'Presentación', 'Stock', 'Valor Unitario (S/.)', 'Valor Total (S/.)'];

        // Convertir datos a filas de CSV
        const rows = bonificaciones.map(b => {
            const valorTotal = (b.stock * b.valor_bonif).toFixed(2);

            return [
                `"${b.nombre.replace(/"/g, '""')}"`, // Escapar comillas dobles
                `"${b.categoria_nombre || 'N/A'}"`,
                `"${b.presentacion.replace(/"/g, '""')}"`,
                b.stock,
                Number(b.valor_bonif).toFixed(2),
                valorTotal
            ].join(';');
        });

        // Unir encabezados y filas
        const csvContent = [headers.join(';'), ...rows].join('\n');

        // Agregar BOM UTF-8 para que Excel reconozca correctamente los caracteres especiales
        const BOM = '\uFEFF';
        const csvContentWithBOM = BOM + csvContent;

        // Crear un Blob y enlace de descarga
        const blob = new Blob([csvContentWithBOM], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bonificaciones_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Event listener para el botón de exportar
    document.getElementById('btnExportarBonificacionesCSV').addEventListener('click', exportarBonificacionesACSV);

    // Iniciar la carga de datos
    cargarDatosIniciales();
});