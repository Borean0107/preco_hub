<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

$sql = "
    SELECT
        p.id_produto,
        p.nome_produto,
        p.descricao_produto,
        p.imagem_produto,
        f.nome_fabricante,
        c.nome_categoria,
        m.nome_mercado,
        mp.preco_produto_mercado,
        mp.disponibilidade_produto
    FROM produto p
    LEFT JOIN fabricante f
        ON f.id_fabricante = p.fk_fabricante_id_fabricante
    LEFT JOIN categoria c
        ON c.id_categoria = p.fk_categoria_id_categoria
    LEFT JOIN mercado_produto mp
        ON mp.fk_produto_id_produto = p.id_produto
    LEFT JOIN mercado m
        ON m.id_mercado = mp.fk_mercado_id_mercado
    ORDER BY p.nome_produto ASC, mp.preco_produto_mercado ASC
";

$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll();

$produtos = [];

foreach ($rows as $row) {
    $id = (int) $row["id_produto"];

    if (!isset($produtos[$id])) {
        $produtos[$id] = [
            "id_produto" => $id,
            "nome_produto" => $row["nome_produto"],
            "descricao_produto" => $row["descricao_produto"],
            "imagem_produto" => $row["imagem_produto"],
            "nome_fabricante" => $row["nome_fabricante"],
            "nome_categoria" => $row["nome_categoria"],
            "precos" => []
        ];
    }

    if ($row["nome_mercado"] !== null) {
        $produtos[$id]["precos"][] = [
            "mercado" => $row["nome_mercado"],
            "preco" => (float) $row["preco_produto_mercado"],
            "disponibilidade" => (bool) $row["disponibilidade_produto"]
        ];
    }
}

jsonResponse(true, "Produtos listados com sucesso.", array_values($produtos));
