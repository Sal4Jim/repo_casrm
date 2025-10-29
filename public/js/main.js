document.addEventListener('DOMContentLoaded', function() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        fetch('_header.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar el encabezado.');
                }
                return response.text();
            })
            .then(data => {
                headerPlaceholder.innerHTML = data;
                // Después de cargar el header, marcamos el enlace activo
                setActiveNavLink();
            })
            .catch(error => console.error('Error al cargar el encabezado:', error));
    }

    function setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    }
});