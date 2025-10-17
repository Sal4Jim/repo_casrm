document.addEventListener('DOMContentLoaded', function() {
    // Referencias
    const productModalEl = document.getElementById('productModal');
    const categorySelect = document.getElementById('productCategory');
    const addCategoryForm = document.getElementById('addCategoryForm');
    const categoryNameInput = document.getElementById('categoryNameInput');
    const categorySuccess = document.getElementById('categorySuccess');
    const productsTable = document.getElementById('productsTable');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const productForm = document.getElementById('productForm');
    const btnSave = document.getElementById('btnSave');
    const btnExportarCSV = document.getElementById('btnExportarCSV');

    let categorias = [];
    let productos = [];

    // Instancia de Choices.js (si está disponible)
    let choicesInstance = null;

    // === FUNCIÓN PARA MOSTRAR NOTIFICACIONES TOAST ===
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        const toastTypeClass = type === 'success' ? 'bg-success' : 'bg-danger';
        toast.className = `toast align-items-center text-white ${toastTypeClass} border-0 show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
        bsToast.show();
    }

    function createToastContainer() {
        let container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1090'; // Asegurar que esté sobre los modales
        document.body.appendChild(container);
        return container;
    }


    // Cargar categorías desde la API
    function cargarCategorias() {
        fetch('/api/categorias')
            .then(response => response.json())
            .then(data => {
                categorias = data;
                actualizarSelectCategorias();
            })
            .catch(err => console.error('Error al cargar categorías:', err));
    }

    // Cargar productos desde la API
    function cargarProductos() {
        fetch('/api/productos')
            .then(response => response.json())
            .then(data => {
                productos = data;
                mostrarProductos();
            })
            .catch(err => console.error('Error al cargar productos:', err));
    }

    // Función para actualizar el select de categorías
    function actualizarSelectCategorias() {
        // Limpiar el select
        categorySelect.innerHTML = '<option value="" selected disabled>Seleccione categoría</option>';

        // Agregar categorías
        categorias.forEach(cat => { 
            const opt = document.createElement('option');
            opt.value = cat.nombre;
            opt.textContent = cat.nombre;
            categorySelect.appendChild(opt);
        });

        // Si Choices.js está inicializado, actualizarlo
        if (choicesInstance) {
            choicesInstance.destroy(); // Destruir instancia anterior
            choicesInstance = new Choices(categorySelect, {
                shouldSort: false,
                searchEnabled: true,
                placeholderValue: 'Seleccione categoría',
                itemSelectText: ''
            });
        }
    }

    // Inicializa al cargar
    cargarCategorias();
    cargarProductos();

    // Inicializar Choices.js solo si la librería está cargada
    if (window.Choices && !choicesInstance) {
        choicesInstance = new Choices(categorySelect, {
            shouldSort: false,
            searchEnabled: true,
            placeholderValue: 'Seleccione categoría',
            itemSelectText: 'Presione Enter para seleccionar'
        });
    }

    // Evento para agregar nueva categoría
    addCategoryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const nombre = categoryNameInput.value.trim();
        if (!nombre) return;

        // Enviar nueva categoría a la API
        fetch('/api/categorias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre })
        })
        .then(response => response.json())
        .then(nuevaCategoria => {
            // Agregar nueva categoría al array local
            categorias.push(nuevaCategoria);
            // Actualizar el select
            actualizarSelectCategorias();
            // Limpia el input y muestra mensaje de éxito
            categoryNameInput.value = '';
            categorySuccess.style.display = 'inline-block';
            setTimeout(() => categorySuccess.style.display = 'none', 1800);
        })
        .catch(err => console.error('Error al crear categoría:', err));
    });

    // Evento para guardar nuevo producto
    btnSave.addEventListener('click', function() {
        const nombre = document.getElementById('productName').value.trim();
        const categoria = document.getElementById('productCategory').value;
        const presentacion = document.getElementById('productPresentation').value.trim();
        const precioCompra = parseFloat(document.getElementById('productBuyPrice').value);
        const precioVenta = parseFloat(document.getElementById('productSellPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);

        if (!nombre || !categoria || !presentacion || isNaN(precioCompra) || isNaN(precioVenta) || isNaN(stock)) {
            showToast('<i class="fas fa-exclamation-circle me-2"></i> Por favor, complete todos los campos obligatorios.', 'error');
            return;
        }

        // Si seleccionó "Crear nueva categoría", no permitir crear producto
        if (categoria === 'new') {
            showToast('<i class="fas fa-folder-plus me-2"></i> Seleccione una categoría válida o cree una nueva.', 'error');
            return;
        }

        // Enviar nuevo producto a la API
        const categoriaSeleccionada = categorias.find(cat => cat.nombre === categoria);
        if (!categoriaSeleccionada) {
            showToast('<i class="fas fa-times-circle me-2"></i> Categoría no encontrada. Recargue la página.', 'error');
            return;
        }

        const nuevoProducto = {
            nombre,
            categoria_id: categoriaSeleccionada.categoria_id,
            presentacion,
            precio_compra: precioCompra,
            precio_venta: precioVenta,
            stock
        };

        // Feedback de carga
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';

        fetch('/api/productos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoProducto)
        })
        .then(response => response.json())
        .then(productoCreado => {
            // Agregar producto al array local
            productos.push(productoCreado);
            // Actualizar tabla
            mostrarProductos();
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(productModalEl);
            modal.hide();
            productForm.reset();
            showToast(`<i class="fas fa-check-circle me-2"></i> Producto <strong>${nuevoProducto.nombre}</strong> creado exitosamente.`, 'success');
        })
        .catch(err => {
            console.error('Error al crear producto:', err);
            showToast('<i class="fas fa-times-circle me-2"></i> Error al crear el producto.', 'error');
        })
        .finally(() => {
            // Restaurar botón
            btnSave.disabled = false;
            btnSave.innerHTML = 'Guardar';
        });
    });

    // Manejar cambio en el select de categoría
    categorySelect.addEventListener('change', function() {
        if (this.value === 'new') {
            // Abrir modal de nueva categoría
            const modal = new bootstrap.Modal(document.getElementById('modalCategoria'));
            modal.show();
            // Limpiar selección
            this.value = '';
        }
    });

    const productosPorPagina = 5;
    let paginaActual = 1;

    function mostrarProductos() {
        // Filtrado por búsqueda
        const searchTerm = searchInput.value.trim().toLowerCase();
        let productosFiltrados = productos.filter(prod =>
            prod.nombre.toLowerCase().includes(searchTerm)
        );

        // Calcular paginación
        const total = productosFiltrados.length;
        const totalPaginas = Math.ceil(total / productosPorPagina);
        const inicio = (paginaActual - 1) * productosPorPagina;
        const fin = inicio + productosPorPagina;
        const productosPagina = productosFiltrados.slice(inicio, fin);

        // Renderizar filas
        productsTable.innerHTML = '';
        productosPagina.forEach(prod => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${prod.nombre}</td>
                <td><span class="category-badge">${prod.categoria_nombre}</span></td>
                <td>${prod.presentacion}</td>
                <td>S/. ${prod.precio_compra}</td>
                <td>S/. ${prod.precio_venta}</td>
                <td${prod.stock == 0 ? ' class="stock-warning"' : ''}>${prod.stock}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" data-bs-toggle="modal"
                        data-bs-target="#productModal" data-action="edit" data-id="${prod.producto_id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${prod.producto_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            productsTable.appendChild(fila);
        });

        // Renderizar paginación
        pagination.innerHTML = '';

        // Botón anterior
        const liAnterior = document.createElement('li');
        liAnterior.className = 'page-item' + (paginaActual === 1 ? ' disabled' : '');
        const btnAnterior = document.createElement('a');
        btnAnterior.className = 'page-link';
        btnAnterior.href = '#';
        btnAnterior.innerHTML = '&laquo;';
        btnAnterior.onclick = function(e) {
            e.preventDefault();
            if (paginaActual > 1) {
                paginaActual--;
                mostrarProductos();
            }
        };
        liAnterior.appendChild(btnAnterior);
        pagination.appendChild(liAnterior);

        // Números de página
        for (let i = 1; i <= totalPaginas; i++) {
            const li = document.createElement('li');
            li.className = 'page-item' + (i === paginaActual ? ' active' : '');
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.onclick = function(e) {
                e.preventDefault();
                paginaActual = i;
                mostrarProductos();
            };
            li.appendChild(a);
            pagination.appendChild(li);
        }

        // Botón siguiente
        const liSiguiente = document.createElement('li');
        liSiguiente.className = 'page-item' + (paginaActual === totalPaginas || totalPaginas === 0 ? ' disabled' : '');
        const btnSiguiente = document.createElement('a');
        btnSiguiente.className = 'page-link';
        btnSiguiente.href = '#';
        btnSiguiente.innerHTML = '&raquo;';
        btnSiguiente.onclick = function(e) {
            e.preventDefault();
            if (paginaActual < totalPaginas) {
                paginaActual++;
                mostrarProductos();
            }
        };
        liSiguiente.appendChild(btnSiguiente);
        pagination.appendChild(liSiguiente);
    }

    // Actualizar al buscar
    searchInput.addEventListener('input', function() {
        paginaActual = 1;
        mostrarProductos();
    });

    // === FUNCIÓN PARA EXPORTAR A CSV ===
    function exportarProductosACSV() {
        if (productos.length === 0) {
            showToast('<i class="fas fa-info-circle me-2"></i> No hay productos para exportar.', 'error');
            return;
        }

        // Encabezados del CSV
        const headers = ['Nombre', 'Categoría', 'Presentación', 'Precio de Compra', 'Precio de Venta', 'Stock'];
        
        // Convertir datos de productos a filas de CSV
        const rows = productos.map(prod => [
            `"${prod.nombre.replace(/"/g, '""')}"`, // Escapar comillas dobles
            `"${prod.categoria_nombre}"`,
            `"${prod.presentacion}"`,
            prod.precio_compra,
            prod.precio_venta,
            prod.stock
        ].join(','));

        // Unir encabezados y filas
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Crear un Blob para el contenido CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Crear un enlace temporal para la descarga
        const link = document.createElement('a');
        if (link.download !== undefined) { // Feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `productos_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        showToast('<i class="fas fa-file-download me-2"></i> Exportación a CSV iniciada.', 'success');
    }

    // Evento para el botón de exportar
    btnExportarCSV.addEventListener('click', exportarProductosACSV);
});