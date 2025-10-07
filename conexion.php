<?php

$host = 'localhost';     
$usuario = 'root';       
$contrasena = '';        
$base_datos = 'casrm_db.'; 

try {
    $conexion = new PDO("mysql:host=$host;dbname=$base_datos;charset=utf8mb4", $usuario, $contrasena);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Conexión exitosa a la base de datos '$base_datos'";
} catch (PDOException $e) {
    die("❌ Error de conexión: " . $e->getMessage());
}
?>