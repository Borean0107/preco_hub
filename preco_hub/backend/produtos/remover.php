<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Método não permitido.", null, 405);
}

$idProduto = isset($_POST["id_produto"]) ? filter_var($_POST["id_produto"], FILTER_VALIDATE_INT) : false;

if ($idProduto === false || $idProduto <= 0) {
    jsonResponse(false, "ID de produto inválido.", null, 400);
}

try {
    $pdo->beginTransaction();

    $stmtProduto = $pdo->prepare("SELECT imagem_produto, fk_fabricante_id_fabricante FROM produto WHERE id_produto = ?");
    $stmtProduto->execute([$idProduto]);
    $produto = $stmtProduto->fetch(PDO::FETCH_ASSOC);

    if (!$produto) {
        $pdo->rollBack();
        jsonResponse(false, "Produto não encontrado.", null, 404);
    }

    $imagemProduto = $produto["imagem_produto"];
    $idFabricante = (int) $produto["fk_fabricante_id_fabricante"];

    $stmtExcluirPreco = $pdo->prepare("DELETE FROM mercado_produto WHERE fk_produto_id_produto = ?");
    $stmtExcluirPreco->execute([$idProduto]);

    $stmtExcluirProduto = $pdo->prepare("DELETE FROM produto WHERE id_produto = ?");
    $stmtExcluirProduto->execute([$idProduto]);

    $stmtVerificarFabricante = $pdo->prepare("SELECT COUNT(*) FROM produto WHERE fk_fabricante_id_fabricante = ?");
    $stmtVerificarFabricante->execute([$idFabricante]);
    $fabricanteEmUso = (int) $stmtVerificarFabricante->fetchColumn();

    if ($fabricanteEmUso === 0) {
        $stmtExcluirFabricante = $pdo->prepare("DELETE FROM fabricante WHERE id_fabricante = ?");
        $stmtExcluirFabricante->execute([$idFabricante]);
    }

    $pdo->commit();

    if ($imagemProduto) {
        $caminhoImagem = __DIR__ . "/../../" . $imagemProduto;
        if (file_exists($caminhoImagem)) {
            @unlink($caminhoImagem);
        }
    }

    jsonResponse(true, "Produto removido com sucesso.");
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, "Erro ao remover produto: " . $e->getMessage(), null, 500);
}
