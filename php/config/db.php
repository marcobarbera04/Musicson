<?php
// Configurazione e gestione della connessione al database
function getDbConnection() {
    $host = "mysql_proj_web";
    $db_name = "Musicson_Lessons";
    $username = "musicson_user"; 
    $password = "musicson_password";

    try {
        $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username, $password); // Creazione istanza PDO per connessione MySQL
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); // Impostazione modalità errore per lanciare eccezioni
        return $conn;
    } catch(PDOException $exception) {
        // Gestione errore di connessione restituisce JSON 500 e interrompe esecuzione
        header('Content-Type: application/json');
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(["error" => "Connessione al database fallita"]);
        exit;
    }
}
?>