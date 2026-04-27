<?php

session_start();

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Método não permitido.", null, 405);
}

$nome = trim($_POST["nome"] ?? "");
$email = trim($_POST["email"] ?? "");
$senha = trim($_POST["senha"] ?? "");

if (!$nome || !$email || !$senha) {
    jsonResponse(false, "Preencha todos os campos.", null, 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, "Email inválido", null, 400);
}

$stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE email_usuario = ?");
$stmt->execute([$email]);

if ($stmt->fetch()) {
    jsonResponse(false, "Este email já está cadastrado.", null, 409);
}

$senhaHash = password_hash($senha, PASSWORD_DEFAULT);

$sql = "INSERT INTO usuario (nome_usuario, email_usuario, senha_usuario, data_criacao_usuario) VALUES (?, ?, ?, NOW())";
$stmt = $pdo->prepare($sql);
$stmt->execute([$nome, $email, $senhaHash]);

jsonResponse(true, "Usuário cadastrado com sucesso", null, 201);