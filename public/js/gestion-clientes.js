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
            });
    }

    // === BOTÓN: Nuevo cliente (limpiar formulario) ===
    document.querySelector('[data-bs-target="#clientModal"]').addEventListener('click', function() {
        document.getElementById('clienteForm').reset();
    });
});