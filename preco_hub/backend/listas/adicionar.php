<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/lista.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

$usuarioId = (int) $_SESSION["usuario_id"];
$produtoId = (int) ($_POST["produto_id"] ?? $_POST["id_produto"] ?? 0);

if ($produtoId <= 0) {
    jsonResponse(false, "Produto invalido.", null, 400);
}

$stmtProduto = $pdo->prepare("SELECT id_produto FROM produto WHERE id_produto = ? LIMIT 1");
$stmtProduto->execute([$produtoId]);

if (!$stmtProduto->fetch()) {
    jsonResponse(false, "Produto nao encontrado.", null, 404);
}

$listaId = obterListaUsuario($pdo, $usuarioId, true);

$stmtSalvar = $pdo->prepare("
    INSERT INTO lista_produto (fk_lista_id_lista, fk_produto_id_produto, quantidade, comprado, data_adicao)
    VALUES (?, ?, 1, 0, NOW())
    ON DUPLICATE KEY UPDATE
        quantidade = quantidade + 1,
        comprado = 0
");
$stmtSalvar->execute([$listaId, $produtoId]);

jsonResponse(true, "Produto adicionado a lista.", [
    "id_lista_produto" => $listaId . "-" . $produtoId,
    "id_produto" => $produtoId
]);
