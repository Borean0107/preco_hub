<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

$usuarioId = $_SESSION["usuario_id"];
$idListaProduto = $_POST["id_lista_produto"] ?? "";
$comprado = (int) ($_POST["comprado"] ?? 0);

if (!$idListaProduto || strpos($idListaProduto, "-") === false) {
    jsonResponse(false, "Item invalido.", null, 400);
}

[$listaId, $produtoId] = explode("-", $idListaProduto);

$stmt = $pdo->prepare("
    UPDATE lista_produto
    SET comprado = ?
    WHERE fk_lista_id_lista = ?
      AND fk_produto_id_produto = ?
      AND fk_lista_id_lista IN (
          SELECT id_lista
          FROM lista
          WHERE fk_usuario_id_usuario = ?
      )
");
$stmt->execute([$comprado, (int) $listaId, (int) $produtoId, $usuarioId]);

jsonResponse(true, "Item atualizado com sucesso.");
