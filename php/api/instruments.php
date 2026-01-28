<?php
header('Content-Type: application/json');
require_once '../config/db.php';

// Controllo sicurezza sessione (richiesto anche per risorse pubbliche)
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Accesso negato"]);
    exit;
}

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Recupero tutti gli strumenti ordinati alfabeticamente
        $sql = "SELECT id, name FROM instruments ORDER BY name ASC";
        
        $stmt = $db->query($sql);
        $instruments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($instruments);

    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(["error" => "Errore caricamento strumenti: " . $e->getMessage()]);
    }
} else {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(["error" => "Metodo non supportato"]);
}
?>