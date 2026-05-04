<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/lista.php";
require_once __DIR__ . "/../helpers/response.php";

$usuarioId = (int) $_SESSION["usuario_id"];
$listaId = obterListaUsuario($pdo, $usuarioId);

if (!$listaId) {
    jsonResponse(true, "Lista ja esta vazia.");
}

$stmtDelete = $pdo->prepare("
    DELETE FROM lista_produto
    WHERE fk_lista_id_lista = ?
");
$stmtDelete->execute([$listaId]);

jsonResponse(true, "Lista limpa com sucesso.");
