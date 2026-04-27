<?php

header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

session_start();
require_once __DIR__ . "/../helpers/response.php";

if (!isset($_SESSION["usuario_id"])) {
    jsonResponse(false, "Nenhuma sessão ativa.", null, 400);
}

session_unset();
session_destroy();
jsonResponse(true, "Logout realizado com sucesso."); 