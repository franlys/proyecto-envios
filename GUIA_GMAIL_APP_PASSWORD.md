# Cómo generar una "Contraseña de Aplicación" en Gmail

Para que el sistema pueda enviar correos usando tu cuenta de Gmail, Google requiere una contraseña especial (no tu contraseña normal). Sigue estos pasos:

## Paso 1: Activar la Verificación en 2 Pasos
*(Si ya la tienes activada, salta al Paso 2)*

1.  Ve a tu [Cuenta de Google](https://myaccount.google.com/).
2.  En el menú izquierdo, selecciona **Seguridad**.
3.  Baja hasta la sección "Cómo inicias sesión en Google".
4.  Haz clic en **Verificación en 2 pasos** y sigue las instrucciones para activarla (usando tu teléfono).

## Paso 2: Generar la Contraseña de Aplicación

1.  En la misma sección de **Seguridad** (o usando el buscador de arriba), busca **"Contraseñas de aplicaciones"**.
    *   *Nota: A veces Google esconde esta opción. Puedes entrar directo aquí: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)*
2.  Te pedirá tu contraseña normal para entrar.
3.  En "Nombre de la aplicación", escribe algo como: `Sistema Envios`.
4.  Haz clic en **Crear**.
5.  Google te mostrará una contraseña de 16 letras (ej. `abcd efgh ijkl mnop`).
6.  **Copia esa contraseña**. (No la pierdas, no podrás verla de nuevo).

## Paso 3: Configurar en tu Proyecto

Abre el archivo `.env` en la carpeta `backend` y agrega (o edita) estas líneas:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=pegas_aqui_la_contraseña_de_16_letras  # Sin espacios
EMAIL_FROM=tu_correo@gmail.com
```

> **Importante**: Pega la contraseña **sin espacios**. Aunque Google te la muestre con espacios, tú pégala toda junta.

¡Listo! Con esto el sistema podrá enviar correos.
