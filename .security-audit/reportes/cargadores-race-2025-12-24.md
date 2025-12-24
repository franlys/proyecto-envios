# 🔒 AUDITORÍA: Race Conditions en Controllers de Almacén

**Fecha**: 2025-12-24
**Auditor**: Gemini Pro
**Archivos Auditados**: 
- `backend/src/controllers/cargadoresController.js` (870 líneas)
- `backend/src/controllers/almacenUsaController.js` (936 líneas)

---

## 📊 Resumen Ejecutivo

- **Funciones auditadas**: 8
- **Race Conditions encontradas**: 2 (Medio/Alto Impacto)
- **Score de Seguridad de Concurrencia**: 75/100
- **Estado Global**: 🟡 REQUIERE ATENCIÓN

---

## 🚨 Vulnerabilidades Detectadas

### Vulnerabilidad #1: Race Condition en Cierre de Carga (`cargadoresController.js`)

**Severidad**: 🟠 **MEDIA**
**Función**: `finalizarCarga` (líneas 706-810)
**CWE**: CWE-362 (Concurrent Execution using Shared Resource)

**Problema**:
La función lee el documento de la ruta, verifica si el estado es `'en_carga'`, y luego realiza actualizaciones asíncronas. Entre la lectura (`get`) y la escritura (`update`), el estado podría cambiar (ej. por otro proceso de finalización o cancelación), llevando a escrituras redundantes o estados inconsistentes en el historial.

**Código Vulnerable**:
```javascript
// Línea 717
const doc = await rutaRef.get(); // Lectura
// ... validaciones ...
// Línea 778
await rutaRef.update({ estado: 'cargada' ... }); // Escritura fuera de transacción
// Línea 794
const batch = db.batch(); // Batch NO protege contra lecturas concurrentes del estado de la ruta
```

**Escenario de Explotación**:
1. Usuario A envía "Finalizar Carga". Servidor lee estado "en_carga".
2. Usuario B envía "Finalizar Carga" milisegundos después. Servidor lee estado "en_carga" (A aún no escribe).
3. Ambos usuarios pasan la validación.
4. Se ejecutan DOS actualizaciones de estado y se duplican entradas en el historial de la ruta.

**Corrección Recomendada**:
Usar `db.runTransaction` para asegurar atomicidad entre la lectura del estado y la actualización.

---

### Vulnerabilidad #2: Race Condition en Cierre de Contenedor (`almacenUsaController.js`)

**Severidad**: 🔴 **ALTA** (Riesgo de Doble Notificación Masiva)
**Función**: `cerrarContenedor` (líneas 533-753)

**Problema**:
Similar al anterior, pero con un impacto mayor. Al cerrar un contenedor, se dispara una cadena de notificaciones (Email + WhatsApp) a todos los remitentes. Si dos administradores cierran el contenedor simultáneamente, el sistema procesará la lógica dos veces, enviando **doble notificación** a docenas de clientes y registrando doble historial.

**Código Vulnerable**:
```javascript
// Línea 541
const contenedorDoc = await contenedorRef.get();
// ... checa contenedor.estado === 'abierto' ...
// Línea 585
await contenedorRef.update({ estado: ESTADOS_CONTENEDOR.EN_TRANSITO ... });
// Línea 660
// Bucle de notificaciones a TODOS los remitentes
```

**Impacto**:
- Spam a clientes (mensajes duplicados de "Tu paquete va en camino").
- Confusión en el historial del contenedor.
- Desperdicio de cuota de API de WhatsApp/Email.

**Corrección Recomendada**:
Encapsular la verificación de estado y el cambio a `EN_TRANSITO` dentro de una transacción. Solo si la transacción es exitosa, proceder con las notificaciones.

---

## ✅ Funciones Seguras (Ejemplos de Buen Código)

### Función: `confirmarItemCargado` (cargadoresController.js)
**Estado**: ✅ SEGURA
**Razón**: Usa `db.runTransaction` (L371) perfectamente. Lee la ruta, valida estado, verifica duplicados en array, y actualiza, todo atómicamente.

### Función: `agregarFactura` (almacenUsaController.js)
**Estado**: ✅ SEGURA
**Razón**: Implementa `db.runTransaction` (L159) para coordinar la lectura del contenedor y la factura, evitando que una factura se agregue a un contenedor cerrado o que se duplique.

---

## 🎯 Plan de Corrección

1.  **Refactorizar `finalizarCarga`**: Envolver lógica en transacción.
2.  **Refactorizar `cerrarContenedor`**: Mover el cambio de estado a transacción. Ejecutar notificaciones SOLO si la transacción retorna éxito.

---
*Reporte generado por Gemini Pro Security Auditor*
