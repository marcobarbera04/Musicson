# Musicson - Piattaforma di Prenotazione Lezioni Musicali

Questa è una Single Page Application (SPA) realizzata con architettura RESTful Stateless per la gestione e prenotazione di lezioni di musica.

## Prerequisiti

* Docker
* Docker Compose

## Installazione e Avvio

### Avvio dei Container
Esegui il seguente comando nella root del progetto per costruire e avviare i container:

```bash
docker-compose up -d
```

### Creare Database 

* Crea il database chiamandolo Musicson_Lessons
* Utilizza il file Musicson_Lessons.sql per creare la struttura
* Importa il dump tramite il file Musicson_Lessons_data.sql