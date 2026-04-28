<?php

$sessionDir = __DIR__ . "/../../storage/sessions";

if (!is_dir($sessionDir)) {
    mkdir($sessionDir, 0775, true);
}

if (is_dir($sessionDir) && is_writable($sessionDir)) {
    session_save_path($sessionDir);
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
