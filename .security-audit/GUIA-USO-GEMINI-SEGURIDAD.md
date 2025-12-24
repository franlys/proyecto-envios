# 🛡️ Guía de Auditoría de Seguridad con Gemini

Esta guía explica cómo utilizar los prompts especializados generados para auditar tu código usando tu modelo actual de Gemini Pro en AnythingLLM o cualquier interfaz de chat.

## 📂 Archivos de Prompts Disponibles

| Archivo | Propósito | Cuándo usar |
|---------|-----------|-------------|
| `prompt-auth-audit.md` | **Seguridad, Roles y Sesiones** | Al modificar login, registro o middlewares. |
| `prompt-injection-audit.md` | **Hacking Ético (Inyecciones)** | Al crear endpoints nuevos o subida de archivos. |
| `prompt-business-logic-audit.md` | **Integridad Financiera** | Al tocar cálculos de dinero, rutas o pagos. |

## 🚀 Workflow de Auditoría Manual (Opción A)

1.  **Selecciona tu Objetivo**:
    - *Ejemplo*: Acabas de modificar `rutaController.js` y quieres verificar la seguridad financiera.

2.  **Prepara el Prompt**:
    - Abre `.security-audit/prompt-business-logic-audit.md`.
    - Copia todo el contenido.

3.  **Inicia la Sesión con Gemini**:
    - Pega el contenido del prompt en el chat.
    - **IMPORTANTE**: Añade al final: "Espero tu confirmación para pasar el código."

4.  **Audita el Código**:
    - Una vez Gemini confirme, copia el código de tu archivo (ej. `rutaController.js`).
    - Pégalo en el chat.
    - Analiza el reporte que te genera.

5.  **Aplica Correcciones**:
    - Si encuentra vulnerabilidades (ej. Race Conditions), pide a Gemini: "Genera el código corregido usando transacciones de Firestore".

## 🤖 Automatización (Opción C - Futuro)

Para automatizar esto, se puede configurar un script en Node.js que:
1.  Lea los archivos `.js` modificados en un commit.
2.  Lea el prompt adecuado según el tipo de archivo.
3.  Envíe ambos a la API de Gemini.
4.  Bloquee el commit si se detectan vulnerabilidades "CRITICAL".

---
*Generado por tu Asistente de Código en Gemini*
