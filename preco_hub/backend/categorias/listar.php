<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

try {
    $stmt = $pdo->query("
        SELECT id_categoria, nome_categoria
        FROM categoria
        ORDER BY nome_categoria ASC
    ");

    $categorias = array_map(function ($categoria) {
        return [
            "id_categoria" => (int) $categoria["id_categoria"],
            "nome_categoria" => $categoria["nome_categoria"]
        ];
    }, $stmt->fetchAll());

    jsonResponse(true, "Categorias listadas com sucesso.", $categorias);
} catch (Exception $e) {
    jsonResponse(false, "Erro ao listar categorias: " . $e->getMessage(), null, 500);
}
