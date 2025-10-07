<?php
// Incluye el archivo de conexión
include 'conexion.php';

try {
    // Consulta para obtener todos los clientes
    $stmt = $conexion->prepare("SELECT * FROM clientes LIMIT 5");
    $stmt->execute();
    $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h2>✅ Clientes en la base de datos:</h2>";
    echo "<pre>";
    print_r($clientes);
    echo "</pre>";

} catch (PDOException $e) {
    echo "❌ Error al consultar la tabla 'clientes': " . $e->getMessage();
}
?>