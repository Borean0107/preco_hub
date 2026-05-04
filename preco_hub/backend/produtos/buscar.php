<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

$termo = trim($_GET["termo"] ?? "");
$categoria = trim($_GET["categoria"] ?? "");
$precoMin = filter_var($_GET["preco_min"] ?? 0, FILTER_VALIDATE_FLOAT);
$precoMax = filter_var($_GET["preco_max"] ?? 999999, FILTER_VALIDATE_FLOAT);
$mercado = trim($_GET["mercado"] ?? "");

if (strlen($termo) < 2) {
    jsonResponse(true, "Nenhum resultado.", [], 200);
    exit;
}

$precoMin = $precoMin === false ? 0 : $precoMin;
$precoMax = $precoMax === false ? 999999 : $precoMax;

$sql = "
SELECT DISTINCT
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
LEFT JOIN fabricante f ON f.id_fabricante = p.fk_fabricante_id_fabricante
LEFT JOIN categoria c ON c.id_categoria = p.fk_categoria_id_categoria
INNER JOIN mercado_produto mp ON mp.fk_produto_id_produto = p.id_produto
INNER JOIN mercado m ON m.id_mercado = mp.fk_mercado_id_mercado
WHERE (
    p.nome_produto LIKE :termo
    OR p.descricao_produto LIKE :termo
    OR f.nome_fabricante LIKE :termo
    OR c.nome_categoria LIKE :termo
)
";

$params = [":termo" => "%{$termo}%"];

if (!empty($categoria)) {
    $sql .= " AND c.nome_categoria = :categoria";
    $params[":categoria"] = $categoria;
}

if (!empty($mercado)) {
    $sql .= " AND m.nome_mercado = :mercado";
    $params[":mercado"] = $mercado;
}

$sql .= " AND mp.preco_produto_mercado BETWEEN :preco_min AND :preco_max";
$params[":preco_min"] = $precoMin;
$params[":preco_max"] = $precoMax;

$sql .= " ORDER BY p.nome_produto ASC, mp.preco_produto_mercado ASC LIMIT 80";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $produtos = [];

    foreach ($rows as $row) {
        $id = $row["id_produto"];

        if (!isset($produtos[$id])) {
            $produtos[$id] = [
                "id_produto" => (int)$row["id_produto"],
                "nome_produto" => $row["nome_produto"],
                "descricao_produto" => $row["descricao_produto"],
                "imagem_produto" => $row["imagem_produto"],
                "nome_fabricante" => $row["nome_fabricante"],
                "nome_categoria" => $row["nome_categoria"],
                "precos" => []
            ];
        }

        $produtos[$id]["precos"][] = [
            "mercado" => $row["nome_mercado"],
            "preco" => (float)$row["preco_produto_mercado"],
            "disponibilidade" => (bool)$row["disponibilidade_produto"]
        ];
    }

    $produtosArray = array_values($produtos);

    jsonResponse(true, "Busca realizada com sucesso.", $produtosArray, 200);
} catch (Exception $e) {
    jsonResponse(false, "Erro na busca: " . $e->getMessage(), null, 500);
}
