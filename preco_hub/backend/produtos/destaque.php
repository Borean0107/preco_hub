<?php
require_once __DIR__ . "/../middleware/admin.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/produto_schema.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

$idProduto = isset($_POST["id_produto"]) ? filter_var($_POST["id_produto"], FILTER_VALIDATE_INT) : false;
$destaque = isset($_POST["destaque"]) ? filter_var($_POST["destaque"], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

if (!$idProduto || $idProduto <= 0) {
    jsonResponse(false, "ID de produto invalido.", null, 400);
}

if ($destaque === null) {
    jsonResponse(false, "Informe se o produto deve ficar em destaque.", null, 400);
}

try {
    garantirColunaDestaqueProduto($pdo);

    $stmtProduto = $pdo->prepare("SELECT id_produto FROM produto WHERE id_produto = ? LIMIT 1");
    $stmtProduto->execute([$idProduto]);

    if (!$stmtProduto->fetchColumn()) {
        jsonResponse(false, "Produto nao encontrado.", null, 404);
    }

    $stmt = $pdo->prepare("UPDATE produto SET destaque_produto = ? WHERE id_produto = ?");
    $stmt->execute([$destaque ? 1 : 0, $idProduto]);

    jsonResponse(true, $destaque ? "Produto marcado como destaque." : "Produto removido dos destaques.", [
        "id_produto" => (int) $idProduto,
        "destaque_produto" => (bool) $destaque
    ]);
} catch (Exception $e) {
    jsonResponse(false, "Erro ao atualizar destaque: " . $e->getMessage(), null, 500);
}
