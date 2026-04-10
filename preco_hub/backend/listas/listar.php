<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

$usuarioId = $_SESSION["usuario_id"];

$stmtLista = $pdo->prepare("
    SELECT id_lista
    FROM lista
    WHERE fk_usuario_id_usuario = ?
    ORDER BY id_lista DESC
    LIMIT 1
");
$stmtLista->execute([$usuarioId]);
$lista = $stmtLista->fetch(PDO::FETCH_ASSOC);

if (!$lista) {
    jsonResponse(true, "Lista vazia.", []);
}

$listaId = (int) $lista["id_lista"];

$sql = "
    SELECT
        CONCAT(lp.fk_lista_id_lista, '-', lp.fk_produto_id_produto) AS id_lista_produto,
        p.id_produto,
        p.nome_produto,
        lp.quantidade,
        lp.comprado,
        m.nome_mercado,
        mp.preco_produto_mercado
    FROM lista_produto lp
    INNER JOIN produto p
        ON p.id_produto = lp.fk_produto_id_produto
    INNER JOIN mercado_produto mp
        ON mp.fk_produto_id_produto = p.id_produto
    INNER JOIN mercado m
        ON m.id_mercado = mp.fk_mercado_id_mercado
    WHERE lp.fk_lista_id_lista = ?
      AND mp.preco_produto_mercado = (
          SELECT MIN(mp2.preco_produto_mercado)
          FROM mercado_produto mp2
          WHERE mp2.fk_produto_id_produto = p.id_produto
      )
    ORDER BY p.nome_produto
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$listaId]);

$itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

$data = array_map(function ($item) {
    return [
        "id_lista_produto" => $item["id_lista_produto"],
        "id_produto" => (int) $item["id_produto"],
        "nome" => $item["nome_produto"],
        "quantidade" => (int) $item["quantidade"],
        "comprado" => (bool) $item["comprado"],
        "mercado" => $item["nome_mercado"],
        "preco" => (float) $item["preco_produto_mercado"]
    ];
}, $itens);

jsonResponse(true, "Lista carregada com sucesso.", $data);