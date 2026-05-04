<?php

require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/response.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    jsonResponse(false, "Metodo nao permitido.", null, 405);
}

$usuarioId = (int) $_SESSION["usuario_id"];
$senhaAtual = trim($_POST["senha_atual"] ?? "");
$novaSenha = trim($_POST["nova_senha"] ?? "");

if (!$senhaAtual || !$novaSenha) {
    jsonResponse(false, "Informe a senha atual e a nova senha.", null, 400);
}

if (strlen($novaSenha) < 4) {
    jsonResponse(false, "A nova senha deve ter pelo menos 4 caracteres.", null, 400);
}

$stmt = $pdo->prepare("SELECT senha_usuario FROM usuario WHERE id_usuario = ?");
$stmt->execute([$usuarioId]);
$senhaHashAtual = $stmt->fetchColumn();

if (!$senhaHashAtual || !password_verify($senhaAtual, $senhaHashAtual)) {
    jsonResponse(false, "Senha atual incorreta.", null, 400);
}

$novoHash = password_hash($novaSenha, PASSWORD_DEFAULT);

$stmtUpdate = $pdo->prepare("UPDATE usuario SET senha_usuario = ? WHERE id_usuario = ?");
$stmtUpdate->execute([$novoHash, $usuarioId]);

jsonResponse(true, "Senha alterada com sucesso.");
