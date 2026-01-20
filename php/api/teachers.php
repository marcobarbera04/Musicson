<?php
// php/api/teachers.php

// Impostiamo l'header per dire al client che stiamo inviando dati JSON, non HTML.
header('Content-Type: application/json');

// Inclusione del file di configurazione del database
require_once '../config/db.php';

// 1. CONTROLLO AUTENTICAZIONE (STATELESS)
// In un'architettura REST, ogni richiesta deve autenticarsi da sola.
// Verifichiamo se il client ha inviato le credenziali Basic Auth.
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(["error" => "Accesso negato: Autenticazione richiesta"]);
    exit;
}

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// 2. GESTIONE DELLA RICHIESTA GET
if ($method === 'GET') {
    // Recuperiamo il parametro 'strumento' dalla query string (es. teachers.php?strumento=Chitarra)
    // Se non presente, sarà null (mostra tutti).
    $strumento = isset($_GET['strumento']) ? $_GET['strumento'] : null;

    try {
        // COSTRUZIONE DINAMICA DELLA QUERY SQL
        
        // Parte 1: Selezione base.
        // GROUP_CONCAT serve per unire più righe (più strumenti) in una sola stringa per professore.
        $sql = "SELECT 
                    u.id, 
                    u.nickname,
                    u.profile_picture, 
                    GROUP_CONCAT(i.name SEPARATOR ', ') as instruments 
                FROM users u
                JOIN teacher_instruments ti ON u.id = ti.teacher_id
                JOIN instruments i ON ti.instrument_id = i.id
                WHERE u.role = 2"; // Filtriamo solo gli utenti che sono Professori

        // Parte 2: Filtro Opzionale
        // Se l'utente sta cercando uno strumento specifico, aggiungiamo una condizione.
        if ($strumento) {
            // Usiamo una sottoquery per trovare i prof che insegnano quello strumento,
            // ma manteniamo la visualizzazione di TUTTI i loro strumenti nella card.
            $sql .= " AND u.id IN (
                        SELECT ti2.teacher_id 
                        FROM teacher_instruments ti2 
                        JOIN instruments i2 ON ti2.instrument_id = i2.id 
                        WHERE i2.name = :nome_strumento
                    )";
        }

        // Parte 3: Raggruppamento (Necessario per GROUP_CONCAT)
        $sql .= " GROUP BY u.id";
        
        // PREPARAZIONE DELLA QUERY (SICUREZZA)
        // Usiamo prepare() invece di query() per evitare SQL Injection.
        $stmt = $db->prepare($sql);

        // Se c'è un filtro, associamo il valore al placeholder :nome_strumento
        if ($strumento) {
            $stmt->bindParam(':nome_strumento', $strumento);
        }

        // Esecuzione e invio risultati
        $stmt->execute();
        $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($teachers);

    } catch (PDOException $e) {
        // Gestione errori server (restituiamo un JSON valido anche in caso di crash)
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(["error" => "Errore database: " . $e->getMessage()]);
    }
} else {
    // Se il client prova metodi non supportati (es. DELETE)
    header('HTTP/1.1 405 Method Not Allowed');
}