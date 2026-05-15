<?php

require_once __DIR__ . "/../middleware/admin.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/produto_schema.php";

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

define("IMPORTACAO_IMAGEM_PADRAO_PRODUTO", "assets/img/logo/logo.png");
define("IMPORTACAO_DIRETORIO_IMAGENS_PRODUTOS", __DIR__ . "/../../assets/img/produtos/");
define("IMPORTACAO_CAMINHO_WEB_IMAGENS_PRODUTOS", "assets/img/produtos/");
define("IMPORTACAO_TAMANHO_MAXIMO_IMAGEM", 2 * 1024 * 1024);

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

function normalizarCabecalhoImportacao($valor)
{
    $valor = trim(removerBom($valor));
    $valor = strtr($valor, [
        "Á" => "A", "À" => "A", "Â" => "A", "Ã" => "A", "Ä" => "A",
        "á" => "a", "à" => "a", "â" => "a", "ã" => "a", "ä" => "a",
        "É" => "E", "È" => "E", "Ê" => "E", "Ë" => "E",
        "é" => "e", "è" => "e", "ê" => "e", "ë" => "e",
        "Í" => "I", "Ì" => "I", "Î" => "I", "Ï" => "I",
        "í" => "i", "ì" => "i", "î" => "i", "ï" => "i",
        "Ó" => "O", "Ò" => "O", "Ô" => "O", "Õ" => "O", "Ö" => "O",
        "ó" => "o", "ò" => "o", "ô" => "o", "õ" => "o", "ö" => "o",
        "Ú" => "U", "Ù" => "U", "Û" => "U", "Ü" => "U",
        "ú" => "u", "ù" => "u", "û" => "u", "ü" => "u",
        "Ç" => "C", "ç" => "c"
    ]);
    $valor = strtolower($valor);
    $valor = preg_replace('/[^a-z0-9]+/', "_", $valor);

    return trim($valor, "_");
}

function cabecalhoEhImagem($valor)
{
    return in_array(normalizarCabecalhoImportacao($valor), [
        "imagem",
        "imagens",
        "foto",
        "fotos",
        "image",
        "images",
        "url",
        "link",
        "url_imagem",
        "url_da_imagem",
        "url_foto",
        "url_da_foto",
        "imagem_url",
        "foto_url",
        "link_imagem",
        "link_da_imagem",
        "link_foto",
        "link_da_foto",
        "caminho_imagem",
        "caminho_da_imagem",
        "arquivo_imagem",
        "arquivo_da_imagem",
        "imagem_produto",
        "foto_produto"
    ], true);
}

function obterIndicesMercadosEImagem($header)
{
    $indiceImagem = null;
    $indicesMercados = [];

    for ($i = 3; $i < count($header); $i++) {
        if ($indiceImagem === null && cabecalhoEhImagem($header[$i] ?? "")) {
            $indiceImagem = $i;
            continue;
        }

        $indicesMercados[] = $i;
    }

    return [$indicesMercados, $indiceImagem];
}

function valorPareceReferenciaImagem($valor)
{
    $valor = trim((string) $valor);

    if ($valor === "") {
        return false;
    }

    if (preg_match('/^data:image\/(?:jpeg|jpg|png|webp);base64,/i', $valor)) {
        return true;
    }

    if (filter_var($valor, FILTER_VALIDATE_URL) && preg_match('/^https?:\/\//i', $valor)) {
        return true;
    }

    $caminho = str_replace("\\", "/", $valor);

    return strpos($caminho, "..") === false && preg_match('/\.(jpe?g|png|webp)(?:[?#].*)?$/i', $caminho);
}

function obterReferenciaImagemLinha($linha, $indiceColunaImagem)
{
    if ($indiceColunaImagem !== null) {
        return [
            "valor" => $linha[$indiceColunaImagem] ?? "",
            "indice" => $indiceColunaImagem,
            "detectada_por_cabecalho" => true
        ];
    }

    for ($i = 3; $i < count($linha); $i++) {
        if (valorPareceReferenciaImagem($linha[$i] ?? "")) {
            return [
                "valor" => $linha[$i],
                "indice" => $i,
                "detectada_por_cabecalho" => false
            ];
        }
    }

    return [
        "valor" => "",
        "indice" => null,
        "detectada_por_cabecalho" => false
    ];
}

function slugImagemProduto($nomeProduto)
{
    $nomeProduto = strtr(trim((string) $nomeProduto), [
        "Á" => "A", "À" => "A", "Â" => "A", "Ã" => "A", "Ä" => "A",
        "á" => "a", "à" => "a", "â" => "a", "ã" => "a", "ä" => "a",
        "É" => "E", "È" => "E", "Ê" => "E", "Ë" => "E",
        "é" => "e", "è" => "e", "ê" => "e", "ë" => "e",
        "Í" => "I", "Ì" => "I", "Î" => "I", "Ï" => "I",
        "í" => "i", "ì" => "i", "î" => "i", "ï" => "i",
        "Ó" => "O", "Ò" => "O", "Ô" => "O", "Õ" => "O", "Ö" => "O",
        "ó" => "o", "ò" => "o", "ô" => "o", "õ" => "o", "ö" => "o",
        "Ú" => "U", "Ù" => "U", "Û" => "U", "Ü" => "U",
        "ú" => "u", "ù" => "u", "û" => "u", "ü" => "u",
        "Ç" => "C", "ç" => "c"
    ]);
    $nomeProduto = strtolower($nomeProduto);
    $nomeProduto = preg_replace('/[^a-z0-9_-]+/', "_", $nomeProduto);
    $nomeProduto = trim($nomeProduto, "_");

    return $nomeProduto !== "" ? $nomeProduto : "produto";
}

function extensaoImagemPermitida($mimeType)
{
    $tipos = [
        "image/jpeg" => "jpg",
        "image/pjpeg" => "jpg",
        "image/png" => "png",
        "image/x-png" => "png",
        "image/webp" => "webp"
    ];

    return $tipos[$mimeType] ?? null;
}

function detectarMimeImagem($conteudo)
{
    if (function_exists("finfo_open")) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = $finfo ? finfo_buffer($finfo, $conteudo) : false;

        if ($finfo) {
            finfo_close($finfo);
        }

        if ($mimeType) {
            return $mimeType;
        }
    }

    if (strncmp($conteudo, "\xFF\xD8\xFF", 3) === 0) {
        return "image/jpeg";
    }

    if (strncmp($conteudo, "\x89PNG\x0D\x0A\x1A\x0A", 8) === 0) {
        return "image/png";
    }

    if (strncmp($conteudo, "RIFF", 4) === 0 && substr($conteudo, 8, 4) === "WEBP") {
        return "image/webp";
    }

    return "";
}

function garantirDiretorioImagensProdutos()
{
    if (!is_dir(IMPORTACAO_DIRETORIO_IMAGENS_PRODUTOS) && !mkdir(IMPORTACAO_DIRETORIO_IMAGENS_PRODUTOS, 0755, true)) {
        throw new RuntimeException("Nao foi possivel criar diretorio de imagens dos produtos.");
    }
}

function salvarConteudoImagemProduto($conteudo, $nomeProduto, $nomeOriginal = "")
{
    if (!is_string($conteudo) || $conteudo === "") {
        throw new RuntimeException("Imagem vazia.");
    }

    if (strlen($conteudo) > IMPORTACAO_TAMANHO_MAXIMO_IMAGEM) {
        throw new RuntimeException("Imagem maior que 2MB.");
    }

    $mimeType = detectarMimeImagem($conteudo);
    $extensao = extensaoImagemPermitida($mimeType);

    if ($extensao === null) {
        throw new RuntimeException("Formato de imagem invalido.");
    }

    garantirDiretorioImagensProdutos();

    $slug = slugImagemProduto($nomeProduto);
    $sufixo = function_exists("random_bytes") ? bin2hex(random_bytes(4)) : uniqid();
    $nomeArquivo = $slug . "_" . date("YmdHis") . "_" . $sufixo . "." . $extensao;
    $caminhoCompleto = IMPORTACAO_DIRETORIO_IMAGENS_PRODUTOS . $nomeArquivo;

    if (file_put_contents($caminhoCompleto, $conteudo) === false) {
        throw new RuntimeException("Nao foi possivel salvar a imagem do produto.");
    }

    return IMPORTACAO_CAMINHO_WEB_IMAGENS_PRODUTOS . $nomeArquivo;
}

function arquivoLocalImagemExiste($caminhoRelativo)
{
    $caminhoRelativo = str_replace("\\", "/", trim((string) $caminhoRelativo));

    if ($caminhoRelativo === "" || strpos($caminhoRelativo, "..") !== false) {
        return false;
    }

    $base = realpath(__DIR__ . "/../../");
    $caminhoCompleto = realpath(__DIR__ . "/../../" . ltrim($caminhoRelativo, "/"));

    return $base && $caminhoCompleto && strpos($caminhoCompleto, $base . DIRECTORY_SEPARATOR) === 0 && is_file($caminhoCompleto);
}

function normalizarReferenciaImagemImportada($valor, $nomeProduto, &$arquivosImagensSalvas, &$imagemSalvaLocalmente)
{
    $valor = trim((string) $valor);

    if ($valor === "") {
        return null;
    }

    if (preg_match('/^data:image\/(?:jpeg|jpg|png|webp);base64,(.+)$/i', $valor, $matches)) {
        $conteudo = base64_decode(preg_replace('/\s+/', "", $matches[1]), true);

        if ($conteudo === false) {
            return null;
        }

        $caminho = salvarConteudoImagemProduto($conteudo, $nomeProduto);
        $arquivosImagensSalvas[] = $caminho;
        $imagemSalvaLocalmente = true;

        return $caminho;
    }

    if (filter_var($valor, FILTER_VALIDATE_URL) && preg_match('/^https?:\/\//i', $valor)) {
        return $valor;
    }

    $caminho = str_replace("\\", "/", $valor);
    $caminho = ltrim($caminho, "/");

    if (strpos($caminho, "..") !== false || !preg_match('/\.(jpe?g|png|webp)$/i', $caminho)) {
        return null;
    }

    $candidatos = [];

    if (strpos($caminho, "assets/img/") === 0) {
        $candidatos[] = $caminho;
    } elseif (strpos($caminho, "img/") === 0) {
        $candidatos[] = "assets/" . $caminho;
    } elseif (strpos($caminho, "/") === false) {
        $candidatos[] = IMPORTACAO_CAMINHO_WEB_IMAGENS_PRODUTOS . $caminho;
    }

    foreach ($candidatos as $candidato) {
        if (arquivoLocalImagemExiste($candidato)) {
            return $candidato;
        }
    }

    return null;
}

function resolverImagemProdutoImportacao($valorImagem, $imagemEmbutida, $nomeProduto, &$arquivosImagensSalvas, &$imagemSalvaLocalmente, &$imagemIgnorada)
{
    $imagemSalvaLocalmente = false;
    $imagemIgnorada = false;

    if (trim((string) $valorImagem) !== "") {
        try {
            $referencia = normalizarReferenciaImagemImportada($valorImagem, $nomeProduto, $arquivosImagensSalvas, $imagemSalvaLocalmente);

            if ($referencia) {
                return $referencia;
            }
        } catch (Throwable $e) {
            $imagemIgnorada = true;
        }

        $imagemIgnorada = true;
    }

    if (is_array($imagemEmbutida) && isset($imagemEmbutida["referencia"])) {
        $imagemExternaSalva = false;

        try {
            $referenciaExterna = normalizarReferenciaImagemImportada($imagemEmbutida["referencia"], $nomeProduto, $arquivosImagensSalvas, $imagemExternaSalva);

            if ($referenciaExterna) {
                $imagemSalvaLocalmente = $imagemExternaSalva;
                return $referenciaExterna;
            }
        } catch (Throwable $e) {
            $imagemIgnorada = true;
        }

        $imagemIgnorada = true;
    }

    if (is_array($imagemEmbutida) && isset($imagemEmbutida["conteudo"])) {
        try {
            $caminho = salvarConteudoImagemProduto($imagemEmbutida["conteudo"], $nomeProduto, $imagemEmbutida["nome_original"] ?? "");
            $arquivosImagensSalvas[] = $caminho;
            $imagemSalvaLocalmente = true;

            return $caminho;
        } catch (Throwable $e) {
            $imagemIgnorada = true;
        }
    }

    return null;
}

function removerImagensSalvasImportacao($arquivosImagensSalvas)
{
    foreach ($arquivosImagensSalvas as $caminhoRelativo) {
        $caminhoRelativo = str_replace("\\", "/", (string) $caminhoRelativo);

        if (strpos($caminhoRelativo, IMPORTACAO_CAMINHO_WEB_IMAGENS_PRODUTOS) !== 0) {
            continue;
        }

        $caminhoCompleto = realpath(__DIR__ . "/../../" . $caminhoRelativo);
        $diretorioProdutos = realpath(IMPORTACAO_DIRETORIO_IMAGENS_PRODUTOS);

        if (!$caminhoCompleto || !$diretorioProdutos || strpos($caminhoCompleto, $diretorioProdutos . DIRECTORY_SEPARATOR) !== 0) {
            continue;
        }

        if (is_file($caminhoCompleto)) {
            @unlink($caminhoCompleto);
        }
    }
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

function normalizarCaminhoZip($baseArquivo, $target)
{
    $target = str_replace("\\", "/", trim((string) $target));

    if ($target === "") {
        return "";
    }

    if (strpos($target, "/") === 0) {
        $caminho = ltrim($target, "/");
    } else {
        $baseDir = str_replace("\\", "/", dirname((string) $baseArquivo));
        $caminho = ($baseDir === "." || $baseDir === "") ? $target : $baseDir . "/" . $target;
    }

    $partes = explode("/", $caminho);
    $normalizado = [];

    foreach ($partes as $parte) {
        if ($parte === "" || $parte === ".") {
            continue;
        }

        if ($parte === "..") {
            array_pop($normalizado);
            continue;
        }

        $normalizado[] = $parte;
    }

    return implode("/", $normalizado);
}

function normalizarCaminhoPlanilha($target)
{
    return normalizarCaminhoZip("xl/workbook.xml", $target);
}

function caminhoRelacionamentosXlsx($caminhoArquivo)
{
    $caminhoArquivo = str_replace("\\", "/", (string) $caminhoArquivo);
    $diretorio = dirname($caminhoArquivo);
    $nomeArquivo = basename($caminhoArquivo);

    if ($diretorio === "." || $diretorio === "") {
        return "_rels/" . $nomeArquivo . ".rels";
    }

    return $diretorio . "/_rels/" . $nomeArquivo . ".rels";
}

function carregarRelacionamentosXlsx($zip, $caminhoArquivo)
{
    $conteudo = $zip->getFromName(caminhoRelacionamentosXlsx($caminhoArquivo));

    if ($conteudo === false) {
        return [];
    }

    $xml = carregarXmlSeguro($conteudo, "Nao foi possivel ler os relacionamentos do XLSX.");
    $relationships = $xml->children("http://schemas.openxmlformats.org/package/2006/relationships")->Relationship;
    $resultado = [];

    foreach ($relationships as $relationship) {
        $id = (string) $relationship["Id"];
        $target = (string) $relationship["Target"];
        $targetMode = (string) $relationship["TargetMode"];

        if ($id === "" || $target === "") {
            continue;
        }

        $resultado[$id] = [
            "type" => (string) $relationship["Type"],
            "target" => strtolower($targetMode) === "external" ? $target : normalizarCaminhoZip($caminhoArquivo, $target),
            "target_mode" => $targetMode
        ];
    }

    return $resultado;
}

function obterAtributoRelacao($elemento, $nome)
{
    $atributos = $elemento->attributes("http://schemas.openxmlformats.org/officeDocument/2006/relationships");

    return isset($atributos[$nome]) ? (string) $atributos[$nome] : "";
}

function registrarNamespacesDesenho($elemento)
{
    $elemento->registerXPathNamespace("xdr", "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing");
    $elemento->registerXPathNamespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main");
    $elemento->registerXPathNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships");
}

function carregarImagensDoDesenhoXlsx($zip, $caminhoDesenho)
{
    $conteudo = $zip->getFromName($caminhoDesenho);

    if ($conteudo === false) {
        return [];
    }

    $xml = carregarXmlSeguro($conteudo, "Nao foi possivel ler as imagens do XLSX.");
    registrarNamespacesDesenho($xml);
    $anchors = $xml->xpath("//xdr:twoCellAnchor | //xdr:oneCellAnchor");

    if (!$anchors) {
        return [];
    }

    $relacionamentos = carregarRelacionamentosXlsx($zip, $caminhoDesenho);
    $imagensPorLinha = [];

    foreach ($anchors as $anchor) {
        registrarNamespacesDesenho($anchor);
        $rows = $anchor->xpath("xdr:from/xdr:row");
        $blips = $anchor->xpath(".//a:blip");

        if (!$rows || !$blips || !isset($rows[0])) {
            continue;
        }

        $numeroLinha = ((int) $rows[0]) + 1;

        if ($numeroLinha <= 0 || isset($imagensPorLinha[$numeroLinha])) {
            continue;
        }

        foreach ($blips as $blip) {
            $relId = obterAtributoRelacao($blip, "embed");

            if ($relId === "") {
                $relId = obterAtributoRelacao($blip, "link");
            }

            if ($relId === "" || !isset($relacionamentos[$relId])) {
                continue;
            }

            $relacionamento = $relacionamentos[$relId];

            if (strtolower($relacionamento["target_mode"] ?? "") === "external") {
                $imagensPorLinha[$numeroLinha] = [
                    "referencia" => $relacionamento["target"]
                ];
                break;
            }

            $caminhoImagem = $relacionamento["target"];
            $conteudoImagem = $zip->getFromName($caminhoImagem);

            if ($conteudoImagem === false) {
                continue;
            }

            $imagensPorLinha[$numeroLinha] = [
                "conteudo" => $conteudoImagem,
                "nome_original" => basename($caminhoImagem)
            ];
            break;
        }
    }

    return $imagensPorLinha;
}

function carregarImagensPlanilhaXlsx($zip, $caminhoPlanilha, $xmlPlanilha)
{
    $xmlPlanilha->registerXPathNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main");
    $drawings = $xmlPlanilha->xpath("//m:drawing");

    if (!$drawings) {
        return [];
    }

    $relacionamentosPlanilha = carregarRelacionamentosXlsx($zip, $caminhoPlanilha);
    $imagensPorLinha = [];

    foreach ($drawings as $drawing) {
        $relId = obterAtributoRelacao($drawing, "id");

        if ($relId === "" || !isset($relacionamentosPlanilha[$relId])) {
            continue;
        }

        $relacionamento = $relacionamentosPlanilha[$relId];

        if (strtolower($relacionamento["target_mode"] ?? "") === "external") {
            continue;
        }

        $imagensDesenho = carregarImagensDoDesenhoXlsx($zip, $relacionamento["target"]);

        foreach ($imagensDesenho as $linha => $imagem) {
            if (!isset($imagensPorLinha[$linha])) {
                $imagensPorLinha[$linha] = $imagem;
            }
        }
    }

    return $imagensPorLinha;
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
    $linhasPlanilha = [];
    $imagensPorLinha = carregarImagensPlanilhaXlsx($zip, $caminhoPlanilha, $xml);

    foreach ($rows as $row) {
        $row->registerXPathNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main");
        $cells = $row->xpath("m:c");
        $linha = [];
        $maiorIndice = -1;
        $numeroLinhaPlanilha = isset($row["r"]) ? (int) $row["r"] : count($linhas) + 1;

        foreach ($cells as $cell) {
            $indice = colunaParaIndice((string) $cell["r"]);
            $linha[$indice] = obterValorCelulaXlsx($cell, $stringsCompartilhadas);
            $maiorIndice = max($maiorIndice, $indice);
        }

        if ($maiorIndice < 0) {
            $linhas[] = [];
            $linhasPlanilha[] = $numeroLinhaPlanilha;
            continue;
        }

        $linhaCompleta = [];

        for ($i = 0; $i <= $maiorIndice; $i++) {
            $linhaCompleta[] = removerBom($linha[$i] ?? "");
        }

        $linhas[] = $linhaCompleta;
        $linhasPlanilha[] = $numeroLinhaPlanilha;
    }

    return [
        "linhas" => $linhas,
        "linhas_planilha" => $linhasPlanilha,
        "imagens_por_linha" => $imagensPorLinha
    ];
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

    $linhas = carregarCsv($arquivo);
    $linhasPlanilha = [];

    foreach ($linhas as $indice => $_linha) {
        $linhasPlanilha[] = $indice + 1;
    }

    return [
        "linhas" => $linhas,
        "linhas_planilha" => $linhasPlanilha,
        "imagens_por_linha" => []
    ];
}

try {
    $dadosImportacao = carregarLinhasImportacao($arquivo, $extensao);
} catch (Throwable $e) {
    jsonResponse(false, "Erro ao ler a planilha: " . $e->getMessage(), null, 400);
}

$linhas = $dadosImportacao["linhas"] ?? [];
$linhasPlanilha = $dadosImportacao["linhas_planilha"] ?? [];
$imagensPorLinha = $dadosImportacao["imagens_por_linha"] ?? [];

while ($linhas && linhaEstaVazia($linhas[0])) {
    array_shift($linhas);
    array_shift($linhasPlanilha);
}

$header = $linhas ? array_shift($linhas) : null;
if ($linhasPlanilha) {
    array_shift($linhasPlanilha);
}

if (!$header || count($header) < 4) {
    jsonResponse(false, "Formato invalido. Use: produto, marca, categoria e mercados.", null, 400);
}

$header = array_map(function ($valor) {
    return trim(removerBom($valor));
}, $header);

[$indicesMercados, $indiceColunaImagem] = obterIndicesMercadosEImagem($header);

if (count($indicesMercados) === 0) {
    jsonResponse(false, "Formato invalido. Informe pelo menos uma coluna de mercado com preco.", null, 400);
}

$inseridos = 0;
$atualizados = 0;
$erros = 0;
$imagensVinculadas = 0;
$imagensSalvasLocalmente = 0;
$imagensIgnoradas = 0;
$imagensDetectadasAutomaticamente = 0;
$arquivosImagensSalvas = [];

try {
    garantirColunaImagemProdutoLonga($pdo);

    $pdo->beginTransaction();

    $stmtProduto = $pdo->prepare("SELECT id_produto, imagem_produto FROM produto WHERE nome_produto = ? LIMIT 1");
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
            fk_fabricante_id_fabricante = ?,
            imagem_produto = ?
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

    foreach ($linhas as $indiceLinha => $linha) {
        if (linhaEstaVazia($linha)) {
            continue;
        }

        $numeroLinhaPlanilha = $linhasPlanilha[$indiceLinha] ?? ($indiceLinha + 2);
        $nome = trim((string) ($linha[0] ?? ""));
        $marca = trim((string) ($linha[1] ?? ""));
        $categoria = trim((string) ($linha[2] ?? ""));

        if (!$nome || !$marca || !$categoria) {
            $erros++;
            continue;
        }

        $referenciaImagemLinha = obterReferenciaImagemLinha($linha, $indiceColunaImagem);

        if ($referenciaImagemLinha["indice"] !== null && !$referenciaImagemLinha["detectada_por_cabecalho"]) {
            $imagensDetectadasAutomaticamente++;
        }

        $precosValidos = [];

        foreach ($indicesMercados as $i) {
            if ($referenciaImagemLinha["indice"] !== null && $i === $referenciaImagemLinha["indice"]) {
                continue;
            }

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

        $imagemSalvaLocalmente = false;
        $imagemIgnorada = false;
        $imagemProduto = resolverImagemProdutoImportacao(
            $referenciaImagemLinha["valor"],
            $imagensPorLinha[$numeroLinhaPlanilha] ?? null,
            $nome,
            $arquivosImagensSalvas,
            $imagemSalvaLocalmente,
            $imagemIgnorada
        );

        if ($imagemProduto) {
            $imagensVinculadas++;
        }

        if ($imagemSalvaLocalmente) {
            $imagensSalvasLocalmente++;
        }

        if ($imagemIgnorada) {
            $imagensIgnoradas++;
        }

        $idCategoria = obterIdPorNome($pdo, "categoria", "id_categoria", "nome_categoria", $categoria);
        $idFabricante = obterIdPorNome($pdo, "fabricante", "id_fabricante", "nome_fabricante", $marca);

        $stmtProduto->execute([$nome]);
        $produtoAtual = $stmtProduto->fetch(PDO::FETCH_ASSOC);

        if ($produtoAtual) {
            $produtoId = (int) $produtoAtual["id_produto"];
            $imagemFinal = $imagemProduto ?: $produtoAtual["imagem_produto"];
            $stmtAtualizarProduto->execute([$idCategoria, $idFabricante, $imagemFinal, $produtoId]);
            $atualizados++;
        } else {
            $stmtInserirProduto->execute([
                $nome,
                "Produto importado por planilha.",
                $imagemProduto ?: IMPORTACAO_IMAGEM_PADRAO_PRODUTO,
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
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    removerImagensSalvasImportacao($arquivosImagensSalvas);

    jsonResponse(false, "Erro ao importar: " . $e->getMessage(), null, 500);
}

jsonResponse(true, "Importacao concluida.", [
    "produtos_inseridos" => $inseridos,
    "produtos_atualizados" => $atualizados,
    "linhas_com_erro" => $erros,
    "imagens_vinculadas" => $imagensVinculadas,
    "imagens_salvas" => $imagensSalvasLocalmente,
    "imagens_ignoradas" => $imagensIgnoradas,
    "coluna_imagem_detectada" => $indiceColunaImagem !== null,
    "imagens_detectadas_automaticamente" => $imagensDetectadasAutomaticamente
]);
