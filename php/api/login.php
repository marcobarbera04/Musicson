<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Verifica presenza header Basic Auth
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Autenticazione richiesta"]);
    exit;
}

// Recupero credenziali inviate dal client
$user_email = $_SERVER['PHP_AUTH_USER'];
$user_pass  = $_SERVER['PHP_AUTH_PW'];

$db = getDbConnection();

try {
    // Ricerca utente nel database tramite email
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$user_email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verifica corrispondenza hash password
    if ($user && password_verify($user_pass, $user['password'])) {
        // Login riuscito restituisce dati utente (esclusa password)
        echo json_encode([
            "id" => $user['id'],
            "nickname" => $user['nickname'],
            "role" => $user['role'],
            "status" => "Authenticated"
        ]);
    } else {
        // Credenziali errate
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(["error" => "Credenziali non valide"]);
    }
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["error" => "Errore interno"]);
}
?>