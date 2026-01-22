<?php
header('Content-Type: application/json');
require_once '../config/db.php';

if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('HTTP/1.0 401 Unauthorized');
    exit;
}

$db = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $teacher_id = $_GET['teacher_id'] ?? null;

    if (!$teacher_id) {
        echo json_encode([]);
        exit;
    }

    // Disponibilità del prof
    $stmt = $db->prepare("SELECT weekday, start_time, end_time FROM availability WHERE teacher_id = ?");
    $stmt->execute([$teacher_id]);
    $availability = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($availability);
}
?>