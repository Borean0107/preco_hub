<?php
/**
 * Validador - Preço Hub
 * Classe responsável por validar inputs de forma reutilizável
 */

class Validator {
    private static $errors = [];
    
    public static function reset() {
        self::$errors = [];
    }
    
    public static function getErrors() {
        return self::$errors;
    }
    
    public static function hasErrors() {
        return count(self::$errors) > 0;
    }
    
    public static function email($value) {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            self::$errors[] = "Email inválido";
            return false;
        }
        return true;
    }
    
    public static function required($value, $fieldName = "Campo") {
        if (empty(trim($value))) {
            self::$errors[] = "$fieldName é obrigatório";
            return false;
        }
        return true;
    }
    
    public static function minLength($value, $length, $fieldName = "Campo") {
        if (strlen(trim($value)) < $length) {
            self::$errors[] = "$fieldName deve ter no mínimo $length caracteres";
            return false;
        }
        return true;
    }
    
    public static function maxLength($value, $length, $fieldName = "Campo") {
        if (strlen(trim($value)) > $length) {
            self::$errors[] = "$fieldName não pode ter mais de $length caracteres";
            return false;
        }
        return true;
    }
    
    public static function float($value, $fieldName = "Campo") {
        if (!is_numeric($value) || !filter_var($value, FILTER_VALIDATE_FLOAT)) {
            self::$errors[] = "$fieldName deve ser um número válido";
            return false;
        }
        return true;
    }
    
    public static function floatGreaterThanZero($value, $fieldName = "Campo") {
        if (!self::float($value, $fieldName)) {
            return false;
        }
        if (floatval($value) <= 0) {
            self::$errors[] = "$fieldName deve ser maior que zero";
            return false;
        }
        return true;
    }
    
    public static function integer($value, $fieldName = "Campo") {
        if (!is_numeric($value) || intval($value) != $value) {
            self::$errors[] = "$fieldName deve ser um número inteiro";
            return false;
        }
        return true;
    }
}
