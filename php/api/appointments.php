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
    // Recupero ID e Ruolo dell'utente loggato
    $stmtUser = $db->prepare("SELECT id, role FROM users WHERE email = ?");
    $stmtUser->execute([$currentUserEmail]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(["error" => "Utente non trovato"]);
        exit;
    }

    $userId = $user['id'];
    $role = $user['role']; // 1 = studente, 2 = professore

    if ($method === 'GET') {
        
        if ($role == 2) { 
            // Se utente loggato professore: recupera gli studenti che hanno prenotato
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
            // Se utente loggato studente: recupera i propri appuntamenti
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
        // Lettura dati prenotazione in arrivo
        $input = json_decode(file_get_contents('php://input'), true);

        // Validazione presenza campi necessari
        if (!isset($input['teacher_id']) || !isset($input['datetime'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(["error" => "Dati mancanti (teacher_id o datetime)"]);
            exit;
        }

        try {
            // Generazione link meeting univoco
            $meetingLink = "https://meet.google.com/" . substr(md5(uniqid()), 0, 10);

            // Inserimento nuova prenotazione
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
            // Gestione errore se lo slot è già occupato (vincolo DB unique)
            if ($e->getCode() == 23000) {
                header('HTTP/1.1 409 Conflict');
                echo json_encode(["error" => "Slot già prenotato!"]);
            } else {
                header('HTTP/1.1 500 Internal Server Error');
                echo json_encode(["error" => "Errore DB: " . $e->getMessage()]);
            }
        }

    } elseif ($method === 'DELETE') {
        // Lettura ID prenotazione da cancellare
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['id'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(["error" => "ID prenotazione mancante"]);
            exit;
        }

        $appointmentId = $input['id'];

        // Verifica che la prenotazione appartenga all'utente loggato (studente o docente)
        $checkSql = "SELECT id FROM appointments WHERE id = ? AND (student_id = ? OR teacher_id = ?)";
        $stmtCheck = $db->prepare($checkSql);
        $stmtCheck->execute([$appointmentId, $userId, $userId]);
        
        if (!$stmtCheck->fetch()) {
             header('HTTP/1.1 403 Forbidden');
             echo json_encode(["error" => "Non hai i permessi per cancellare questa lezione."]);
             exit;
        }

        // Cancellazione effettiva della prenotazione
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