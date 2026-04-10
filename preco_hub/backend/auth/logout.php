<?php
session_start();
require_once __DIR__ . "/../helpers/response.php";
session_unset();
session_destroy();
jsonResponse(true, "Logout realizado com sucesso."); 