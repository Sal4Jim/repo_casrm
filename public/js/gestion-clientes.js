// scripts/gestion-clientes.js

document.addEventListener('DOMContentLoaded', function () {
    // === BOTÓN: Detalle del cliente ===
    document.querySelectorAll('[data-action="info"]').forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            if (!row) return;

            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            // Extraer datos visibles de la tabla
            const name = cells[0].textContent.trim();
            const ruc = cells[1].textContent.trim();
            const city = cells[2].textContent.trim();
            const phone = cells[3].textContent.trim();

            // Actualizar el modal de detalle
            document.getElementById('detailName').textContent = name;
            document.getElementById('detailRUC').textContent = ruc;
            document.getElementById('detailCity').textContent = city;
            document.getElementById('detailPhone').textContent = phone;

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
            });
        });
    }
});