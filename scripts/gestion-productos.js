document.addEventListener('DOMContentLoaded', function() {
    // Simulación de categorías existentes (como si vinieran de la BD)
    let categorias = [
        { categoria_id: 1, nombre: "BARQUILLOS" },
        { categoria_id: 2, nombre: "BASES" },
        { categoria_id: 3, nombre: "TOPPINGS" },
        { categoria_id: 4, nombre: "CONOS" },
        { categoria_id: 5, nombre: "BASES" },
        { categoria_id: 6, nombre: "CONOS" },
        { categoria_id: 7, nombre: "CONOS" },
        { categoria_id: 8, nombre: "BASES" },
        { categoria_id: 9, nombre: "CONOS" },
        { categoria_id: 10, nombre: "CONO MARMOLEADO" },
        { categoria_id: 11, nombre: "CONOS" },
        { categoria_id: 12, nombre: "PREMEZCLA FRESA" },
        { categoria_id: 13, nombre: "PREMEZCLA CHOCOLATE" },
        { categoria_id: 14, nombre: "PREMEZCLA VAINILLA" },
        { categoria_id: 15, nombre: "PREMEZCLA MENTA" },
        { categoria_id: 16, nombre: "CONOS GEMELOS" },
    ];

    // Simulación de productos como si vinieran de la base de datos
    let productos = [
        { nombre: "PINOCHO", categoria: "BARQUILLOS", presentacion: "pqt", compra: 10, venta: 12, stock: 400 },
        { nombre: "CROCANTE MINI", categoria: "BARQUILLOS", presentacion: "caja", compra: 8, venta: 9, stock: 0 },
        { nombre: "CONO GRANDE", categoria: "BARQUILLOS", presentacion: "caja", compra: 15, venta: 14, stock: 120 },
        { nombre: "CONO MARMOLEADO", categoria: "CONO MARMOLEADO", presentacion: "caja", compra: 16, venta: 18, stock: 50 },
        { nombre: "PREMEZCLA FRESA", categoria: "PREMEZCLA FRESA", presentacion: "bolsa", compra: 20, venta: 25, stock: 80 },
        { nombre: "PREMEZCLA CHOCOLATE", categoria: "PREMEZCLA CHOCOLATE", presentacion: "bolsa", compra: 20, venta: 25, stock: 60 },
        { nombre: "PREMEZCLA VAINILLA", categoria: "PREMEZCLA VAINILLA", presentacion: "bolsa", compra: 20, venta: 25, stock: 70 },
        { nombre: "PREMEZCLA MENTA", categoria: "PREMEZCLA MENTA", presentacion: "bolsa", compra: 20, venta: 25, stock: 40 },
        { nombre: "CONOS GEMELOS", categoria: "CONOS GEMELOS", presentacion: "caja", compra: 18, venta: 20, stock: 30 }
        // Puedes agregar más productos para probar la paginación
    ];

    // Referencias
    const categorySelect = document.getElementById('productCategory');
    const addCategoryForm = document.getElementById('addCategoryForm');
    const categoryNameInput = document.getElementById('categoryNameInput');
    const categorySuccess = document.getElementById('categorySuccess');
    const productsTable = document.getElementById('productsTable');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');

    // Función para actualizar el select de categorías
    function actualizarSelectCategorias() {
        // Elimina todas las opciones excepto la primera (placeholder)
        categorySelect.innerHTML = '<option value="" selected disabled>Seleccione categoría</option>';
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.nombre;
            opt.textContent = cat.nombre;
            categorySelect.appendChild(opt);
        });
    }

    // Inicializa el select al cargar
    actualizarSelectCategorias();

    // Evento para agregar nueva categoría
    addCategoryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const nombre = categoryNameInput.value.trim();
        if (!nombre) return;

        // Simula inserción en la BD (agrega al array)
        const nuevoId = categorias.length ? categorias[categorias.length - 1].categoria_id + 1 : 1;
        categorias.push({ categoria_id: nuevoId, nombre });

        // Actualiza el select
        actualizarSelectCategorias();

        // Limpia el input y muestra mensaje de éxito
        categoryNameInput.value = '';
        categorySuccess.style.display = 'inline-block';
        setTimeout(() => categorySuccess.style.display = 'none', 1800);
    });

    // Opcional: Si usas Choices.js, actualiza el select visualmente
    if (window.Choices) {
        const choicesInstance = new Choices(categorySelect, { shouldSort: false });
        // Actualiza Choices cuando cambian las opciones
        function refreshChoices() {
            choicesInstance.setChoices(
                categorias.map(cat => ({ value: cat.nombre, label: cat.nombre })),
                'value', 'label', false
            );
            choicesInstance.setChoices([
                { value: "new", label: "+ Crear nueva categoría" }
            ], 'value', 'label', true);
        }
        addCategoryForm.addEventListener('submit', refreshChoices);
    }

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
                <td><span class="category-badge">${prod.categoria}</span></td>
                <td>${prod.presentacion}</td>
                <td>${prod.compra}</td>
                <td>${prod.venta}</td>
                <td${prod.stock == 0 ? ' class="stock-warning"' : ''}>${prod.stock}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" data-bs-toggle="modal"
                        data-bs-target="#productModalModificado" data-action="edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete">
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

    // Inicializar tabla paginada
    mostrarProductos();

    // Actualizar al buscar
    searchInput.addEventListener('input', function() {
        paginaActual = 1;
        mostrarProductos();
    });

    // Función para agregar un nuevo producto (simulación)
    function agregarProducto(nombre, categoria, presentacion, compra, venta, stock) {
        const nuevoProducto = {
            nombre,
            categoria,
            presentacion,
            compra,
            venta,
            stock
        };
        productos.push(nuevoProducto);
        mostrarProductos();
    }

    // Ejemplo de uso de la función agregarProducto
    // agregarProducto('Nuevo Producto', 'BASES', 'caja', 25, 30, 100);
});