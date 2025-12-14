# 🚀 Instrucciones para Iniciar tu Stack de Automatización

Ya tienes configurado el archivo `docker-compose.yml` que instalará **n8n** y **Evolution API** automáticamente.

## Pasos para iniciar:

1.  Abre una terminal en esta carpeta (`proyecto-envios/automation`).
2.  Ejecuta el siguiente comando:
    ```powershell
    docker compose up -d
    ```
    *(Esto descargará las imágenes y prenderá los servidores. Puede tardar unos minutos la primera vez).*

3.  Una vez termine, abre en tu navegador:
    *   **n8n:** [http://localhost:5678](http://localhost:5678)
    *   **WhatsApp API:** [http://localhost:8080](http://localhost:8080)

## ¿Cómo conectar WhatsApp?
Cuando entres a `localhost:8080`, necesitarás usar la clave maestra que definimos en el archivo:
`429683C4C977415CAAFCCE10F7D57E11`

## Solución de Problemas
Si ves un error de "access denied", intenta ejecutar `docker logout` en tu terminal y prueba de nuevo, o asegúrate de tener internet estable.
