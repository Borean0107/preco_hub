<?php
require_once __DIR__ . "/../middleware/admin.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Método não permitido.", null, 405);
}

$nome = trim($_POST["nome"] ?? "");
$marca = trim($_POST["marca"] ?? "");
$categoria = trim($_POST["categoria"] ?? "");
$mercadoNomes = $_POST["mercadoNome"] ?? [];
$mercadoPrecos = $_POST["mercadoPreco"] ?? [];
$imagemUpload = $_FILES["imagemProduto"] ?? null;

if (!$nome || !$marca || !$categoria || !is_array($mercadoNomes) || !is_array($mercadoPrecos) || count($mercadoNomes) === 0 || count($mercadoPrecos) === 0) {
    jsonResponse(false, "Preencha todos os campos obrigatórios.", null, 400);
}

$mercados = [];

foreach ($mercadoNomes as $index => $nomeMercado) {
    $nomeMercado = trim($nomeMercado);
    $precoMercado = isset($mercadoPrecos[$index]) ? $mercadoPrecos[$index] : null;
    $precoMercado = filter_var($precoMercado, FILTER_VALIDATE_FLOAT);

    if (!$nomeMercado || $precoMercado === false || $precoMercado <= 0) {
        jsonResponse(false, "Informe nomes e preços válidos para todos os mercados.", null, 400);
    }

    $mercados[] = [
        "nome" => $nomeMercado,
        "preco" => $precoMercado
    ];
}

if (!$imagemUpload || $imagemUpload["error"] !== UPLOAD_ERR_OK) {
    jsonResponse(false, "Selecione uma imagem válida para o produto.", null, 400);
}

$allowedMimeTypes = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $imagemUpload["tmp_name"]);
finfo_close($finfo);

if (!isset($allowedMimeTypes[$mimeType])) {
    jsonResponse(false, "Formato de imagem inválido. Use JPG, PNG ou WEBP.", null, 400);
}

$uploadDir = __DIR__ . "/../../assets/img/produtos/";
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
    jsonResponse(false, "Não foi possível criar diretório de upload.", null, 500);
}

$safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', mb_strtolower(pathinfo($imagemUpload["name"], PATHINFO_FILENAME)));
$extension = $allowedMimeTypes[$mimeType];
$nomeArquivo = $safeName . '_' . time() . '.' . $extension;
$caminhoArquivo = $uploadDir . $nomeArquivo;

if (!move_uploaded_file($imagemUpload["tmp_name"], $caminhoArquivo)) {
    jsonResponse(false, "Falha ao salvar a imagem do produto.", null, 500);
}

$imagemProduto = "assets/img/produtos/" . $nomeArquivo;

try {
    $pdo->beginTransaction();

    $stmtProdutoExistente = $pdo->prepare("SELECT id_produto FROM produto WHERE LOWER(nome_produto) = LOWER(?)");
    $stmtProdutoExistente->execute([$nome]);
    $produtoExistenteId = $stmtProdutoExistente->fetchColumn();

    if ($produtoExistenteId) {
        $pdo->rollBack();
        if (file_exists($caminhoArquivo)) {
            unlink($caminhoArquivo);
        }
        jsonResponse(false, "Produto já cadastrado.", null, 409);
    }

    $sqlCategoria = "SELECT id_categoria FROM categoria WHERE LOWER(nome_categoria) = LOWER(?)";
    $stmt = $pdo->prepare($sqlCategoria);
    $stmt->execute([$categoria]);
    $categoriaExistente = $stmt->fetchColumn();

    if ($categoriaExistente) {
        $idCategoria = (int) $categoriaExistente;
    } else {
        $stmt = $pdo->prepare("INSERT INTO categoria (nome_categoria) VALUES (?)");
        $stmt->execute([$categoria]);
        $idCategoria = (int) $pdo->lastInsertId();
    }

    $sqlFabricante = "SELECT id_fabricante FROM fabricante WHERE LOWER(nome_fabricante) = LOWER(?)";
    $stmt = $pdo->prepare($sqlFabricante);
    $stmt->execute([$marca]);
    $fabricanteExistente = $stmt->fetchColumn();

    if ($fabricanteExistente) {
        $idFabricante = (int) $fabricanteExistente;
    } else {
        $stmt = $pdo->prepare("INSERT INTO fabricante (nome_fabricante) VALUES (?)");
        $stmt->execute([$marca]);
        $idFabricante = (int) $pdo->lastInsertId();
    }

    $stmt = $pdo->prepare(
        "INSERT INTO produto (nome_produto, descricao_produto, imagem_produto, codigo_barras_produto, fk_categoria_id_categoria, fk_fabricante_id_fabricante) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $descricaoProduto = "Produto cadastrado pelo sistema.";
    $codigoBarras = null;
    $stmt->execute([
        $nome,
        $descricaoProduto,
        $imagemProduto,
        $codigoBarras,
        $idCategoria,
        $idFabricante
    ]);

    $idProduto = (int) $pdo->lastInsertId();

    $stmtMercado = $pdo->prepare("SELECT id_mercado FROM mercado WHERE LOWER(nome_mercado) = LOWER(?)");
    $stmtInserirMercado = $pdo->prepare("INSERT INTO mercado (nome_mercado) VALUES (?)");
    $stmtInsertPreco = $pdo->prepare(
        "INSERT INTO mercado_produto (fk_mercado_id_mercado, fk_produto_id_produto, preco_produto_mercado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE preco_produto_mercado = VALUES(preco_produto_mercado)"
    );

    foreach ($mercados as $mercadoItem) {
        $nomeMercado = $mercadoItem["nome"];
        $preco = $mercadoItem["preco"];

        $stmtMercado->execute([$nomeMercado]);
        $idMercado = $stmtMercado->fetchColumn();

        if (!$idMercado) {
            $stmtInserirMercado->execute([$nomeMercado]);
            $idMercado = (int) $pdo->lastInsertId();
        }

        $stmtInsertPreco->execute([(int) $idMercado, $idProduto, $preco]);
    }

    $pdo->commit();
    jsonResponse(true, "Produto cadastrado com sucesso.", ["id_produto" => $idProduto], 201);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (file_exists($caminhoArquivo)) {
        unlink($caminhoArquivo);
    }
    jsonResponse(false, "Erro ao salvar produto: " . $e->getMessage(), null, 500);
}
