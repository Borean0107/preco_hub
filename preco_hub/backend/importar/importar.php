<?php

require_once __DIR__ . "/../middleware/admin.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

if (!isset($_FILES["arquivo"]) || $_FILES["arquivo"]["error"] !== UPLOAD_ERR_OK) {
    jsonResponse(false, "Nenhum arquivo CSV foi enviado.", null, 400);
}

$nomeArquivo = $_FILES["arquivo"]["name"] ?? "";
$extensao = strtolower(pathinfo($nomeArquivo, PATHINFO_EXTENSION));

if ($extensao !== "csv") {
    jsonResponse(false, "Envie um arquivo no formato CSV.", null, 400);
}

$arquivo = $_FILES["arquivo"]["tmp_name"];
$handle = fopen($arquivo, "r");

if ($handle === false) {
    jsonResponse(false, "Erro ao abrir o arquivo.", null, 400);
}

function detectarDelimitador($linha)
{
    $opcoes = [
        ";" => substr_count($linha, ";"),
        "," => substr_count($linha, ","),
        "\t" => substr_count($linha, "\t")
    ];

    arsort($opcoes);
    return (string) array_key_first($opcoes);
}

function normalizarPrecoImportado($valor)
{
    $valor = trim((string) $valor);

    if ($valor === "") {
        return null;
    }

    $valor = preg_replace('/[^\d,.-]/', '', $valor);

    if ($valor === "") {
        return null;
    }

    if (strpos($valor, ",") !== false && strpos($valor, ".") !== false) {
        $valor = str_replace(".", "", $valor);
        $valor = str_replace(",", ".", $valor);
    } elseif (strpos($valor, ",") !== false) {
        $valor = str_replace(",", ".", $valor);
    }

    $preco = filter_var($valor, FILTER_VALIDATE_FLOAT);

    if ($preco === false || $preco <= 0) {
        return null;
    }

    return $preco;
}

function obterIdPorNome($pdo, $tabela, $colunaId, $colunaNome, $nome)
{
    $stmt = $pdo->prepare("SELECT {$colunaId} FROM {$tabela} WHERE LOWER({$colunaNome}) = LOWER(?)");
    $stmt->execute([$nome]);
    $id = $stmt->fetchColumn();

    if ($id) {
        return (int) $id;
    }

    $stmt = $pdo->prepare("INSERT INTO {$tabela} ({$colunaNome}) VALUES (?)");
    $stmt->execute([$nome]);

    return (int) $pdo->lastInsertId();
}

$primeiraLinha = fgets($handle);

if ($primeiraLinha === false) {
    fclose($handle);
    jsonResponse(false, "O arquivo CSV esta vazio.", null, 400);
}

$delimitador = detectarDelimitador($primeiraLinha);
rewind($handle);

$header = fgetcsv($handle, 0, $delimitador);

if (!$header || count($header) < 4) {
    fclose($handle);
    jsonResponse(false, "Formato invalido. Use: produto, marca, categoria e mercados.", null, 400);
}

$header = array_map("trim", $header);

$inseridos = 0;
$atualizados = 0;
$erros = 0;

try {
    $pdo->beginTransaction();

    $stmtProduto = $pdo->prepare("SELECT id_produto FROM produto WHERE LOWER(nome_produto) = LOWER(?) LIMIT 1");
    $stmtInserirProduto = $pdo->prepare("
        INSERT INTO produto (
            nome_produto,
            descricao_produto,
            imagem_produto,
            codigo_barras_produto,
            fk_categoria_id_categoria,
            fk_fabricante_id_fabricante
        ) VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmtAtualizarProduto = $pdo->prepare("
        UPDATE produto
        SET fk_categoria_id_categoria = ?,
            fk_fabricante_id_fabricante = ?
        WHERE id_produto = ?
    ");
    $stmtPreco = $pdo->prepare("
        INSERT INTO mercado_produto (
            fk_mercado_id_mercado,
            fk_produto_id_produto,
            preco_produto_mercado,
            data_atualizacao_preco
        ) VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            preco_produto_mercado = VALUES(preco_produto_mercado),
            data_atualizacao_preco = NOW()
    ");

    while (($linha = fgetcsv($handle, 0, $delimitador)) !== false) {
        $nome = trim((string) ($linha[0] ?? ""));
        $marca = trim((string) ($linha[1] ?? ""));
        $categoria = trim((string) ($linha[2] ?? ""));

        if (!$nome || !$marca || !$categoria) {
            $erros++;
            continue;
        }

        $precosValidos = [];

        for ($i = 3; $i < count($header); $i++) {
            $mercado = trim((string) ($header[$i] ?? ""));
            $preco = normalizarPrecoImportado($linha[$i] ?? "");

            if (!$mercado || $preco === null) {
                continue;
            }

            $precosValidos[] = [
                "mercado" => $mercado,
                "preco" => $preco
            ];
        }

        if (count($precosValidos) === 0) {
            $erros++;
            continue;
        }

        $idCategoria = obterIdPorNome($pdo, "categoria", "id_categoria", "nome_categoria", $categoria);
        $idFabricante = obterIdPorNome($pdo, "fabricante", "id_fabricante", "nome_fabricante", $marca);

        $stmtProduto->execute([$nome]);
        $produtoId = $stmtProduto->fetchColumn();

        if ($produtoId) {
            $produtoId = (int) $produtoId;
            $stmtAtualizarProduto->execute([$idCategoria, $idFabricante, $produtoId]);
            $atualizados++;
        } else {
            $stmtInserirProduto->execute([
                $nome,
                "Produto importado por planilha.",
                "assets/img/logo/logo.png",
                null,
                $idCategoria,
                $idFabricante
            ]);
            $produtoId = (int) $pdo->lastInsertId();
            $inseridos++;
        }

        foreach ($precosValidos as $precoItem) {
            $idMercado = obterIdPorNome($pdo, "mercado", "id_mercado", "nome_mercado", $precoItem["mercado"]);
            $stmtPreco->execute([$idMercado, $produtoId, $precoItem["preco"]]);
        }
    }

    $pdo->commit();
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fclose($handle);
    jsonResponse(false, "Erro ao importar: " . $e->getMessage(), null, 500);
}

fclose($handle);

jsonResponse(true, "Importacao concluida.", [
    "produtos_inseridos" => $inseridos,
    "produtos_atualizados" => $atualizados,
    "linhas_com_erro" => $erros
]);
