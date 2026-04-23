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

if (count($header) < 4) {
    jsonResponse(false, "Formato inválido da planilha.");
}

$mercados = array_slice($header, 3);

$inseridos = 0;
$atualizados = 0;
$erros = 0;

while (($data = fgetcsv($handle)) !== false) {

    try {
        $nome = trim($data[0]);
        $marca = trim($data[1]);
        $categoria = trim($data[2]);

        if (!$nome || !$marca) {
            $erros++;
            continue;
        }

        // 🔍 Verifica se produto existe
        $stmtCheck = $conn->prepare("
            SELECT id_produto FROM produto 
            WHERE nome_produto = ? AND marca = ?
            LIMIT 1
        ");
        $stmtCheck->bind_param("ss", $nome, $marca);
        $stmtCheck->execute();
        $result = $stmtCheck->get_result();
        $produto = $result->fetch_assoc();

        if ($produto) {
            $produtoId = $produto["id_produto"];
            $atualizados++;
        } else {
            // ➕ Inserir produto novo
            $stmtInsert = $conn->prepare("
                INSERT INTO produto (nome_produto, marca, categoria, imagem_produto)
                VALUES (?, ?, ?, '')
            ");
            $stmtInsert->bind_param("sss", $nome, $marca, $categoria);
            $stmtInsert->execute();

            $produtoId = $conn->insert_id;
            $inseridos++;
        }

        // 💰 Inserir/Atualizar preços
        for ($i = 0; $i < count($mercados); $i++) {

            $mercado = $mercados[$i];
            $preco = floatval($data[$i + 3]);

            if ($preco <= 0) continue;

            // Verifica se já existe preço
            $stmtPreco = $conn->prepare("
                SELECT id_preco FROM preco
                WHERE fk_produto_id_produto = ? AND mercado = ?
            ");
            $stmtPreco->bind_param("is", $produtoId, $mercado);
            $stmtPreco->execute();
            $resPreco = $stmtPreco->get_result();

            if ($resPreco->fetch_assoc()) {
                // 🔄 Atualiza
                $stmtUpdate = $conn->prepare("
                    UPDATE preco SET preco = ?
                    WHERE fk_produto_id_produto = ? AND mercado = ?
                ");
                $stmtUpdate->bind_param("dis", $preco, $produtoId, $mercado);
                $stmtUpdate->execute();
            } else {
                // ➕ Insere
                $stmtInsertPreco = $conn->prepare("
                    INSERT INTO preco (fk_produto_id_produto, mercado, preco)
                    VALUES (?, ?, ?)
                ");
                $stmtInsertPreco->bind_param("isd", $produtoId, $mercado, $preco);
                $stmtInsertPreco->execute();
            }
        }

    } catch (Exception $e) {
        $erros++;
    }
}

fclose($handle);

jsonResponse(true, "Importação concluída.", [
    "produtos_inseridos" => $inseridos,
    "produtos_atualizados" => $atualizados,
    "linhas_com_erro" => $erros
]);