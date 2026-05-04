<?php

require_once __DIR__ . "/../config/session.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if (!isset($_SESSION["usuario_id"])) {
    jsonResponse(false, "Usuario nao autenticado.", null, 401);
}

$usuarioId = (int) $_SESSION["usuario_id"];

$stmt = $pdo->prepare("
    SELECT nome_usuario, email_usuario, data_criacao_usuario
    FROM usuario
    WHERE id_usuario = ?
");
$stmt->execute([$usuarioId]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$usuario) {
    jsonResponse(false, "Usuario nao encontrado.", null, 404);
}

$stmtTotal = $pdo->prepare("
    SELECT COALESCE(SUM(lp.quantidade), 0)
    FROM lista l
    LEFT JOIN lista_produto lp
        ON lp.fk_lista_id_lista = l.id_lista
    WHERE l.fk_usuario_id_usuario = ?
");
$stmtTotal->execute([$usuarioId]);
$totalItensLista = (int) $stmtTotal->fetchColumn();

jsonResponse(true, "Usuario autenticado.", [
    "id" => $usuarioId,
    "nome" => $usuario["nome_usuario"],
    "email" => $usuario["email_usuario"],
    "data_criacao" => $usuario["data_criacao_usuario"],
    "total_itens_lista" => $totalItensLista
]);
