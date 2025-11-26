document.addEventListener('DOMContentLoaded', function() {
    // console.log('Script de reportes cargado.');

    // --- Variables globales para almacenar todos los datos ---
    let allVentas = [];
    let allGastos = [];

    // --- Variables para almacenar los datos filtrados ---
    let filteredVentas = [];
    let filteredGastos = [];

    // --- Instancias de los gráficos ---
    let ventasGastosChartInstance = null;
    let gastosPersonaChartInstance = null;
    let topProductosIngresosChartInstance = null;
    let topProductosCantidadChartInstance = null;

    // Referencias a elementos del DOM
    const kpiVentasEl = document.getElementById('kpi-ventas-totales');
    const kpiGastosEl = document.getElementById('kpi-gastos-totales');
    const kpiUtilidadEl = document.getElementById('kpi-utilidad');
    const fechaInicioEl = document.getElementById('fechaInicio');
    const fechaFinEl = document.getElementById('fechaFin');
    const btnFiltrarPersonalizado = document.getElementById('btnFiltrarPersonalizado');
    const periodButtons = document.querySelectorAll('.btn-group button[data-period]');

    // --- Funciones de utilidad para fechas ---

    // Formatea una fecha a 'YYYY-MM-DD'
    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Calcula el rango de fechas para un período dado
    function getPeriodDates(period) {
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Último día del mes actual
                break;
            case 'quarter':
                const currentMonth = now.getMonth();
                const currentQuarter = Math.floor(currentMonth / 3);
                startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
                endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0); // Último día del trimestre actual
                break;
            case 'semester':
                const currentSemester = now.getMonth() < 6 ? 0 : 6;
                startDate = new Date(now.getFullYear(), currentSemester, 1);
                endDate = new Date(now.getFullYear(), currentSemester + 6, 0); // Último día del semestre actual
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default: // Por defecto, el mes actual
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
        }
        // Asegurarse de que la hora sea 00:00:00 para el inicio y 23:59:59 para el fin
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }

    // --- Funciones principales ---

    // Función para cargar todos los datos necesarios
    async function cargarDatos(callback) {
        try {
            // Usamos Promise.all para cargar ventas y gastos en paralelo
            const [ventasRes, gastosRes] = await Promise.all([
                fetch('/api/ventas'), // Asumimos que esta ruta devuelve todas las ventas
                fetch('/api/gastos')  // Asumimos que esta ruta devuelve todos los gastos
            ]);

            const ventasData = await ventasRes.json();
            const gastosData = await gastosRes.json();

            if (ventasData.success) {
                allVentas = ventasData.ventas.map(v => ({
                    ...v,
                    fecha: new Date(v.fecha), // Convertir la fecha a objeto Date
                    total: parseFloat(v.total) // Asegurar que el total sea un número
                }));
            } else {
                console.error('Error al cargar ventas:', ventasData.error);
            }

            if (gastosData.success) {
                allGastos = gastosData.gastos.map(g => ({
                    ...g,
                    fecha: new Date(g.fecha), // Convertir la fecha a objeto Date
                    monto: parseFloat(g.monto) // Asegurar que el monto sea un número
                }));
            } else {
                console.error('Error al cargar gastos:', gastosData.error);
            }

            // console.log('Todas las ventas cargadas:', allVentas);
            // console.log('Todos los gastos cargados:', allGastos);

            // Si se proporciona un callback, ejecutarlo.
            // Esto se usará para aplicar el filtro después de cargar los datos.
            if (callback && typeof callback === 'function') {
                callback();
            }

        } catch (error) {
            console.error('Error al cargar los datos para los reportes:', error);
        }
    }

    // Aplica el filtro de fecha a los datos y actualiza los KPIs
    async function applyFilter(period, customStart = null, customEnd = null) {
        let startDate, endDate;

        if (period === 'custom' && customStart && customEnd) {
            // Construir fechas personalizadas explícitamente en la zona horaria local
            const [startYear, startMonth, startDay] = customStart.split('-').map(Number);
            startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0); // Inicio del día en hora local
            
            const [endYear, endMonth, endDay] = customEnd.split('-').map(Number);
            endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999); // Fin del día en hora local

        } else {
            const dates = getPeriodDates(period);
            startDate = dates.startDate;
            endDate = dates.endDate;
        }

        // Actualizar los inputs de fecha para reflejar el filtro aplicado
        fechaInicioEl.value = formatDate(startDate);
        fechaFinEl.value = formatDate(endDate);

        // Volver a cargar los datos de ventas y gastos antes de filtrar
        await cargarDatos(() => {
            // Este código se ejecuta DESPUÉS de que los datos se hayan recargado
            // Filtrar ventas
            filteredVentas = allVentas.filter(venta => {
                return venta.fecha >= startDate && venta.fecha <= endDate;
            });

            // Filtrar gastos
            filteredGastos = allGastos.filter(gasto => {
                return gasto.fecha >= startDate && gasto.fecha <= endDate;
            });

            // console.log(`Datos filtrados para el período ${period} (${formatDate(startDate)} - ${formatDate(endDate)}):`);
            // console.log('Ventas filtradas:', filteredVentas);
            // console.log('Gastos filtrados:', filteredGastos);

            updateKPIs();
            renderCharts(startDate, endDate); // Renderizar los gráficos con los datos filtrados y las fechas
        });
    }

    // Calcula y actualiza los KPIs en el DOM
    function updateKPIs() {
        const totalVentas = filteredVentas.reduce((sum, venta) => sum + (venta.total || 0), 0);
        const totalGastos = filteredGastos.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);
        const utilidadBruta = totalVentas - totalGastos;

        kpiVentasEl.textContent = `S/. ${totalVentas.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        kpiGastosEl.textContent = `S/. ${totalGastos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        kpiUtilidadEl.textContent = `S/. ${utilidadBruta.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // --- Funciones para renderizar gráficos ---

    async function renderCharts(startDate, endDate) {
        renderVentasGastosChart();
        renderGastosPersonaChart();
        await renderTopProductosCharts(startDate, endDate);
    }

    function renderVentasGastosChart() {
        const ctx = document.getElementById('ventasGastosChart').getContext('2d');

        // Destruir el gráfico anterior si existe para evitar solapamientos
        if (ventasGastosChartInstance) {
            ventasGastosChartInstance.destroy();
        }

        // Agrupar datos siempre por día
        const dataAgrupada = {};

        // Agrupar ventas
        filteredVentas.forEach(venta => {
            const key = formatDate(venta.fecha);
            if (!dataAgrupada[key]) {
                dataAgrupada[key] = { ventas: 0, gastos: 0 };
            }
            dataAgrupada[key].ventas += venta.total;
        });

        // Agrupar gastos
        filteredGastos.forEach(gasto => {
            const key = formatDate(gasto.fecha);
            if (!dataAgrupada[key]) {
                dataAgrupada[key] = { ventas: 0, gastos: 0 };
            }
            dataAgrupada[key].gastos += gasto.monto;
        });

        // Ordenar por fecha y preparar para el gráfico
        const labels = Object.keys(dataAgrupada).sort();
        const ventasData = labels.map(label => dataAgrupada[label].ventas);
        const gastosData = labels.map(label => dataAgrupada[label].gastos);
        
        // Formatear etiquetas del gráfico
        const chartLabels = labels.map(l => new Date(l + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }));

        ventasGastosChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Ventas',
                    data: ventasData,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    fill: true,
                    tension: 0.3
                }, {
                    label: 'Gastos',
                    data: gastosData,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += 'S/. ' + context.parsed.y.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderGastosPersonaChart() {
        const ctx = document.getElementById('gastosPersonaChart').getContext('2d');

        if (gastosPersonaChartInstance) {
            gastosPersonaChartInstance.destroy();
        }

        // Agrupar gastos por persona
        const gastosPorPersona = filteredGastos.reduce((acc, gasto) => {
            const persona = gasto.persona || 'No asignado';
            if (!acc[persona]) {
                acc[persona] = 0;
            }
            acc[persona] += gasto.monto;
            return acc;
        }, {});

        const labels = Object.keys(gastosPorPersona);
        const data = Object.values(gastosPorPersona);

        // Paleta de colores para el gráfico
        const chartColors = [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
        ];

        gastosPersonaChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Gastado',
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false,
                        text: 'Gastos por Responsable'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.raw !== null) {
                                    label += 'S/. ' + Number(context.raw).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    async function renderTopProductosCharts(startDate, endDate) {
        try {
            const response = await fetch(`/api/reportes/productos?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error al cargar datos de productos.');
            }

            // Renderizar gráfico por ingresos
            renderBarChart(
                'topProductosIngresosChart',
                topProductosIngresosChartInstance,
                data.topPorIngresos.map(p => p.nombre_producto).reverse(),
                data.topPorIngresos.map(p => p.total_ingresos).reverse(),
                'Ingresos',
                'rgba(255, 159, 64, 0.8)',
                'S/. '
            );
            topProductosIngresosChartInstance = window.chartInstances.topProductosIngresosChart;
            delete window.chartInstances.topProductosIngresosChart; // Limpiar la instancia global

            // Renderizar gráfico por cantidad
            renderBarChart(
                'topProductosCantidadChart',
                topProductosCantidadChartInstance,
                data.topPorCantidad.map(p => p.nombre_producto),
                data.topPorCantidad.map(p => p.total_cantidad),
                'Cantidad Vendida',
                'rgba(75, 192, 192, 0.8)',
                ''
            );
            topProductosCantidadChartInstance = window.chartInstances.topProductosCantidadChart;
            delete window.chartInstances.topProductosCantidadChart; // Limpiar la instancia global

        } catch (error) {
            console.error('Error al renderizar gráficos de productos:', error);
        }
    }

    // Función genérica para crear gráficos de barras horizontales
    function renderBarChart(canvasId, chartInstance, labels, data, label, color, prefix = '') {
        // Asegurarse de que el objeto global exista para evitar errores
        window.chartInstances = window.chartInstances || {};

        const ctx = document.getElementById(canvasId).getContext('2d');
        if (chartInstance) {
            chartInstance.destroy();
        }

        const newChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: color,
                    borderColor: color.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Hace que el gráfico sea horizontal
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const productLabel = context.label || '';
                                const value = Number(context.raw).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                                return `${productLabel}: ${prefix}${value}`;
                            }
                        }
                    }
                }
            }
        });

        // Asignar la nueva instancia al objeto global para que pueda ser recogida
        window.chartInstances[canvasId] = newChartInstance;
    }

    // --- Event Listeners ---

    // Eventos para los botones de período predefinidos
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            const period = this.dataset.period;
            // Siempre llamar a applyFilter, incluso si el botón ya está activo.
            applyFilter(period);

            // Gestionar la clase 'active' después de la llamada.
            periodButtons.forEach(btn => btn.classList.remove('active')); // Quitar 'active' de todos
            this.classList.add('active'); // Añadir 'active' al botón clickeado
        });
    });

    // Evento para el botón de filtro personalizado
    btnFiltrarPersonalizado.addEventListener('click', function() {
        periodButtons.forEach(btn => btn.classList.remove('active')); // Quitar 'active' de todos
        const startDate = fechaInicioEl.value;
        const endDate = fechaFinEl.value;
        if (startDate && endDate) {
            applyFilter('custom', startDate, endDate);
        } else {
            alert('Por favor, seleccione ambas fechas para el filtro personalizado.');
        }
    });

    // Cargar datos al iniciar la página
    // Ahora, la carga inicial también aplica el filtro del mes actual como callback
    cargarDatos(() => {
        applyFilter('month');
    });
});