document.addEventListener('DOMContentLoaded', function() {
    let gastos = []; // El array ahora se cargará desde la API
    const gastosPorPagina = 6;
    let paginaActual = 1;

    const tablaBody = document.getElementById('gastosTableBody');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationInfo = document.getElementById('pagination-info');
    const searchInput = document.getElementById('searchGastos');

    async function cargarGastos() {
        try {
            const response = await fetch('/api/gastos');
            if (!response.ok) throw new Error('Error al cargar los gastos.');
            const data = await response.json();
            if (data.success) {
                gastos = data.gastos;
                mostrarGastos();
            }
        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        }
    }

    function mostrarGastos() {
        const searchTerm = searchInput.value.toLowerCase();
        const gastosFiltrados = gastos.filter(g => 
            (g.descripcion && g.descripcion.toLowerCase().includes(searchTerm)) ||
            (g.persona && String(g.persona).toLowerCase().includes(searchTerm))
        );

        const inicio = (paginaActual - 1) * gastosPorPagina;
        const fin = inicio + gastosPorPagina;
        const gastosPagina = gastosFiltrados.slice(inicio, fin);

        tablaBody.innerHTML = '';
        if (gastosPagina.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No se encontraron gastos.</td></tr>';
        } else {
            gastosPagina.forEach(gasto => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${gasto.descripcion}</td>
                    <td>S/. ${Number(gasto.monto).toLocaleString('es-PE', {minimumFractionDigits:2})}</td>
                    <td>${new Date(gasto.fecha).toLocaleDateString('es-PE', { timeZone: 'UTC' })}</td>
                    <td>${gasto.persona || 'N/A'}</td>
                `;
                tablaBody.appendChild(fila);
            });
        }

        const total = gastosFiltrados.length;
        const desde = total === 0 ? 0 : inicio + 1;
        const hasta = Math.min(fin, total);
        paginationInfo.innerHTML = `Mostrando <b>${desde}</b> a <b>${hasta}</b> de <b>${total}</b> gastos`;

        const totalPaginas = Math.ceil(total / gastosPorPagina);
        paginationControls.innerHTML = '';

        if (totalPaginas <= 1) return;

        // Botón Anterior
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${paginaActual === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Anterior">&laquo;</a>`;
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaActual > 1) {
                paginaActual--;
                mostrarGastos();
            }
        });
        paginationControls.appendChild(prevLi);

        // Números de página
        for (let i = 1; i <= totalPaginas; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === paginaActual ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                paginaActual = i;
                mostrarGastos();
            });
            paginationControls.appendChild(li);
        }

        // Botón siguiente
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente">&raquo;</a>`;
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (paginaActual < totalPaginas) {
                paginaActual++;
                mostrarGastos();
            }
        });
        paginationControls.appendChild(nextLi);
    }

    searchInput.addEventListener('input', () => {
        paginaActual = 1;
        mostrarGastos();
    });

    // Cargar los gastos iniciales desde la base de datos
    cargarGastos();

    // Set current date by default
    const today = new Date();
    const formattedDate = today.toISOString().substr(0, 10);
    document.getElementById('fecha').value = formattedDate;
    
    // Toggle form visibility
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const formContainer = document.getElementById('gasto-form-container');

    toggleFormBtn.addEventListener('click', function() {
        if (formContainer.style.display === 'none' || formContainer.style.display === '') {
            formContainer.style.display = 'block';
            toggleFormBtn.innerHTML = '<i class="fas fa-times me-2"></i> Cerrar Formulario';
        } else {
            formContainer.style.display = 'none';
            toggleFormBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Agregar Gasto';
        }
    });
    
    // Form clear button
    document.getElementById('btn-limpiar').addEventListener('click', function() {
        document.getElementById('gasto-form').reset();
        document.getElementById('fecha').value = formattedDate;
        
        // Ocultar formulario y restaurar texto del botón
        formContainer.style.display = 'none';
        toggleFormBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Agregar Gasto';
    });
    
    // Form submit handler
    document.getElementById('gasto-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Form validation
        const gastoData = {
            descripcion: document.getElementById('descripcion').value.trim(),
            monto: document.getElementById('monto').value,
            fecha: document.getElementById('fecha').value, // Enviamos solo la fecha, el servidor pondrá la hora.
            persona: document.getElementById('persona').value.trim()
        };
        
        if (!gastoData.descripcion || !gastoData.monto || !gastoData.fecha || !gastoData.persona) {
            showToast('Por favor complete todos los campos.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/gastos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gastoData)
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Error al guardar el gasto.');

            showToast(result.message, 'success');
            
            // Añadir el nuevo gasto al inicio del array y recargar la tabla
            gastos.unshift(result.gasto);
            mostrarGastos();

            // Limpiar y ocultar el formulario
            document.getElementById('gasto-form').reset();
            document.getElementById('fecha').value = formattedDate;
            formContainer.style.display = 'none';
            toggleFormBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Agregar Gasto';

        } catch (error) {
            showToast(error.message, 'error');
        }
    });
    
    // Funcionalidad de edición (ejemplo)
    tablaBody.addEventListener('click', function(e) {
        const editButton = e.target.closest('.edit-btn'); // Suponiendo que agregas botones de edición con esta clase
        if (!editButton) return;

        // Lógica para llenar el formulario con datos de la fila
        const row = button.closest('tr');
        const columns = row.querySelectorAll('td');
        
        document.getElementById('descripcion').value = columns[0].textContent.trim();
        document.getElementById('monto').value = columns[1].textContent.trim().replace('S/. ', '').replace(',', '');
        
      // Convert date format
        // const dateParts = columns[2].textContent.trim().split('/');
        // const formattedEditDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        // document.getElementById('fecha').value = formattedEditDate;

        document.getElementById('persona').value = columns[3].textContent.trim();

        // Scroll to form
        formContainer.style.display = 'block';
        formContainer.scrollIntoView({ behavior: 'smooth' });
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
});