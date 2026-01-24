-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql_proj_web
-- Creato il: Gen 24, 2026 alle 22:01
-- Versione del server: 9.5.0
-- Versione PHP: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `Musicson_Lessons`
--

--
-- Dump dei dati per la tabella `appointments`
--

INSERT INTO `appointments` (`id`, `student_id`, `teacher_id`, `datetime`, `meeting_link`) VALUES
(21, 1, 2, '2026-01-26 17:00:00', 'https://meet.google.com/9e856fcee5'),
(23, 1, 3, '2026-01-28 14:00:00', 'https://meet.google.com/d6d9b0b29f'),
(24, 1, 3, '2026-01-27 15:00:00', 'https://meet.google.com/be81e8963f');

--
-- Dump dei dati per la tabella `availability`
--

INSERT INTO `availability` (`id`, `teacher_id`, `weekday`, `start_time`) VALUES
(34, 2, 1, '17:00:00'),
(35, 2, 1, '18:00:00'),
(39, 3, 2, '15:00:00'),
(38, 3, 3, '14:00:00'),
(36, 6, 1, '18:00:00'),
(37, 6, 4, '15:00:00');

--
-- Dump dei dati per la tabella `instruments`
--

INSERT INTO `instruments` (`id`, `name`) VALUES
(1, 'Chitarra'),
(2, 'Pianoforte'),
(3, 'Basso'),
(4, 'Batteria'),
(5, 'Flauto');

--
-- Dump dei dati per la tabella `roles`
--

INSERT INTO `roles` (`id`, `role`) VALUES
(1, 'student'),
(2, 'teacher');

--
-- Dump dei dati per la tabella `teacher_instruments`
--

INSERT INTO `teacher_instruments` (`teacher_id`, `instrument_id`) VALUES
(2, 1),
(2, 2),
(3, 3),
(3, 2),
(6, 1),
(7, 4),
(3, 1),
(8, 1),
(9, 1);

--
-- Dump dei dati per la tabella `users`
--

INSERT INTO `users` (`id`, `email`, `nickname`, `password`, `role`, `profile_picture`) VALUES
(1, 'marco@gmail.com', 'Marco', '$2y$10$Whhc6AHm8cpzjP/HyiYb/u1lo4aPdMyKoqgeWMO/sJGDmNjz20whu', 1, 'default.png'),
(2, 'bono@gmail.com', 'Bono', '$2y$10$0ZV4s8abn2tOb9YnSy7Whugov7xzNvDCoA5RsZ.x//A6mZhdT2Wza', 2, 'default.png'),
(3, 'paul@gmail.com', 'PaulMcCartney', '$2y$10$YdUMic68wURdT3gddZW5lOXNnrYecL3vQmQ6YxaLzZs5aMHqClvuC', 2, 'default.png'),
(6, 'jhon@gmail.com', 'JhonLennon', '$2y$10$Jm8FI/HIEcONyJEOHKgNpO870C3E1q32LMqgmd/FOsgHiOpUKgkd.', 2, 'default.png'),
(7, 'ringo@gmail.com', 'RingoStar', '$2y$10$tqUuXHu5p7p.rge6pfnmLOcqEJ/hvdo4kHCOWzEat31SrF1iwMe/.', 2, 'default.png'),
(8, 'jimmy@gmail.com', 'JimmyPage', '$2y$10$o/gBjce4n6hyXVyY0PTtT.tW1WVy4Fy/2KQxeQeX5tpZiXpR9n1Ny', 2, 'default.png'),
(9, 'jack@gmail.com', 'JackWhite', '$2y$10$NnAF76y1.1.hvJN3j/1pI.AJTChjSzMlAv624UZ3qNKQAKXJPZqjC', 2, 'default.png');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
