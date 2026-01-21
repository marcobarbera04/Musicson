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
        // Troviamo l'ID dell'utente loggato
        $stmtUser = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmtUser->execute([$currentUserEmail]);
        $userId = $stmtUser->fetchColumn();

        if (!$userId) throw new Exception("Utente non trovato");

        // Query aggiornata con i tuoi campi REALI (datetime, meeting_link)
        $sql = "SELECT 
                    a.id, 
                    a.datetime,  
                    a.meeting_link, 
                    t.nickname as teacher_name, 
                    t.profile_picture as teacher_image
                FROM appointments a
                JOIN users t ON a.teacher_id = t.id
                WHERE a.student_id = :my_id
                ORDER BY a.datetime ASC"; // Ordiniamo per data crescente
        
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