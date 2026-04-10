<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

$usuarioId = $_SESSION["usuario_id"];

$stmt = $pdo->prepare("
    SELECT id_lista
    FROM lista
    WHERE fk_usuario_id_usuario = ?
    ORDER BY id_lista DESC
    LIMIT 1
");
$stmt->execute([$usuarioId]);
$lista = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$lista) {
    jsonResponse(true, "Lista já está vazia.");
}

$listaId = (int) $lista["id_lista"];

$stmtDelete = $pdo->prepare("
    DELETE FROM lista_produto
    WHERE fk_lista_id_lista = ?
");
$stmtDelete->execute([$listaId]);

jsonResponse(true, "Lista limpa com sucesso.");