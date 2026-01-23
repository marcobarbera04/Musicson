<?php
header('Content-Type: application/json');
require_once '../config/db.php';

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    exit;
}

$db = getDbConnection();
$currentUserEmail = $_SERVER['PHP_AUTH_USER'];
$method = $_SERVER['REQUEST_METHOD'];

// Recupero utente per controlli di sicurezza
$stmtUser = $db->prepare("SELECT id, role FROM users WHERE email = ?");
$stmtUser->execute([$currentUserEmail]);
$user = $stmtUser->fetch(PDO::FETCH_ASSOC);

// Solo i professori possono gestire la disponibilità (POST/DELETE)
if (($method === 'POST' || $method === 'DELETE') && $user['role'] != 2) {
    header('HTTP/1.1 403 Forbidden');
    echo json_encode(["error" => "Solo i professori possono modificare gli orari"]);
    exit;
}

if ($method === 'GET') {
    $teacher_id = $_GET['teacher_id'] ?? null;
    if (!$teacher_id) { echo json_encode([]); exit; }
    
    // Aggiungo anche l'ID dello slot per poterlo cancellare dopo
    $stmt = $db->prepare("SELECT id, weekday, start_time FROM availability WHERE teacher_id = ? ORDER BY weekday, start_time");
    $stmt->execute([$teacher_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} elseif ($method === 'POST') {
    // Creazione nuovo slot
    $input = json_decode(file_get_contents('php://input'), true);

    // Validazione di base
    if (!isset($input['weekday']) || !isset($input['start_time'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(["error" => "Dati mancanti"]);
        exit;
    }

    try {
        $sql = "INSERT INTO availability (teacher_id, weekday, start_time) 
                VALUES (:tid, :wd, :st)";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':tid' => $user['id'], 
            ':wd' => $input['weekday'],
            ':st' => $input['start_time']
        ]);
        
        http_response_code(201);
        echo json_encode(["message" => "Slot aggiunto"]);
    } catch (PDOException $e) {
        // Codice 23000 = Violazione vincolo Unique (Duplicato con weekday e start_time uguale)
        if ($e->getCode() == 23000) {
            header('HTTP/1.1 409 Conflict'); // 409 = Conflitto
            echo json_encode(["error" => "Hai già inserito questo orario!"]);
        } else {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(["error" => "Errore DB: " . $e->getMessage()]);
        }
    }

} elseif ($method === 'DELETE') {
    // Rimozione slot
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        header('HTTP/1.1 400 Bad Request');
        exit;
    }

    // Cancello solo se lo slot appartiene al professore loggato
    $sql = "DELETE FROM availability WHERE id = :id AND teacher_id = :tid";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':id' => $input['id'],
        ':tid' => $user['id']
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["message" => "Slot eliminato"]);
    } else {
        header('HTTP/1.1 404 Not Found');
        echo json_encode(["error" => "Slot non trovato o non tuo"]);
    }
}
?>