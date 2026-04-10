<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ ."/../helpers/response.php";
$sql = "
SELECT
    p.id_produto,
    p.nome_produto,
    p.imagem_produto,
    f.nome_fabricante,
    c.nome_categoria,
    m.nome_mercado,
    mp.preco_produto_mercado
FROM produto p
LEFT JOIN fabricante f
    ON f.id_fabricante = 
p.fk_fabricante_id_fabricante
LEFT JOIN categoria c
    ON c.id_categoria =
p.fk_categoria_id_categoria
    INNER JOIN mercado_produto mp
        ON mp.fk_produto_id_produto =
p.id_produto
    INNER JOIN mercado m
        ON m.id_mercado =
mp.fk_mercado_id_mercado
    ORDER BY p.id_produto,
mp.preco_produto_mercado ASC
";
$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$produtos = [];

foreach ($rows as $row) {
    $id = $row["id_produto"];

if (!isset($produtos[$id])){
    $produtos[$id] = [
        "id_produto"=> (int) $row["id_produto"],
        "nome_produto"=> $row["nome_produto"],
        "imagem_produto"=> $row["imagem_produto"],
        "nome_fabricante"=> $row["nome_fabricante"],
        "nome_categoria"=> $row["nome_categoria"],
        "precos"=>[]
    ];
}
$produtos[$id]["precos"][] = [
    "mercado" => $row["nome_mercado"],
    "preco" => (float) $row["preco_produto_mercado"]
];
}
jsonResponse(true, "Produtos listados com sucesso.", array_values($produtos));
