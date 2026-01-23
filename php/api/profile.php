<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Verifica Autenticazione
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Accesso negato"]);
    exit;
}

$db = getDbConnection();
$currentUserEmail = $_SERVER['PHP_AUTH_USER'];
$method = $_SERVER['REQUEST_METHOD'];

try {
    // Recupero ID, nickname e ruolo dell'utente corrente
    $stmtUser = $db->prepare("SELECT id, nickname, role, profile_picture FROM users WHERE email = ?");
    $stmtUser->execute([$currentUserEmail]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        header('HTTP/1.0 404 Not Found');
        exit;
    }

    if ($method === 'GET') {
        // Restituisce i dati del profilo
        echo json_encode($user);

    } else {
        // Rifiutiamo PUT, POST e DELETE su questo endpoint
        header('HTTP/1.1 405 Method Not Allowed');
        echo json_encode(["error" => "Metodo non consentito"]);
    }

} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["error" => "Errore server: " . $e->getMessage()]);
}
?>