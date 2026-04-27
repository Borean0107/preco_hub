<?php

session_start();

require_once __DIR__ . "/../helpers/response.php";

if (!isset($_SESSION["usuario_id"])) {
    jsonResponse(false, "Usuário não autenticado.", null, 401);
}