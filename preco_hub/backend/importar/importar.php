<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if (!isset($_FILES["arquivo"])) {
    jsonResponse(false, "Nenhum arquivo enviado.");
}

$arquivo = $_FILES["arquivo"]["tmp_name"];

if (($handle = fopen($arquivo, "r")) === false) {
    jsonResponse(false, "Erro ao abrir o arquivo.");
}

$header = fgetcsv($handle);

$mercados = array_slice($header, 3);

while (($data = fgetcsv($handle)) !== false) {

    $nome = $data[0];
    $marca = $data[1];
    $categoria = $data[2];

    // INSERE PRODUTO
    $stmt = $conn->prepare("INSERT INTO produto (nome_produto, descricao_produto, imagem_produto) VALUES (?, ?, '')");
    $descricao = $marca . " - " . $categoria;
    $stmt->bind_param("ss", $nome, $descricao);
    $stmt->execute();

    $produtoId = $conn->insert_id;

    // INSERE PREÇOS
    for ($i = 0; $i < count($mercados); $i++) {

        $preco = $data[$i + 3];

        if ($preco == "" || $preco == 0) continue;

        $mercado = $mercados[$i];

        $stmtPreco = $conn->prepare("INSERT INTO preco (fk_produto_id_produto, mercado, preco) VALUES (?, ?, ?)");
        $stmtPreco->bind_param("isd", $produtoId, $mercado, $preco);
        $stmtPreco->execute();
    }
}

fclose($handle);

jsonResponse(true, "Importação concluída com sucesso.");