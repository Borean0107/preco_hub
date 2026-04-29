<?php

require_once __DIR__ . "/../config/session.php";
require_once __DIR__ . "/../helpers/response.php";

$adminEmail = "admin@gmail.com";
$usuarioEmail = strtolower($_SESSION["usuario_email"] ?? "");

if (!isset($_SESSION["usuario_id"])) {
    jsonResponse(false, "Usuario nao autenticado.", null, 401);
}

if ($usuarioEmail !== $adminEmail) {
    jsonResponse(false, "Acesso restrito ao administrador.", null, 403);
}
