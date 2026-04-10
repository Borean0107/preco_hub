<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

$idListaProduto = $_POST["id_lista_produto"] ?? "";

if (!$idListaProduto || strpos($idListaProduto, "-") === false) {
    jsonResponse(false, "Item inválido.", null, 400);
}

[$listaId, $produtoId] = explode("-", $idListaProduto);

$stmt = $pdo->prepare("
    DELETE FROM lista_produto
    WHERE fk_lista_id_lista = ? AND fk_produto_id_produto = ?
");
$stmt->execute([(int) $listaId, (int) $produtoId]);

jsonResponse(true, "Item removido com sucesso.");