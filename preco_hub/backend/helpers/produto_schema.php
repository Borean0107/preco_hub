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
