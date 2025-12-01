document.addEventListener('DOMContentLoaded', function () {
    // console.log('Script de reportes cargado.');

    // --- Variables para almacenar los datos filtrados (ahora son los únicos datos) ---
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

    // Determina la granularidad (dia o mes) basada en el rango de fechas
    function determinarGranularidad(fechaInicio, fechaFin) {
        // Convertir a objetos Date si son strings
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);

        const diffTime = Math.abs(fin - inicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 35 ? 'mes' : 'dia';
    }

    // Agrupa los datos según la granularidad especificada
    function agruparDatosPorGranularidad(datos, granularidad) {
        const agrupado = {};

        datos.forEach(d => {
            let key;
            // Asegurarse de que d.fecha sea un objeto Date
            const fecha = new Date(d.fecha);

            if (granularidad === 'mes') {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                key = `${year}-${month}`;
            } else {
                // dia
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                const day = String(fecha.getDate()).padStart(2, '0');
                key = `${year}-${month}-${day}`;
            }

            if (!agrupado[key]) {
                agrupado[key] = { ventas: 0, gastos: 0 };
            }
            agrupado[key].ventas += (d.ventas || 0);
            agrupado[key].gastos += (d.gastos || 0);
        });

        return agrupado;
    }

    // --- Funciones principales ---

    // Aplica el filtro de fecha, descarga los datos y actualiza la UI
    async function applyFilter(period, customStart = null, customEnd = null) {
        let startDate, endDate;

        if (period === 'custom' && customStart && customEnd) {
            const [startYear, startMonth, startDay] = customStart.split('-').map(Number);
            startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0); // Inicio del día en hora local

            const [endYear, endMonth, endDay] = customEnd.split('-').map(Number);
            endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

        } else {
            const dates = getPeriodDates(period);
            startDate = dates.startDate;
            endDate = dates.endDate;
        }

        fechaInicioEl.value = formatDate(startDate);
        fechaFinEl.value = formatDate(endDate);

        // Descargar datos filtrados del servidor
        try {
            const startStr = formatDate(startDate);
            const endStr = formatDate(endDate);

            const [ventasRes, gastosRes] = await Promise.all([
                fetch(`/api/ventas?startDate=${startStr}&endDate=${endStr}`),
                fetch(`/api/gastos?startDate=${startStr}&endDate=${endStr}`)
            ]);

            const ventasData = await ventasRes.json();
            const gastosData = await gastosRes.json();

            if (ventasData.success) {
                filteredVentas = ventasData.ventas.map(v => ({ ...v, fecha: new Date(v.fecha), total: parseFloat(v.total) }));
            } else {
                console.error('Error al cargar ventas:', ventasData.error);
                filteredVentas = [];
            }

            if (gastosData.success) {
                filteredGastos = gastosData.gastos.map(g => ({ ...g, fecha: new Date(g.fecha), monto: parseFloat(g.monto) }));
            } else {
                console.error('Error al cargar gastos:', gastosData.error);
                filteredGastos = [];
            }

            updateKPIs();
            renderCharts(startDate, endDate);

        } catch (error) {
            console.error('Error al cargar datos filtrados:', error);
        }
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
        renderVentasGastosChart(startDate, endDate);
        renderGastosPersonaChart();
        await renderTopProductosCharts(startDate, endDate);
    }

    function renderVentasGastosChart(startDate, endDate) { // Recibe fechas para determinar granularidad
        const ctx = document.getElementById('ventasGastosChart').getContext('2d');

        // Destruir el gráfico anterior si existe para evitar solapamientos
        if (ventasGastosChartInstance) {
            ventasGastosChartInstance.destroy();
        }

        // 1. Determinar granularidad
        const granularidad = determinarGranularidad(startDate, endDate);

        // 2. Preparar datos unificados para la función de agrupación
        let combinedData = [];
        filteredVentas.forEach(v => {
            combinedData.push({ fecha: v.fecha, ventas: v.total, gastos: 0 });
        });
        filteredGastos.forEach(g => {
            combinedData.push({ fecha: g.fecha, ventas: 0, gastos: g.monto });
        });

        // 3. Agrupar datos
        const dataAgrupada = agruparDatosPorGranularidad(combinedData, granularidad);

        // Ordenar por fecha y preparar para el gráfico
        const labels = Object.keys(dataAgrupada).sort();
        const ventasData = labels.map(label => dataAgrupada[label].ventas);
        const gastosData = labels.map(label => dataAgrupada[label].gastos);

        // Formatear etiquetas del gráfico según granularidad
        const chartLabels = labels.map(l => {
            if (granularidad === 'mes') {
                // l es 'YYYY-MM'
                const [year, month] = l.split('-');
                const date = new Date(year, month - 1);
                return date.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
            } else {
                // l es 'YYYY-MM-DD'
                return new Date(l + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
            }
        });

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
                            label: function (context) {
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
                            label: function (context) {
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
        button.addEventListener('click', function () {
            const period = this.dataset.period;
            // Siempre llamar a applyFilter, incluso si el botón ya está activo.
            applyFilter(period);

            // Gestionar la clase 'active' después de la llamada.
            periodButtons.forEach(btn => btn.classList.remove('active')); // Quitar 'active' de todos
            this.classList.add('active'); // Añadir 'active' al botón clickeado
        });
    });

    // Evento para el botón de filtro personalizado
    btnFiltrarPersonalizado.addEventListener('click', function () {
        periodButtons.forEach(btn => btn.classList.remove('active')); // Quitar 'active' de todos
        const startDate = fechaInicioEl.value;
        const endDate = fechaFinEl.value;
        if (startDate && endDate) {
            applyFilter('custom', startDate, endDate);
        } else {
            alert('Por favor, seleccione ambas fechas para el filtro personalizado.');
        }
    });

    // Carga inicial: Aplicar filtro del mes actual
    applyFilter('month');
});