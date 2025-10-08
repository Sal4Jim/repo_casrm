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

    // Referencias
    const categorySelect = document.getElementById('productCategory');
    const addCategoryForm = document.getElementById('addCategoryForm');
    const categoryNameInput = document.getElementById('categoryNameInput');
    const categorySuccess = document.getElementById('categorySuccess');

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
        // Opción para crear nueva categoría
        const optNew = document.createElement('option');
        optNew.value = "new";
        optNew.textContent = "+ Crear nueva categoría";
        categorySelect.appendChild(optNew);
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
});