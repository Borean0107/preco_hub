<?php
require_once __DIR__ . "/../middleware/admin.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

$produtoId = isset($_POST["id_produto"]) ? filter_var($_POST["id_produto"], FILTER_VALIDATE_INT) : null;
$editando = $produtoId && $produtoId > 0;
$nome = trim($_POST["nome"] ?? "");
$marca = trim($_POST["marca"] ?? "");
$categoria = trim($_POST["categoria"] ?? "");
$mercadoNomes = $_POST["mercadoNome"] ?? [];
$mercadoPrecos = $_POST["mercadoPreco"] ?? [];
$imagemUpload = $_FILES["imagemProduto"] ?? null;

if (!$nome || !$marca || !$categoria || !is_array($mercadoNomes) || !is_array($mercadoPrecos) || count($mercadoNomes) === 0 || count($mercadoPrecos) === 0) {
    jsonResponse(false, "Preencha todos os campos obrigatorios.", null, 400);
}

$mercados = [];

foreach ($mercadoNomes as $index => $nomeMercado) {
    $nomeMercado = trim($nomeMercado);
    $precoMercado = isset($mercadoPrecos[$index]) ? $mercadoPrecos[$index] : null;
    $precoMercado = filter_var($precoMercado, FILTER_VALIDATE_FLOAT);

    if (!$nomeMercado || $precoMercado === false || $precoMercado <= 0) {
        jsonResponse(false, "Informe nomes e precos validos para todos os mercados.", null, 400);
    }

    $mercados[] = [
        "nome" => $nomeMercado,
        "preco" => $precoMercado
    ];
}

if (!$editando && (!$imagemUpload || $imagemUpload["error"] !== UPLOAD_ERR_OK)) {
    jsonResponse(false, "Selecione uma imagem valida para o produto.", null, 400);
}

$allowedMimeTypes = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
];

$temNovaImagem = $imagemUpload && $imagemUpload["error"] === UPLOAD_ERR_OK;
$caminhoArquivo = null;
$imagemProduto = null;

if ($temNovaImagem) {
    if ($imagemUpload["size"] > 2 * 1024 * 1024) {
        jsonResponse(false, "A imagem deve ter no maximo 2MB.", null, 400);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $imagemUpload["tmp_name"]);
    finfo_close($finfo);

    if (!isset($allowedMimeTypes[$mimeType])) {
        jsonResponse(false, "Formato de imagem invalido. Use JPG, PNG ou WEBP.", null, 400);
    }

    $uploadDir = __DIR__ . "/../../assets/img/produtos/";
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
        jsonResponse(false, "Nao foi possivel criar diretorio de upload.", null, 500);
    }

    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', mb_strtolower(pathinfo($imagemUpload["name"], PATHINFO_FILENAME)));
    $extension = $allowedMimeTypes[$mimeType];
    $nomeArquivo = $safeName . '_' . time() . '.' . $extension;
    $caminhoArquivo = $uploadDir . $nomeArquivo;

    if (!move_uploaded_file($imagemUpload["tmp_name"], $caminhoArquivo)) {
        jsonResponse(false, "Falha ao salvar a imagem do produto.", null, 500);
    }

    $imagemProduto = "assets/img/produtos/" . $nomeArquivo;
}

try {
    $pdo->beginTransaction();

    $produtoAtual = null;

    if ($editando) {
        $stmtAtual = $pdo->prepare("SELECT id_produto, imagem_produto FROM produto WHERE id_produto = ?");
        $stmtAtual->execute([$produtoId]);
        $produtoAtual = $stmtAtual->fetch(PDO::FETCH_ASSOC);

        if (!$produtoAtual) {
            $pdo->rollBack();
            if ($caminhoArquivo && file_exists($caminhoArquivo)) {
                unlink($caminhoArquivo);
            }
            jsonResponse(false, "Produto nao encontrado.", null, 404);
        }
    }

    $stmtProdutoExistente = $pdo->prepare("SELECT id_produto FROM produto WHERE nome_produto = ? AND id_produto <> ?");
    $stmtProdutoExistente->execute([$nome, $editando ? $produtoId : 0]);
    $produtoExistenteId = $stmtProdutoExistente->fetchColumn();

    if ($produtoExistenteId) {
        $pdo->rollBack();
        if ($caminhoArquivo && file_exists($caminhoArquivo)) {
            unlink($caminhoArquivo);
        }
        jsonResponse(false, "Produto ja cadastrado.", null, 409);
    }

    $stmt = $pdo->prepare("SELECT id_categoria FROM categoria WHERE nome_categoria = ?");
    $stmt->execute([$categoria]);
    $categoriaExistente = $stmt->fetchColumn();

    if ($categoriaExistente) {
        $idCategoria = (int) $categoriaExistente;
    } else {
        $stmt = $pdo->prepare("INSERT INTO categoria (nome_categoria) VALUES (?)");
        $stmt->execute([$categoria]);
        $idCategoria = (int) $pdo->lastInsertId();
    }

    $stmt = $pdo->prepare("SELECT id_fabricante FROM fabricante WHERE nome_fabricante = ?");
    $stmt->execute([$marca]);
    $fabricanteExistente = $stmt->fetchColumn();

    if ($fabricanteExistente) {
        $idFabricante = (int) $fabricanteExistente;
    } else {
        $stmt = $pdo->prepare("INSERT INTO fabricante (nome_fabricante) VALUES (?)");
        $stmt->execute([$marca]);
        $idFabricante = (int) $pdo->lastInsertId();
    }

    $descricaoProduto = "Produto cadastrado pelo sistema.";

    if ($editando) {
        $imagemFinal = $imagemProduto ?: $produtoAtual["imagem_produto"];
        $stmt = $pdo->prepare(
            "UPDATE produto SET nome_produto = ?, descricao_produto = ?, imagem_produto = ?, fk_categoria_id_categoria = ?, fk_fabricante_id_fabricante = ? WHERE id_produto = ?"
        );
        $stmt->execute([$nome, $descricaoProduto, $imagemFinal, $idCategoria, $idFabricante, $produtoId]);
        $idProduto = (int) $produtoId;
    } else {
        $stmt = $pdo->prepare(
            "INSERT INTO produto (nome_produto, descricao_produto, imagem_produto, codigo_barras_produto, fk_categoria_id_categoria, fk_fabricante_id_fabricante) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$nome, $descricaoProduto, $imagemProduto, null, $idCategoria, $idFabricante]);
        $idProduto = (int) $pdo->lastInsertId();
    }

    $stmtMercado = $pdo->prepare("SELECT id_mercado FROM mercado WHERE nome_mercado = ?");
    $stmtInserirMercado = $pdo->prepare("INSERT INTO mercado (nome_mercado) VALUES (?)");
    $stmtInsertPreco = $pdo->prepare(
        "INSERT INTO mercado_produto (fk_mercado_id_mercado, fk_produto_id_produto, preco_produto_mercado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE preco_produto_mercado = VALUES(preco_produto_mercado)"
    );

    if ($editando) {
        $stmtRemoverPrecos = $pdo->prepare("DELETE FROM mercado_produto WHERE fk_produto_id_produto = ?");
        $stmtRemoverPrecos->execute([$idProduto]);
    }

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

    if ($editando && $imagemProduto && !empty($produtoAtual["imagem_produto"])) {
        $caminhoImagemAnterior = __DIR__ . "/../../" . $produtoAtual["imagem_produto"];
        if (file_exists($caminhoImagemAnterior)) {
            @unlink($caminhoImagemAnterior);
        }
    }

    jsonResponse(true, $editando ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.", ["id_produto" => $idProduto], $editando ? 200 : 201);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($caminhoArquivo && file_exists($caminhoArquivo)) {
        unlink($caminhoArquivo);
    }
    jsonResponse(false, "Erro ao salvar produto: " . $e->getMessage(), null, 500);
}
