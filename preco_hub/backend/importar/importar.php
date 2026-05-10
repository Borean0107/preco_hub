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

class LeitorZipXlsxSemExtensao
{
    private $dados = "";
    private $entradas = [];

    public function open($arquivo)
    {
        $dados = file_get_contents($arquivo);

        if ($dados === false) {
            return false;
        }

        $this->dados = $dados;
        $this->entradas = [];
        $this->carregarDiretorioCentral();

        return true;
    }

    public function getFromName($nome)
    {
        $nome = str_replace("\\", "/", (string) $nome);

        if (!isset($this->entradas[$nome])) {
            return false;
        }

        $entrada = $this->entradas[$nome];

        if (($entrada["flags"] & 1) === 1) {
            throw new RuntimeException("XLSX protegido por senha nao e suportado.");
        }

        $cabecalhoLocal = substr($this->dados, $entrada["localOffset"], 30);

        if (strlen($cabecalhoLocal) < 30) {
            throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
        }

        $cabecalho = unpack(
            "Vsignature/vversionNeeded/vflags/vmethod/vmtime/vmdate/Vcrc/VcompressedSize/VuncompressedSize/vnameLength/vextraLength",
            $cabecalhoLocal
        );

        if (($cabecalho["signature"] ?? 0) !== 0x04034b50) {
            throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
        }

        $inicioConteudo = $entrada["localOffset"] + 30 + $cabecalho["nameLength"] + $cabecalho["extraLength"];
        $conteudoComprimido = substr($this->dados, $inicioConteudo, $entrada["compressedSize"]);

        if (strlen($conteudoComprimido) < $entrada["compressedSize"]) {
            throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
        }

        if ($entrada["method"] === 0) {
            return $conteudoComprimido;
        }

        if ($entrada["method"] === 8) {
            if (!function_exists("gzinflate")) {
                throw new RuntimeException("A extensao ZLIB do PHP e necessaria para importar XLSX sem ZIP.");
            }

            $conteudo = gzinflate($conteudoComprimido);

            if ($conteudo === false) {
                throw new RuntimeException("Nao foi possivel descompactar o arquivo XLSX.");
            }

            return $conteudo;
        }

        throw new RuntimeException("Metodo de compressao do XLSX nao suportado.");
    }

    public function close()
    {
        $this->dados = "";
        $this->entradas = [];
    }

    private function carregarDiretorioCentral()
    {
        $eocdOffset = $this->localizarFimDiretorioCentral();
        $eocd = substr($this->dados, $eocdOffset, 22);

        if (strlen($eocd) < 22) {
            throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
        }

        $info = unpack(
            "Vsignature/vdisk/vcentralDisk/ventriesDisk/ventries/VcentralSize/VcentralOffset/vcommentLength",
            $eocd
        );

        if (($info["signature"] ?? 0) !== 0x06054b50) {
            throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
        }

        if ($info["centralOffset"] === 0xffffffff || $info["centralSize"] === 0xffffffff) {
            throw new RuntimeException("XLSX em formato ZIP64 nao e suportado neste ambiente.");
        }

        $offset = $info["centralOffset"];

        for ($i = 0; $i < $info["entries"]; $i++) {
            $cabecalho = substr($this->dados, $offset, 46);

            if (strlen($cabecalho) < 46) {
                throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
            }

            $entrada = unpack(
                "Vsignature/vversionMade/vversionNeeded/vflags/vmethod/vmtime/vmdate/Vcrc/VcompressedSize/VuncompressedSize/vnameLength/vextraLength/vcommentLength/vdiskNumber/vinternalAttributes/VexternalAttributes/VlocalOffset",
                $cabecalho
            );

            if (($entrada["signature"] ?? 0) !== 0x02014b50) {
                throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
            }

            if ($entrada["compressedSize"] === 0xffffffff || $entrada["localOffset"] === 0xffffffff) {
                throw new RuntimeException("XLSX em formato ZIP64 nao e suportado neste ambiente.");
            }

            $nome = substr($this->dados, $offset + 46, $entrada["nameLength"]);
            $nome = str_replace("\\", "/", $nome);

            $this->entradas[$nome] = [
                "flags" => $entrada["flags"],
                "method" => $entrada["method"],
                "compressedSize" => $entrada["compressedSize"],
                "localOffset" => $entrada["localOffset"]
            ];

            $offset += 46 + $entrada["nameLength"] + $entrada["extraLength"] + $entrada["commentLength"];
        }
    }

    private function localizarFimDiretorioCentral()
    {
        $tamanho = strlen($this->dados);
        $janela = min($tamanho, 65557);
        $trecho = substr($this->dados, $tamanho - $janela);
        $posicao = strrpos($trecho, "\x50\x4b\x05\x06");

        if ($posicao === false) {
            throw new RuntimeException("Arquivo XLSX invalido ou corrompido.");
        }

        return ($tamanho - $janela) + $posicao;
    }
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

function descreverErroAberturaZipArchive($codigo)
{
    if (!is_int($codigo)) {
        return "erro desconhecido";
    }

    $erros = [
        "ER_EXISTS" => "o arquivo ja existe",
        "ER_INCONS" => "arquivo ZIP inconsistente",
        "ER_INVAL" => "argumento invalido",
        "ER_MEMORY" => "memoria insuficiente",
        "ER_NOENT" => "arquivo nao encontrado",
        "ER_NOZIP" => "arquivo nao e um ZIP/XLSX valido",
        "ER_OPEN" => "nao foi possivel abrir o arquivo",
        "ER_READ" => "erro de leitura",
        "ER_SEEK" => "erro ao navegar no arquivo"
    ];

    foreach ($erros as $constante => $mensagem) {
        $nomeConstante = "ZipArchive::" . $constante;

        if (defined($nomeConstante) && constant($nomeConstante) === $codigo) {
            return $mensagem;
        }
    }

    return "codigo de erro " . $codigo;
}

function carregarLinhasXlsxComLeitor($zip)
{
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

    return $linhas;
}

function carregarXlsxComLeitor($zip, $arquivo)
{
    $resultado = $zip->open($arquivo);

    if ($resultado !== true) {
        $detalhe = is_a($zip, "ZipArchive") ? descreverErroAberturaZipArchive($resultado) : "nao foi possivel ler o arquivo";
        throw new RuntimeException($detalhe);
    }

    try {
        return carregarLinhasXlsxComLeitor($zip);
    } finally {
        $zip->close();
    }
}

function carregarXlsx($arquivo)
{
    $erroZipArchive = null;

    if (class_exists("ZipArchive")) {
        try {
            return carregarXlsxComLeitor(new ZipArchive(), $arquivo);
        } catch (Throwable $e) {
            $erroZipArchive = $e->getMessage();
        }
    }

    try {
        return carregarXlsxComLeitor(new LeitorZipXlsxSemExtensao(), $arquivo);
    } catch (Throwable $e) {
        if ($erroZipArchive !== null) {
            throw new RuntimeException("ZipArchive falhou (" . $erroZipArchive . ") e o leitor alternativo tambem falhou (" . $e->getMessage() . ").");
        }

        throw $e;
    }
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
