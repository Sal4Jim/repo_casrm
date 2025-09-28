// Abrir modal de detalles
$(document).on('click', '[data-action="info"]', function() {
    // Aquí podrías cargar datos reales desde una API o fila de la tabla
    $('#detailName').text('Juan Pérez');
    $('#detailRUC').text('10456789012');
    $('#detailCity').text('Lima');
    $('#detailPhone').text('+51 987 654 321');
    $('#detailEmail').text('juan@example.com');
    $('#detailLastContact').text('24/05/2025');
    $('#detailNotes').text('Cliente frecuente. Prefiere entregas por la tarde.');

    $('#customerDetailModal').modal('show');
});