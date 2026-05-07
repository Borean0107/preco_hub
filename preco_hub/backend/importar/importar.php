<?php

require_once __DIR__ . "/../middleware/admin.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

if (!isset($_FILES["arquivo"]) || $_FILES["arquivo"]["error"] !== UPLOAD_ERR_OK) {
    jsonResponse(false, "Nenhum arquivo CSV ou XLSX foi enviado.", null, 400);
}

$nomeArquivo = $_FILES["arquivo"]["name"] ?? "";
$extensao = strtolower(pathinfo($nomeArquivo, PATHINFO_EXTENSION));

if (!in_array($extensao, ["csv", "xlsx"], true)) {
    jsonResponse(false, "Envie um arquivo no formato CSV ou XLSX.", null, 400);
}

$arquivo = $_FILES["arquivo"]["tmp_name"];

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
    $permitidos = [
        "categoria" => ["id_categoria", "nome_categoria"],
        "fabricante" => ["id_fabricante", "nome_fabricante"],
        "mercado" => ["id_mercado", "nome_mercado"]
    ];

    if (!isset($permitidos[$tabela]) || $permitidos[$tabela] !== [$colunaId, $colunaNome]) {
        throw new InvalidArgumentException("Tabela de apoio invalida.");
    }

    $stmt = $pdo->prepare("SELECT {$colunaId} FROM {$tabela} WHERE {$colunaNome} = ? LIMIT 1");
    $stmt->execute([$nome]);
    $id = $stmt->fetchColumn();

    if ($id) {
        return (int) $id;
    }

    $stmt = $pdo->prepare("INSERT INTO {$tabela} ({$colunaNome}) VALUES (?)");
    $stmt->execute([$nome]);

    return (int) $pdo->lastInsertId();
}

function removerBom($valor)
{
    return preg_replace('/^\xEF\xBB\xBF/', '', (string) $valor);
}

function linhaEstaVazia($linha)
{
    foreach ($linha as $valor) {
        if (trim((string) $valor) !== "") {
            return false;
        }
    }

    return true;
}

function carregarCsv($arquivo)
{
    $handle = fopen($arquivo, "r");

    if ($handle === false) {
        jsonResponse(false, "Erro ao abrir o arquivo CSV.", null, 400);
    }

    $primeiraLinha = fgets($handle);

    if ($primeiraLinha === false) {
        fclose($handle);
        jsonResponse(false, "O arquivo CSV esta vazio.", null, 400);
    }

    $delimitador = detectarDelimitador($primeiraLinha);
    rewind($handle);

    $linhas = [];

    while (($linha = fgetcsv($handle, 0, $delimitador)) !== false) {
        $linhas[] = array_map("removerBom", $linha);
    }

    fclose($handle);

    return $linhas;
}

function colunaParaIndice($referencia)
{
    preg_match('/^[A-Z]+/i', (string) $referencia, $matches);
    $letras = strtoupper($matches[0] ?? "");
    $indice = 0;

    for ($i = 0; $i < strlen($letras); $i++) {
        $indice = ($indice * 26) + (ord($letras[$i]) - 64);
    }

    return max(0, $indice - 1);
}

function filhosXlsx($elemento)
{
    if (!$elemento) {
        return null;
    }

    return $elemento->children("http://schemas.openxmlformats.org/spreadsheetml/2006/main");
}

function filhoXlsx($elemento, $nome)
{
    $filhos = filhosXlsx($elemento);

    if ($filhos && isset($filhos->{$nome})) {
        return $filhos->{$nome};
    }

    if ($elemento && isset($elemento->{$nome})) {
        return $elemento->{$nome};
    }

    return null;
}

function textoCelulaRica($elemento)
{
    if (!$elemento) {
        return "";
    }

    $texto = "";
    $textoDireto = filhoXlsx($elemento, "t");

    if ($textoDireto !== null) {
        $texto .= (string) $textoDireto;
    }

    $filhos = filhosXlsx($elemento);
    $runs = $filhos ? $filhos->r : $elemento->r;

    foreach ($runs as $run) {
        $textoRun = filhoXlsx($run, "t");
        $texto .= (string) ($textoRun ?? "");
    }

    return $texto;
}

function carregarXmlSeguro($conteudo, $mensagemErro)
{
    $usoAnterior = libxml_use_internal_errors(true);
    libxml_clear_errors();

    $xml = simplexml_load_string($conteudo);
    $erros = libxml_get_errors();

    libxml_clear_errors();
    libxml_use_internal_errors($usoAnterior);

    if ($xml === false) {
        $detalhe = "";

        if ($erros && isset($erros[0])) {
            $detalhe = " Linha " . $erros[0]->line . ": " . trim($erros[0]->message);
        }

        throw new RuntimeException($mensagemErro . $detalhe);
    }

    return $xml;
}

function carregarStringsCompartilhadas($zip)
{
    $conteudo = $zip->getFromName("xl/sharedStrings.xml");

    if ($conteudo === false) {
        return [];
    }

    $xml = carregarXmlSeguro($conteudo, "Nao foi possivel ler os textos compartilhados do XLSX.");

    $strings = [];
    $itens = $xml->children("http://schemas.openxmlformats.org/spreadsheetml/2006/main")->si;

    foreach ($itens as $item) {
        $strings[] = textoCelulaRica($item);
    }

    return $strings;
}

function normalizarCaminhoPlanilha($target)
{
    $target = str_replace("\\", "/", (string) $target);

    if (strpos($target, "/xl/") === 0) {
        return ltrim($target, "/");
    }

    if (strpos($target, "/") === 0) {
        return "xl" . $target;
    }

    return "xl/" . ltrim($target, "/");
}

function obterCaminhoPrimeiraPlanilha($zip)
{
    $workbookXml = $zip->getFromName("xl/workbook.xml");
    $relsXml = $zip->getFromName("xl/_rels/workbook.xml.rels");

    if ($workbookXml === false || $relsXml === false) {
        return "xl/worksheets/sheet1.xml";
    }

    $workbook = carregarXmlSeguro($workbookXml, "Nao foi possivel ler a estrutura do XLSX.");
    $rels = carregarXmlSeguro($relsXml, "Nao foi possivel ler os relacionamentos do XLSX.");

    if ($workbook === false || $rels === false) {
        return "xl/worksheets/sheet1.xml";
    }

    $workbook->registerXPathNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main");
    $sheetNodes = $workbook->xpath("//m:sheets/m:sheet");

    if (!$sheetNodes || !isset($sheetNodes[0])) {
        return "xl/worksheets/sheet1.xml";
    }

    $relationshipId = (string) $sheetNodes[0]->attributes("http://schemas.openxmlformats.org/officeDocument/2006/relationships")["id"];

    $relationships = $rels->children("http://schemas.openxmlformats.org/package/2006/relationships")->Relationship;

    foreach ($relationships as $relationship) {
        if ((string) $relationship["Id"] === $relationshipId) {
            return normalizarCaminhoPlanilha((string) $relationship["Target"]);
        }
    }

    return "xl/worksheets/sheet1.xml";
}

function obterValorCelulaXlsx($cell, $stringsCompartilhadas)
{
    $tipo = (string) $cell["t"];
    $valor = filhoXlsx($cell, "v");

    if ($tipo === "s") {
        $indice = (int) ($valor ?? -1);
        return $stringsCompartilhadas[$indice] ?? "";
    }

    if ($tipo === "inlineStr") {
        return textoCelulaRica(filhoXlsx($cell, "is"));
    }

    if ($valor !== null) {
        return (string) $valor;
    }

    return "";
}

function carregarXlsx($arquivo)
{
    if (!class_exists("ZipArchive")) {
        jsonResponse(false, "A extensao ZIP do PHP e necessaria para importar XLSX.", null, 500);
    }

    $zip = new ZipArchive();

    if ($zip->open($arquivo) !== true) {
        jsonResponse(false, "Erro ao abrir o arquivo XLSX.", null, 400);
    }

    try {
        $stringsCompartilhadas = carregarStringsCompartilhadas($zip);
        $caminhoPlanilha = obterCaminhoPrimeiraPlanilha($zip);
        $conteudoPlanilha = $zip->getFromName($caminhoPlanilha);

        if ($conteudoPlanilha === false) {
            throw new RuntimeException("Nao foi possivel localizar a primeira aba do XLSX.");
        }

        $xml = carregarXmlSeguro($conteudoPlanilha, "Nao foi possivel ler a primeira aba do XLSX.");

        $xml->registerXPathNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main");
        $rows = $xml->xpath("//m:sheetData/m:row");
        $linhas = [];

        foreach ($rows as $row) {
            $row->registerXPathNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main");
            $cells = $row->xpath("m:c");
            $linha = [];
            $maiorIndice = -1;

            foreach ($cells as $cell) {
                $indice = colunaParaIndice((string) $cell["r"]);
                $linha[$indice] = obterValorCelulaXlsx($cell, $stringsCompartilhadas);
                $maiorIndice = max($maiorIndice, $indice);
            }

            if ($maiorIndice < 0) {
                $linhas[] = [];
                continue;
            }

            $linhaCompleta = [];

            for ($i = 0; $i <= $maiorIndice; $i++) {
                $linhaCompleta[] = removerBom($linha[$i] ?? "");
            }

            $linhas[] = $linhaCompleta;
        }
    } finally {
        $zip->close();
    }

    return $linhas;
}

function carregarLinhasImportacao($arquivo, $extensao)
{
    if ($extensao === "xlsx") {
        return carregarXlsx($arquivo);
    }

    return carregarCsv($arquivo);
}

try {
    $linhas = carregarLinhasImportacao($arquivo, $extensao);
} catch (Throwable $e) {
    jsonResponse(false, "Erro ao ler a planilha: " . $e->getMessage(), null, 400);
}

while ($linhas && linhaEstaVazia($linhas[0])) {
    array_shift($linhas);
}

$header = $linhas ? array_shift($linhas) : null;

if (!$header || count($header) < 4) {
    jsonResponse(false, "Formato invalido. Use: produto, marca, categoria e mercados.", null, 400);
}

$header = array_map(function ($valor) {
    return trim(removerBom($valor));
}, $header);

$inseridos = 0;
$atualizados = 0;
$erros = 0;

try {
    $pdo->beginTransaction();

    $stmtProduto = $pdo->prepare("SELECT id_produto FROM produto WHERE nome_produto = ? LIMIT 1");
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

    foreach ($linhas as $linha) {
        if (linhaEstaVazia($linha)) {
            continue;
        }

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

    jsonResponse(false, "Erro ao importar: " . $e->getMessage(), null, 500);
}

jsonResponse(true, "Importacao concluida.", [
    "produtos_inseridos" => $inseridos,
    "produtos_atualizados" => $atualizados,
    "linhas_com_erro" => $erros
]);
