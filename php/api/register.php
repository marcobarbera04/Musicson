<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Accettare solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(["error" => "Metodo non supportato"]);
    exit;
}

// Leggere il JSON
$input = json_decode(file_get_contents('php://input'), true);

// RECUPERO E PULIZIA DATI (Trim server-side)
// Usiamo l'operatore ?? '' per evitare errori se la chiave non esiste proprio
$nickname = trim($input['nickname'] ?? '');
$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

// VALIDAZIONE ROBUSTA
// empty() restituisce true se la stringa è vuota, null, false o 0.
// Dato che abbiamo usato trim() sopra, se l'utente ha mandato "   ", ora è "" (vuoto).
if (empty($nickname) || empty($email) || empty($password)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(["error" => "Dati mancanti o non validi (campi vuoti)."]);
    exit;
}

// Controllo validità formato email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(["error" => "Formato email non valido."]);
    exit;
}

$db = getDbConnection();

try {
    // Controllare se l'email esiste già
    $check = $db->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]); // Usiamo la variabile pulita $email
    if ($check->fetch()) {
        header('HTTP/1.1 409 Conflict');
        echo json_encode(["error" => "Email già registrata"]);
        exit;
    }

    // Hash della password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT); // Usiamo $password pulita

    // Inserimento user (Ruolo 1 = Studente di default)
    $sql = "INSERT INTO users (email, nickname, password, role, profile_picture) VALUES (?, ?, ?, 1, 'default.png')";
    $stmt = $db->prepare($sql);
    $stmt->execute([$email, $nickname, $passwordHash]);

    header('HTTP/1.1 201 Created');
    echo json_encode(["message" => "Registrazione completata! Ora puoi fare login."]);

} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["error" => "Errore database: " . $e->getMessage()]);
}
?>