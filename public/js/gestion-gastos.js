document.addEventListener('DOMContentLoaded', function() {
    let gastos = [
        { descripcion: "Compra de azúcar y leche", monto: 450.00, fecha: "24/05/2025", persona: "María Gonzales" },
        { descripcion: "Reparación congelador", monto: 850.00, fecha: "22/05/2025", persona: "Roberto Méndez" },
        { descripcion: "Pago alquiler local", monto: 1200.00, fecha: "19/05/2025", persona: "Carlos López" },
        { descripcion: "Compra de barquillos", monto: 320.00, fecha: "15/05/2025", persona: "Lucía Torres Davila" },
        { descripcion: "Servicio de marketing digital", monto: 500.00, fecha: "10/05/2025", persona: "Jimmy Montoya Melendez" },
        { descripcion: "Compra de frutas", monto: 210.00, fecha: "09/05/2025", persona: "Ana Ruiz" },
        { descripcion: "Mantenimiento máquina", monto: 700.00, fecha: "08/05/2025", persona: "Pedro Salinas" },
        { descripcion: "Compra de toppings", monto: 180.00, fecha: "07/05/2025", persona: "Sofía Castro" },
        { descripcion: "Pago luz", monto: 350.00, fecha: "06/05/2025", persona: "Luis Paredes" },
        { descripcion: "Compra de envases", monto: 120.00, fecha: "05/05/2025", persona: "Marta Rojas" },
        { descripcion: "Publicidad en redes", monto: 400.00, fecha: "04/05/2025", persona: "Jorge Medina" },
        { descripcion: "Compra de chocolate", monto: 250.00, fecha: "03/05/2025", persona: "Andrea Torres" },
        { descripcion: "Pago agua", monto: 130.00, fecha: "02/05/2025", persona: "Miguel Díaz" },
        { descripcion: "Compra de vainilla", monto: 160.00, fecha: "01/05/2025", persona: "Paula Sánchez" }
    ];

    const gastosPorPagina = 6;
    let paginaActual = 1;

    const tablaBody = document.querySelector('tbody');
    const paginacionDiv = document.querySelector('[aria-label="Pagination"]');
    const mostrarInfo = document.querySelector('.text-sm.text-gray-700');

    function mostrarGastos() {
        const inicio = (paginaActual - 1) * gastosPorPagina;
        const fin = inicio + gastosPorPagina;
        const gastosPagina = gastos.slice(inicio, fin);


        tablaBody.innerHTML = '';
        gastosPagina.forEach(gasto => {
            const fila = document.createElement('tr');
            fila.className = "table-row";
            fila.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${gasto.descripcion}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">S/. ${gasto.monto.toLocaleString('es-PE', {minimumFractionDigits:2})}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${gasto.fecha}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${gasto.persona}</div>
                </td>
            `;
            tablaBody.appendChild(fila);
        });

        const total = gastos.length;
        const desde = total === 0 ? 0 : inicio + 1;
        const hasta = Math.min(fin, total);
        mostrarInfo.innerHTML = `Mostrando <span class="font-medium">${desde}</span> a <span class="font-medium">${hasta}</span> de <span class="font-medium">${total}</span> gastos`;


        const totalPaginas = Math.ceil(total / gastosPorPagina);
        paginacionDiv.innerHTML = '';

        const btnAnterior = document.createElement('a');
        btnAnterior.href = "javascript:void(0)";
        btnAnterior.className = "relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50";
        btnAnterior.innerHTML = `<span class="sr-only">Anterior</span><i class="fas fa-chevron-left"></i>`;
        btnAnterior.onclick = () => {
            if (paginaActual > 1) {
                paginaActual--;
                mostrarGastos();
            }
        };
        paginacionDiv.appendChild(btnAnterior);

        for (let i = 1; i <= totalPaginas; i++) {
            const btnPagina = document.createElement('a');
            btnPagina.href = "javascript:void(0)";
            btnPagina.className = i === paginaActual
                ? "z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium";
            btnPagina.textContent = i;
            btnPagina.onclick = () => {
                paginaActual = i;
                mostrarGastos();
            };
            paginacionDiv.appendChild(btnPagina);
        }

        // Botón siguiente
        const btnSiguiente = document.createElement('a');
        btnSiguiente.href = "javascript:void(0)";
        btnSiguiente.className = "relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50";
        btnSiguiente.innerHTML = `<span class="sr-only">Siguiente</span><i class="fas fa-chevron-right"></i>`;
        btnSiguiente.onclick = () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                mostrarGastos();
            }
        };
        paginacionDiv.appendChild(btnSiguiente);
    }

    // Inicializar tabla paginada
    mostrarGastos();

    // Set current date by default
    const today = new Date();
    const formattedDate = today.toISOString().substr(0, 10);
    document.getElementById('fecha').value = formattedDate;
    
    // Toggle form visibility
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const formContainer = document.getElementById('gasto-form-container');

    toggleFormBtn.addEventListener('click', function() {
        if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        toggleFormBtn.innerHTML = '<i class="fas fa-times mr-2"></i> Cerrar Formulario';
        } else {
        formContainer.classList.add('hidden');
        toggleFormBtn.innerHTML = '<i class="fas fa-ice-cream mr-2"></i> Agregar Gasto';
        }
    });
    
    // Form clear button
    document.getElementById('btn-limpiar').addEventListener('click', function() {
        document.getElementById('gasto-form').reset();
        document.getElementById('fecha').value = formattedDate;
        
        // Hide form after clearing and reset button text
        formContainer.classList.add('hidden');
        toggleFormBtn.innerHTML = '<i class="fas fa-ice-cream mr-2"></i> Agregar Gasto';
    });
    
    // Form submit handler
    document.getElementById('gasto-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Form validation
        const descripcion = document.getElementById('descripcion').value;
        const monto = document.getElementById('monto').value;
        const fecha = document.getElementById('fecha').value;
        const persona = document.getElementById('persona').value;
        
        if (!descripcion || !monto || !fecha || !persona) {
        alert('Por favor complete todos los campos obligatorios');
        return;
        }
        
        // In a real implementation, we would send the data to the server
        // For this prototype, we'll just show a success toast
        showSuccessToast();
        document.getElementById('gasto-form').reset();
        document.getElementById('fecha').value = formattedDate;
        
        // Hide form after submission and reset button text
        formContainer.classList.add('hidden');
        toggleFormBtn.innerHTML = '<i class="fas fa-ice-cream mr-2"></i> Agregar Gasto';
    });
    
    // Delete confirmation modal handling
    const deleteButtons = document.querySelectorAll('.fa-trash-alt');
    const deleteModal = document.getElementById('delete-modal');
    const closeModalButtons = document.querySelectorAll('.delete-close-btn');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
        deleteModal.classList.remove('hidden');
        });
    });
    
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
        deleteModal.classList.add('hidden');
        });
    });
    
    // Success toast handling
    function showSuccessToast() {
        const toast = document.getElementById('success-toast');
        toast.classList.remove('hidden');
        
        setTimeout(function() {
        toast.classList.add('hidden');
        }, 3000);
    }
    
    // Edit functionality
    const editButtons = document.querySelectorAll('.fa-edit');
    
    editButtons.forEach(button => {
    button.addEventListener('click', function() {
      // In a real implementation, we would fetch the data from the server
      // For this prototype, we'll just fill the form with sample data
        const row = button.closest('tr');
        const columns = row.querySelectorAll('td');
        
        document.getElementById('descripcion').value = columns[0].textContent.trim();
        document.getElementById('monto').value = columns[1].textContent.trim().replace('S/. ', '').replace(',', '');
        
      // Convert date format
        const dateParts = columns[2].textContent.trim().split('/');
        const formattedEditDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        document.getElementById('fecha').value = formattedEditDate;
        
        document.getElementById('persona').value = columns[3].textContent.trim();
        
        // Scroll to form
        document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
        });
    });
    });