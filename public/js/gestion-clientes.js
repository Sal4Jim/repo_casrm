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

        // Validación mejorada con focos específicos
        if (!cliente.nombre) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> El campo <strong>Nombre</strong> es obligatorio', 'error');
            document.getElementById('nombre').focus();
            return;
        }

        if (!cliente.telefono) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> El campo <strong>Teléfono</strong> es obligatorio', 'error');
            document.getElementById('telefono').focus();
            return;
        }

        if (!cliente.ciudad) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> El campo <strong>Ciudad</strong> es obligatorio', 'error');
            document.getElementById('ciudad').focus();
            return;
        }

        const btnGuardar = document.getElementById('btnGuardar');
        setButtonLoading(btnGuardar, true);

        // Enviar los datos al backend
        axios.post('/api/clientes', cliente)
            .then(function (response) {
                if (response.data.success) {
                    showToast(
                        `<i class="fas fa-check-circle me-2"></i> Cliente <strong>${cliente.nombre}</strong> guardado exitosamente`, 
                        'success'
                    );
                    
                    // Cerrar modal después de 1.5 segundos (para que se vea el mensaje)
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
                        if (modal) {
                            modal.hide();
                        }
                        document.getElementById('clienteForm').reset();
                    }, 1500);
                }
            })
            .catch(function (error) {
                let mensaje = "Error al guardar el cliente";
                if (error.response && error.response.data) {
                    mensaje = error.response.data.error || "Error en el servidor";
                } else if (error.request) {
                    mensaje = "No se pudo conectar con el servidor. Verifica que esté ejecutándose.";
                }
                showToast(`<i class="fas fa-times-circle me-2"></i> ${mensaje}`, 'error');
            })
            .finally(function () {
                setButtonLoading(btnGuardar, false);
            });
    }

    // === BOTÓN: Nuevo cliente (limpiar formulario) ===
    document.querySelector('[data-bs-target="#clientModal"]').addEventListener('click', function() {
        document.getElementById('clienteForm').reset();
    });

    // === FUNCIÓN PARA MOSTRAR NOTIFICACIONES TOAST ===
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.error('No se encontró el contenedor de toasts');
            return;
        }

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-custom toast-${type} show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-header">
                <strong class="me-auto">
                    ${type === 'success' ? '✅ Éxito' : 
                      type === 'error' ? '❌ Error' : 
                      type === 'warning' ? '⚠️ Advertencia' : 'ℹ️ Información'}
                </strong>
                <small>ahora</small>
                <button type="button" class="btn-close" onclick="document.getElementById('${toastId}').remove()"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement && toastElement.parentNode) {
                toastElement.remove();
            }
        }, 5000);
    }

    // === FUNCIÓN PARA LOADING DEL BOTÓN ===
    function setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
            button.disabled = true;
            button.classList.add('disabled');
        } else {
            button.innerHTML = '<i class="fas fa-save me-2"></i> Guardar';
            button.disabled = false;
            button.classList.remove('disabled');
        }
    }

    // === BÚSQUEDA EN TIEMPO REAL (si la necesitas) ===
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#clientsTable tbody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(filter) ? '' : 'none';
            });
        });
    }
});