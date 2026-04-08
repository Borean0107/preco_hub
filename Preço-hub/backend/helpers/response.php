<?php

header("Content-type: application/json; charset=utf-8");

function jsonResponse($success, $message, $data = null, $status = 200){
    http_response_code($status);

    echo json_encode([
        "success"=> $success,
        "message"=> $message,
        "data" => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}