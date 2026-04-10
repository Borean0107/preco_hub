<?php

$host = "localhost";
$dbname = "preco_hub";
$user = "root";
$pass = "";

try{
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Erro na conexão com o banco."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}