<?php
/**
 * Logger - Preço Hub
 * Responsável por registrar eventos e erros na aplicação
 */

class Logger {
    private static $logFile = __DIR__ . "/../../logs/app.log";
    
    public static function init() {
        $logDir = dirname(self::$logFile);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
    }
    
    public static function error($message, $context = []) {
        self::log("ERROR", $message, $context);
    }
    
    public static function info($message, $context = []) {
        self::log("INFO", $message, $context);
    }
    
    public static function warning($message, $context = []) {
        self::log("WARNING", $message, $context);
    }
    
    private static function log($level, $message, $context = []) {
        self::init();
        
        $timestamp = date("Y-m-d H:i:s");
        $contextStr = !empty($context) ? " | " . json_encode($context) : "";
        $logEntry = "[$timestamp] [$level] $message$contextStr\n";
        
        @file_put_contents(self::$logFile, $logEntry, FILE_APPEND);
    }
}
