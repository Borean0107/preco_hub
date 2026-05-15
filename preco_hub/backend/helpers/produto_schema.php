<?php

if (!function_exists("garantirColunaDestaqueProduto")) {
    function garantirColunaDestaqueProduto(PDO $pdo): void
    {
        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'produto'
              AND COLUMN_NAME = 'destaque_produto'
        ");
        $stmt->execute();

        if ((int) $stmt->fetchColumn() === 0) {
            $pdo->exec("
                ALTER TABLE produto
                ADD COLUMN destaque_produto TINYINT(1) NOT NULL DEFAULT 0
                AFTER codigo_barras_produto
            ");
        }
    }
}

if (!function_exists("garantirColunaImagemProdutoLonga")) {
    function garantirColunaImagemProdutoLonga(PDO $pdo): void
    {
        $stmt = $pdo->prepare("
            SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'produto'
              AND COLUMN_NAME = 'imagem_produto'
            LIMIT 1
        ");
        $stmt->execute();
        $coluna = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$coluna) {
            return;
        }

        $tipo = strtolower((string) ($coluna["DATA_TYPE"] ?? ""));
        $tamanho = isset($coluna["CHARACTER_MAXIMUM_LENGTH"]) ? (int) $coluna["CHARACTER_MAXIMUM_LENGTH"] : 0;

        if ($tipo !== "text" && $tamanho < 1024) {
            $pdo->exec("ALTER TABLE produto MODIFY imagem_produto TEXT NOT NULL");
        }
    }
}
