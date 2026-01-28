<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Verifica autenticazione utente
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Accesso negato"]);
    exit;
}

$db = getDbConnection();
$currentUserEmail = $_SERVER['PHP_AUTH_USER'];
$method = $_SERVER['REQUEST_METHOD'];

try {
    // Recupero dati utente corrente basandosi sull'email autenticata
    $stmtUser = $db->prepare("SELECT id, nickname, role, profile_picture FROM users WHERE email = ?");
    $stmtUser->execute([$currentUserEmail]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        header('HTTP/1.0 404 Not Found');
        exit;
    }

    if ($method === 'GET') {
        echo json_encode($user);    // Invio dati del profilo in formato JSON
    } else {
        header('HTTP/1.1 405 Method Not Allowed');
        echo json_encode(["error" => "Metodo non consentito"]);
    }

} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["error" => "Errore server: " . $e->getMessage()]);
}
?>