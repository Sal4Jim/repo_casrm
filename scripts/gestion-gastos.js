document.addEventListener('DOMContentLoaded', function() {
      // Set current date by default
        const today = new Date();
        const formattedDate = today.toISOString().substr(0, 10);
        document.getElementById('fecha').value = formattedDate;
        
        // Toggle form visibility
        const toggleFormBtn = document.getElementById('toggle-form-btn');
        const formContainer = document.getElementById('gasto-form-container');

        toggleFormBtn.addEventListener('click', function() {
            if (formContainer.classList.contains('hidden')) {
            formContainer.classList.remove('hidden');
            toggleFormBtn.innerHTML = '<i class="fas fa-times mr-2"></i> Cerrar Formulario';
            } else {
            formContainer.classList.add('hidden');
            toggleFormBtn.innerHTML = '<i class="fas fa-ice-cream mr-2"></i> Agregar Gasto';
            }
        });
        
        // Form clear button
        document.getElementById('btn-limpiar').addEventListener('click', function() {
            document.getElementById('gasto-form').reset();
            document.getElementById('fecha').value = formattedDate;
            
            // Hide form after clearing and reset button text
            formContainer.classList.add('hidden');
            toggleFormBtn.innerHTML = '<i class="fas fa-ice-cream mr-2"></i> Agregar Gasto';
        });
        
        // Form submit handler
        document.getElementById('gasto-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Form validation
            const descripcion = document.getElementById('descripcion').value;
            const monto = document.getElementById('monto').value;
            const fecha = document.getElementById('fecha').value;
            const persona = document.getElementById('persona').value;
            const categoria = document.getElementById('categoria').value;
            
            if (!descripcion || !monto || !fecha || !persona || !categoria) {
            alert('Por favor complete todos los campos obligatorios');
            return;
            }
            
            // In a real implementation, we would send the data to the server
            // For this prototype, we'll just show a success toast
            showSuccessToast();
            document.getElementById('gasto-form').reset();
            document.getElementById('fecha').value = formattedDate;
            
            // Hide form after submission and reset button text
            formContainer.classList.add('hidden');
            toggleFormBtn.innerHTML = '<i class="fas fa-ice-cream mr-2"></i> Agregar Gasto';
        });
        
        // Delete confirmation modal handling
        const deleteButtons = document.querySelectorAll('.fa-trash-alt');
        const deleteModal = document.getElementById('delete-modal');
        const closeModalButtons = document.querySelectorAll('.delete-close-btn');
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
            deleteModal.classList.remove('hidden');
            });
        });
        
        closeModalButtons.forEach(button => {
            button.addEventListener('click', function() {
            deleteModal.classList.add('hidden');
            });
        });
        
        // Success toast handling
        function showSuccessToast() {
            const toast = document.getElementById('success-toast');
            toast.classList.remove('hidden');
            
            setTimeout(function() {
            toast.classList.add('hidden');
            }, 3000);
        }
        
        // Edit functionality
        const editButtons = document.querySelectorAll('.fa-edit');
        
        editButtons.forEach(button => {
        button.addEventListener('click', function() {
          // In a real implementation, we would fetch the data from the server
          // For this prototype, we'll just fill the form with sample data
            const row = button.closest('tr');
            const columns = row.querySelectorAll('td');
            
            document.getElementById('descripcion').value = columns[0].textContent.trim();
            document.getElementById('monto').value = columns[1].textContent.trim().replace('S/. ', '').replace(',', '');
            
          // Convert date format
            const dateParts = columns[2].textContent.trim().split('/');
            const formattedEditDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            document.getElementById('fecha').value = formattedEditDate;
            
            document.getElementById('persona').value = columns[3].textContent.trim();
            
          // Extract category
            const categoryText = columns[4].querySelector('span').textContent.trim();
            const categorySelect = document.getElementById('categoria');
            
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].text === categoryText) {
                categorySelect.selectedIndex = i;
                break;
                }
            }
            
            // Scroll to form
            document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
            });
        });
        });