<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Accetta solo metodo POST per creazione risorse
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(["error" => "Metodo non supportato"]);
    exit;
}

// Decodifica JSON dal corpo della richiesta
$input = json_decode(file_get_contents('php://input'), true);

// Pulizia input rimuovendo spazi vuoti
$nickname = trim($input['nickname'] ?? '');
$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

// Verifica che i campi obbligatori non siano vuoti
if (empty($nickname) || empty($email) || empty($password)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(["error" => "Dati mancanti o non validi (campi vuoti)."]);
    exit;
}

// Verifica validità formato email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(["error" => "Formato email non valido."]);
    exit;
}

$db = getDbConnection();

try {
    // Controllo esistenza email nel database per evitare duplicati
    $check = $db->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]); 
    if ($check->fetch()) {
        header('HTTP/1.1 409 Conflict');
        echo json_encode(["error" => "Email già registrata"]);
        exit;
    }

    // Creazione hash sicuro della password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT); 

    // Inserimento nuovo utente nel DB (Ruolo default: 1 = Studente)
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