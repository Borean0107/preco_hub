<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

$usuarioId = $_SESSION["usuario_id"];
$produtoId = (int) ($_POST["produto_id"] ?? 0);

if ($produtoId <= 0) {
    jsonResponse(false, "Produto inválido.", null, 400);
}

$stmt = $pdo->prepare("SELECT l.id_lista FROM lista l WHERE l.fk_usuario_id_usuario = ? ORDER BY l.id_lista DESC LIMIT 1");
$stmt->execute([$usuarioId]);
$lista = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$lista) {
    $stmtCriar = $pdo->prepare("INSERT INTO lista (nome_lista, data_criacao_lista, fk_usuario_id_usuario) VALUES ('Minha lista', NOW(), ?)");
    $stmtCriar->execute([$usuarioId]);
    $listaId = (int) $pdo->lastInsertId();
} else {
    $listaId = (int) $lista["id_lista"];
}

$stmtExiste = $pdo->prepare("SELECT * FROM lista_produto WHERE fk_lista_id_lista = ? AND fk_produto_id_produto = ?");
$stmtExiste->execute([$listaId,$produtoId]);
$itemExiste = 
$stmtExiste->fetch(PDO::FETCH_ASSOC);

if ($itemExiste){
    $stmtUpdate = $pdo->prepare("UPDATE lista_produto SET quantidade = quantidade+1 WHERE fk_lista_id_lista = ? AND fk_produto_id_produto = ?");
    $stmtUpdate->execute([$listaId,$produtoId]);
} else{
    $stmtInsert = $pdo->prepare("INSERT INTO lista_produto(fk_lista_id_lista, fk_produto_id_produto, quantidade, comprado, data_adicao) VALUES (?, ?, 1, 0, NOW())");
    $stmtInsert->execute([$listaId,$produtoId]);
}
jsonResponse(true,"Produto adicionado a lista.");