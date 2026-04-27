<?php
/**
 * Configurações de Segurança - Preço Hub
 * Este arquivo contém constantes de segurança utilizadas em toda a aplicação
 */

// Constantes de Upload
define("MAX_UPLOAD_SIZE", 5 * 1024 * 1024); // 5MB
define("ALLOWED_MIME_TYPES", [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
]);

// Constantes de Validação
define("MAX_NOME_PRODUTO", 150);
define("MAX_NOME_MARCA", 120);
define("MAX_NOME_CATEGORIA", 100);
define("MAX_NOME_MERCADO", 120);

// Configuração de Sessão
ini_set("session.name", "PRECOHUB_SESSION");
ini_set("session.cookie_httponly", 1);
ini_set("session.cookie_secure", 0); // Mude para 1 em produção com HTTPS
ini_set("session.use_only_cookies", 1);
ini_set("session.cookie_samesite", "Lax");

// Erro Handling
error_reporting(E_ALL);
ini_set("display_errors", 0); // Nunca mostrar erros em produção
ini_set("log_errors", 1);
