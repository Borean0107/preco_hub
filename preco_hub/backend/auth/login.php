<?php

require_once __DIR__ . "/../config/session.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Método não permitido.", null, 405);
}

$email = strtolower(trim($_POST["email"] ?? ""));
$senha = trim($_POST["senha"] ?? "");

if (!$email || !$senha) {
    jsonResponse(false, "Preencha email e senha.", null, 400);
}

$stmt = $pdo->prepare("SELECT id_usuario, nome_usuario, email_usuario, senha_usuario FROM usuario WHERE email_usuario = ? LIMIT 1");
$stmt->execute([$email]);

$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$usuario || !password_verify($senha, $usuario["senha_usuario"])) {
    jsonResponse(false, "Email ou senha inválidos", null, 401);
}

$_SESSION["usuario_id"] = $usuario["id_usuario"];
$_SESSION["usuario_nome"] = $usuario["nome_usuario"];
$_SESSION["usuario_email"] = $usuario["email_usuario"];

jsonResponse(true, "Login realizado com sucesso.", [
    "id" => $usuario["id_usuario"],
    "nome" => $usuario["nome_usuario"],
    "email" => $usuario["email_usuario"]
]);
