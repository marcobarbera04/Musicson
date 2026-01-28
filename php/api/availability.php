<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Verifica autenticazione
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    exit;
}

$db = getDbConnection();
$currentUserEmail = $_SERVER['PHP_AUTH_USER'];
$method = $_SERVER['REQUEST_METHOD'];

// Recupero dati utente per controlli di ruolo
$stmtUser = $db->prepare("SELECT id, role FROM users WHERE email = ?");
$stmtUser->execute([$currentUserEmail]);
$user = $stmtUser->fetch(PDO::FETCH_ASSOC);

// Blocco operazioni di modifica (POST/DELETE) se l'utente non è professore
if (($method === 'POST' || $method === 'DELETE') && $user['role'] != 2) {
    header('HTTP/1.1 403 Forbidden');
    echo json_encode(["error" => "Solo i professori possono modificare gli orari"]);
    exit;
}

if ($method === 'GET') {
    // Recupero slot orari disponibili per un professore specifico
    $teacher_id = $_GET['teacher_id'] ?? null;
    if (!$teacher_id) { echo json_encode([]); exit; }
    
    $stmt = $db->prepare("SELECT id, weekday, start_time FROM availability WHERE teacher_id = ? ORDER BY weekday, start_time");
    $stmt->execute([$teacher_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} elseif ($method === 'POST') {
    // Creazione nuovo slot orario
    $input = json_decode(file_get_contents('php://input'), true);

    // Validazione dati in ingresso
    if (!isset($input['weekday']) || !isset($input['start_time'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(["error" => "Dati mancanti"]);
        exit;
    }

    // Calcolo orari fine per verifica sovrapposizioni
    $newStart = $input['start_time'];
    $newEnd = date('H:i:s', strtotime($newStart . ' +1 hour'));

    try {
        // Verifica esistenza slot sovrapposti nel DB
        // Verifica se esiste già uno slot che si accavalla con il nuovo orario
        // start_time < new_end_time e end_time > new_start_time
        $sqlCheck = "SELECT COUNT(*) as count FROM availability 
                     WHERE teacher_id = :tid 
                     AND weekday = :wd 
                     AND (start_time < :new_end AND ADDTIME(start_time, '01:00:00') > :new_start)";
        
        $stmtCheck = $db->prepare($sqlCheck);
        $stmtCheck->execute([
            ':tid' => $user['id'],
            ':wd' => $input['weekday'],
            ':new_end' => $newEnd,
            ':new_start' => $newStart
        ]);

        $result = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($result['count'] > 0) {
            header('HTTP/1.1 409 Conflict'); // Errore conflitto
            echo json_encode(["error" => "Orario non valido: si sovrappone a uno slot esistente."]);
            exit;
        }

        // Inserimento nuovo slot se non ci sono conflitti
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
        // Gestione errore duplicato esatto (vincolo unique)
        if ($e->getCode() == 23000) {
            header('HTTP/1.1 409 Conflict'); 
            echo json_encode(["error" => "Hai già inserito questo orario esatto!"]);
        } else {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(["error" => "Errore DB: " . $e->getMessage()]);
        }
    }
} elseif ($method === 'DELETE') {
    // Rimozione slot orario
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        header('HTTP/1.1 400 Bad Request');
        exit;
    }

    // Cancellazione solo se lo slot appartiene al professore autenticato
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