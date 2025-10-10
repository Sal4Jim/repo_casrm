// public/js/gestion-clientes.js

document.addEventListener('DOMContentLoaded', function () {
    // === BOTÓN: Guardar cliente ===
    document.getElementById('btnGuardar').addEventListener('click', guardarCliente);

    // === FUNCIÓN PARA GUARDAR CLIENTE ===
    function guardarCliente() {
        // Recoger los valores del formulario
        const cliente = {
            nombre: document.getElementById('nombre').value.trim(),
            ruc: document.getElementById('ruc').value.trim(),
            ciudad: document.getElementById('ciudad').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            direccion: document.getElementById('direccion').value.trim(),
            email: document.getElementById('email').value.trim(),
            agencia: document.getElementById('agencia').value.trim()
        };

        // Validación básica en el frontend
        if (!cliente.nombre || !cliente.email) {
            alert("❌ Los campos 'Nombre' y 'Correo' son obligatorios.");
            return;
        }

        // Mostrar loading en el botón
        const btnGuardar = document.getElementById('btnGuardar');
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
        btnGuardar.disabled = true;

<<<<<<< HEAD:public/js/gestion-clientes.js
        // Enviar los datos al backend
        axios.post('/api/clientes', cliente)
            .then(function (response) {
                // Éxito
                if (response.data.success) {
                    alert("✅ Cliente guardado correctamente. ID: " + response.data.id);
                    
                    // Cerrar el modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
                    modal.hide();
                    
                    // Limpiar el formulario
                    document.getElementById('clienteForm').reset();
                    
                    console.log('Cliente guardado:', response.data);
                }
            })
            .catch(function (error) {
                // Manejar errores
                let mensaje = "❌ Error al guardar el cliente";
                if (error.response) {
                    mensaje = `❌ ${error.response.data.error || "Error desconocido"}`;
                } else if (error.request) {
                    mensaje = "❌ No se pudo conectar con el servidor. ¿Está Node.js corriendo en puerto 3000?";
                }
                alert(mensaje);
                console.error('Error completo:', error);
            })
            .finally(function () {
                // Restaurar botón
                btnGuardar.innerHTML = 'Guardar';
                btnGuardar.disabled = false;
=======
            // Datos adicionales (por ahora estáticos o mejorables después)
            document.getElementById('detailEmail').textContent = 'cliente@ejemplo.com';
            document.getElementById('detailAgency').textContent = 'Agencia Central';
            document.getElementById('detailNotes').textContent = 'Sin notas registradas.';
            document.getElementById('purchaseCount').textContent = '0 compras';

            // Mostrar modal usando la API de Bootstrap 5
            const detailModal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
            detailModal.show();
        });
    });

    // === BOTÓN: Editar cliente (abre el mismo modal que "Nuevo", pero en modo edición) ===
    document.querySelectorAll('[data-action="edit"]').forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            if (!row) return;

            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            // Rellenar el formulario (esto lo harás mejor cuando tengas IDs reales)
            document.getElementById('clientName').value = cells[0].textContent.trim();
            document.getElementById('clientRUC').value = cells[1].textContent.trim();
            document.getElementById('clientCity').value = cells[2].textContent.trim();
            document.getElementById('clientPhone').value = cells[3].textContent.trim();

            // Cambiar título del modal a "Editar Cliente"
            const modalTitle = document.querySelector('#clientModal .modal-title');
            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i> Editar Cliente';

            // Mostrar modal
            const editModal = new bootstrap.Modal(document.getElementById('clientModal'));
            editModal.show();
        });
    });

    // === BOTÓN: Nuevo cliente (restablecer formulario) ===
    document.getElementById('btnNuevo')?.addEventListener('click', function () {
        // Limpiar el formulario
        document.getElementById('clientForm')?.reset();

        // Restaurar título del modal
        const modalTitle = document.querySelector('#clientModal .modal-title');
        modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Nuevo Cliente';
    });

    // === BÚSQUEDA EN TIEMPO REAL (opcional pero útil) ===
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#clientsTable tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(filter) ? '' : 'none';
>>>>>>> origin/develop:scripts/gestion-clientes.js
            });
    }

    // === BOTÓN: Nuevo cliente (limpiar formulario) ===
    document.querySelector('[data-bs-target="#clientModal"]').addEventListener('click', function() {
        document.getElementById('clienteForm').reset();
    });
});