<?php
// Imposta l'header per risposta in formato JSON
header('Content-Type: application/json');

// Include file di configurazione DB
require_once '../config/db.php';

// Verifica presenza credenziali Basic Auth
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Accesso negato: Autenticazione richiesta"]);
    exit;
}

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Gestione richiesta GET per recupero lista professori
if ($method === 'GET') {
    // Recupera parametro opzionale 'strumento' dalla query string
    $strumento = isset($_GET['strumento']) ? $_GET['strumento'] : null;

    try {
        // Query base: seleziona utenti con ruolo professore e concatena i loro strumenti 
        $sql = "SELECT 
                    u.id, 
                    u.nickname,
                    u.profile_picture, 
                    GROUP_CONCAT(i.name SEPARATOR ', ') as instruments 
                FROM users u
                JOIN teacher_instruments ti ON u.id = ti.teacher_id
                JOIN instruments i ON ti.instrument_id = i.id
                WHERE u.role = 2"; 

        // Se presente filtro strumento, aggiunge condizione alla query (es. teachers.php?strumento=Chitarra)
        if ($strumento) {
            $sql .= " AND u.id IN (
                        SELECT ti2.teacher_id 
                        FROM teacher_instruments ti2 
                        JOIN instruments i2 ON ti2.instrument_id = i2.id 
                        WHERE i2.name = :nome_strumento
                    )";
        }

        // Raggruppa per ID utente per funzionamento GROUP_CONCAT
        $sql .= " GROUP BY u.id";
        
        $stmt = $db->prepare($sql);

        // Associa parametro filtro se presente
        if ($strumento) {
            $stmt->bindParam(':nome_strumento', $strumento);
        }

        // Esegue query e invia risultati JSON
        $stmt->execute();
        $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($teachers);

    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(["error" => "Errore database: " . $e->getMessage()]);
    }
} else {
    // Gestione metodo non supportato
    header('HTTP/1.1 405 Method Not Allowed');
}
?>