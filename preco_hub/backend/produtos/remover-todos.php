<?php
require_once __DIR__ . "/../middleware/admin.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

function removerImagemProdutoLocal($caminhoRelativo)
{
    $caminhoRelativo = str_replace("\\", "/", (string) $caminhoRelativo);

    if (strpos($caminhoRelativo, "assets/img/produtos/") !== 0) {
        return;
    }

    $diretorioProdutos = realpath(__DIR__ . "/../../assets/img/produtos");
    $caminhoCompleto = realpath(__DIR__ . "/../../" . $caminhoRelativo);

    if (!$diretorioProdutos || !$caminhoCompleto) {
        return;
    }

    if (strpos($caminhoCompleto, $diretorioProdutos . DIRECTORY_SEPARATOR) !== 0) {
        return;
    }

    if (is_file($caminhoCompleto)) {
        @unlink($caminhoCompleto);
    }
}

try {
    $stmtImagens = $pdo->query("SELECT DISTINCT imagem_produto FROM produto WHERE imagem_produto IS NOT NULL AND imagem_produto <> ''");
    $imagens = $stmtImagens->fetchAll(PDO::FETCH_COLUMN);

    $stmtTotal = $pdo->query("SELECT COUNT(*) FROM produto");
    $totalProdutos = (int) $stmtTotal->fetchColumn();

    if ($totalProdutos === 0) {
        jsonResponse(true, "Nenhum produto para remover.", ["produtos_removidos" => 0]);
    }

    $pdo->beginTransaction();

    $pdo->exec("DELETE FROM lista_produto");
    $pdo->exec("DELETE FROM mercado_produto");
    $pdo->exec("DELETE FROM produto");
    $pdo->exec("DELETE FROM fabricante");

    $pdo->commit();

    foreach ($imagens as $imagem) {
        removerImagemProdutoLocal($imagem);
    }

    jsonResponse(true, "Todos os produtos foram removidos com sucesso.", [
        "produtos_removidos" => $totalProdutos
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    jsonResponse(false, "Erro ao remover produtos: " . $e->getMessage(), null, 500);
}
