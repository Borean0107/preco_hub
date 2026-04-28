<?php

require_once __DIR__ . "/../config/session.php";
require_once __DIR__ . "/../helpers/response.php";

if (!isset($_SESSION["usuario_id"])) {
    jsonResponse(false, "Usuario nao autenticado.", null, 401);
}

jsonResponse(true, "Usuario autenticado.", [
    "id" => $_SESSION["usuario_id"],
    "nome" => $_SESSION["usuario_nome"] ?? "Usuario",
    "email" => $_SESSION["usuario_email"] ?? ""
]);
