<?php

session_start();

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../helpers/Validator.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Método não permitido.", null, 405);
}

$nome = trim($_POST["nome"] ?? "");
$email = trim($_POST["email"] ?? "");
$senha = trim($_POST["senha"] ?? "");

// Validar inputs
Validator::reset();
Validator::required($nome, "Nome");
Validator::required($email, "Email");
Validator::required($senha, "Senha");
Validator::minLength($nome, 3, "Nome");
Validator::maxLength($nome, 120, "Nome");
Validator::email($email);
Validator::minLength($senha, 6, "Senha");

if (Validator::hasErrors()) {
    $errors = Validator::getErrors();
    jsonResponse(false, $errors[0], null, 400);
}

// Verificar se email já existe
$stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE email_usuario = ?");
$stmt->execute([$email]);

if ($stmt->fetch()) {
    jsonResponse(false, "Este email já está cadastrado.", null, 409);
}

// Inserir novo usuário
$senhaHash = password_hash($senha, PASSWORD_DEFAULT);

$sql = "INSERT INTO usuario (nome_usuario, email_usuario, senha_usuario, data_criacao_usuario) VALUES (?, ?, ?, NOW())";
$stmt = $pdo->prepare($sql);
$stmt->execute([$nome, $email, $senhaHash]);

jsonResponse(true, "Usuário cadastrado com sucesso", null, 201);