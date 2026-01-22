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

if ($method === 'GET') {
    try {
        // Trovare ID e RUOLO dell'utente loggato
        $stmtUser = $db->prepare("SELECT id, role FROM users WHERE email = ?");
        $stmtUser->execute([$currentUserEmail]);
        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$user) throw new Exception("Utente non trovato");

        $userId = $user['id'];
        $role = $user['role']; // 1 = student, 2 = teacher
        
        if ($role == 2) { 
            // Cercare dove sono il teacher_id e prendo i dati dello STUDENT
            $sql = "SELECT 
                        a.id, 
                        a.datetime,  
                        a.meeting_link, 
                        u.nickname as partner_name,      -- nome Studente
                        u.profile_picture as partner_image -- foto Studente
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
                        u.nickname as partner_name,      -- nome Professore
                        u.profile_picture as partner_image -- foto Professore
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

    } catch (Exception $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(["error" => "Errore server: " . $e->getMessage()]);
    }
} else {
    header('HTTP/1.1 405 Method Not Allowed');
}