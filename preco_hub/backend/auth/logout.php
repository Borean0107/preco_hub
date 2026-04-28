<?php
require_once __DIR__ . "/../config/session.php";
require_once __DIR__ . "/../helpers/response.php";
session_unset();
session_destroy();
jsonResponse(true, "Logout realizado com sucesso.");
