<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Verifichiamo se il server ha ricevuto gli header di autenticazione
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Autenticazione richiesta"]);
    exit;
}

$user_email = $_SERVER['PHP_AUTH_USER'];
$user_pass  = $_SERVER['PHP_AUTH_PW'];

$db = getDbConnection();

try {
    // Cerchiamo l'utente tramite email
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$user_email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Usiamo password_verify() che confronta la password in chiaro con l'hash nel DB.
    if ($user && password_verify($user_pass, $user['password'])) {
        // Login riuscito: restituiamo i dati utente (ma NON la password)
        echo json_encode([
            "id" => $user['id'],
            "nickname" => $user['nickname'],
            "role" => $user['role'],
            "status" => "Authenticated"
        ]);
    } else {
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(["error" => "Credenziali non valide"]);
    }
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["error" => "Errore interno"]);
}