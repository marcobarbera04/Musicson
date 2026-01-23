<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Controllo Autenticazione
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Accesso negato"]);
    exit;
}

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$currentUserEmail = $_SERVER['PHP_AUTH_USER'];

try {
    // Trovare ID e RUOLO dell'utente loggato
    $stmtUser = $db->prepare("SELECT id, role FROM users WHERE email = ?");
    $stmtUser->execute([$currentUserEmail]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(["error" => "Utente non trovato"]);
        exit;
    }

    $userId = $user['id'];
    $role = $user['role']; // 1 = student, 2 = teacher

    if ($method === 'GET') {
        
        if ($role == 2) { 
            // Cercare dove sono il teacher_id e prendo i dati dello STUDENT
            $sql = "SELECT 
                        a.id, 
                        a.datetime,  
                        a.meeting_link, 
                        u.nickname as partner_name,
                        u.profile_picture as partner_image
                    FROM appointments a
                    JOIN users u ON a.student_id = u.id
                    WHERE a.teacher_id = :my_id
                    ORDER BY a.datetime ASC";
        } else {
            // Cerco dove sono lo student_id e prendo i dati del TEACHER
            $sql = "SELECT 
                        a.id, 
                        a.datetime,  
                        a.meeting_link, 
                        u.nickname as partner_name,
                        u.profile_picture as partner_image
                    FROM appointments a
                    JOIN users u ON a.teacher_id = u.id
                    WHERE a.student_id = :my_id
                    ORDER BY a.datetime ASC";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':my_id', $userId);
        $stmt->execute();
        
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($appointments);

    } 
    elseif ($method === 'POST') {
        // Lettura dati in arrivo
        $input = json_decode(file_get_contents('php://input'), true);

        // Validazione di base
        if (!isset($input['teacher_id']) || !isset($input['datetime'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(["error" => "Dati mancanti (teacher_id o datetime)"]);
            exit;
        }

        try {
            $meetingLink = "https://meet.google.com/" . substr(md5(uniqid()), 0, 10);

            $sql = "INSERT INTO appointments (student_id, teacher_id, datetime, meeting_link) 
                    VALUES (:student_id, :teacher_id, :datetime, :meeting_link)";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':student_id' => $userId,
                ':teacher_id' => $input['teacher_id'],
                ':datetime'   => $input['datetime'],
                ':meeting_link' => $meetingLink
            ]);

            http_response_code(201); 
            echo json_encode(["message" => "Prenotazione confermata!", "link" => $meetingLink]);

} catch (PDOException $e) {
    // Codice 23000 è la violazione di vincolo (Duplicate entry) in MySQL
    if ($e->getCode() == 23000) {
        header('HTTP/1.1 409 Conflict');
        echo json_encode(["error" => "Slot già prenotato!"]);
    } else {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(["error" => "Errore DB: " . $e->getMessage()]);
    }
}

    } elseif ($method === 'DELETE') {
        // Leggiamo il body della richiesta
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['id'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(["error" => "ID prenotazione mancante"]);
            exit;
        }

        $appointmentId = $input['id'];

        // Verifichiamo che questa prenotazione appartenga davvero all'utente loggato
        $checkSql = "SELECT id FROM appointments WHERE id = ? AND (student_id = ? OR teacher_id = ?)";
        $stmtCheck = $db->prepare($checkSql);
        $stmtCheck->execute([$appointmentId, $userId, $userId]);
        
        if (!$stmtCheck->fetch()) {
             header('HTTP/1.1 403 Forbidden');
             echo json_encode(["error" => "Non hai i permessi per cancellare questa lezione."]);
             exit;
        }

        // CANCELLAZIONE
        $sql = "DELETE FROM appointments WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $appointmentId]);

        echo json_encode(["message" => "Lezione cancellata con successo."]);
    } else {
        header('HTTP/1.1 405 Method Not Allowed');
        echo json_encode(["error" => "Metodo non supportato"]);
    }

} catch (Exception $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["error" => "Errore server: " . $e->getMessage()]);
}
?>