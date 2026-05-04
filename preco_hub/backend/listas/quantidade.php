<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

$usuarioId = $_SESSION["usuario_id"];
$idListaProduto = $_POST["id_lista_produto"] ?? "";
$acao = $_POST["acao"] ?? "";

if (!$idListaProduto || strpos($idListaProduto, "-") === false) {
    jsonResponse(false, "Item invalido.", null, 400);
}

if (!in_array($acao, ["aumentar", "diminuir"], true)) {
    jsonResponse(false, "Acao invalida.", null, 400);
}

[$listaId, $produtoId] = explode("-", $idListaProduto);

$stmtItem = $pdo->prepare("
    SELECT lp.quantidade
    FROM lista_produto lp
    INNER JOIN lista l
        ON l.id_lista = lp.fk_lista_id_lista
    WHERE lp.fk_lista_id_lista = ?
      AND lp.fk_produto_id_produto = ?
      AND l.fk_usuario_id_usuario = ?
");
$stmtItem->execute([(int) $listaId, (int) $produtoId, $usuarioId]);
$quantidadeAtual = $stmtItem->fetchColumn();

if ($quantidadeAtual === false) {
    jsonResponse(false, "Item nao encontrado.", null, 404);
}

$quantidadeAtual = (int) $quantidadeAtual;
$novaQuantidade = $acao === "aumentar" ? $quantidadeAtual + 1 : $quantidadeAtual - 1;

if ($novaQuantidade <= 0) {
    $stmtDelete = $pdo->prepare("
        DELETE FROM lista_produto
        WHERE fk_lista_id_lista = ?
          AND fk_produto_id_produto = ?
    ");
    $stmtDelete->execute([(int) $listaId, (int) $produtoId]);

    jsonResponse(true, "Item removido da lista.", ["quantidade" => 0]);
}

$stmtUpdate = $pdo->prepare("
    UPDATE lista_produto
    SET quantidade = ?
    WHERE fk_lista_id_lista = ?
      AND fk_produto_id_produto = ?
");
$stmtUpdate->execute([$novaQuantidade, (int) $listaId, (int) $produtoId]);

jsonResponse(true, "Quantidade atualizada.", ["quantidade" => $novaQuantidade]);
