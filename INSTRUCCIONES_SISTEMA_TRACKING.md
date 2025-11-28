# Instrucciones para Implementación del Nuevo Sistema de Tracking (Prefijos por Empresa)

Este documento detalla los pasos técnicos para migrar del sistema de tracking basado en fecha (`RC-YYYYMMDD-XXXX`) a un sistema lineal basado en prefijos únicos por empresa (`PRE-0001`).

## 1. Objetivo
Implementar números de rastreo únicos, lineales y cortos que identifiquen a la empresa y eviten colisiones.
*   **Formato:** `[PREFIJO]-[SECUENCIAL]`
*   **Ejemplo:** `LJU-0001`, `LJU-0002`...

## 2. Base de Datos (Firestore)

### A. Colección `companies`
Cada documento de empresa debe tener un nuevo campo **inmutable**:
```javascript
{
  name: "Logística Juan",
  trackingPrefix: "LJU", // NUEVO: 3 letras mayúsculas únicas
  currentTrackingNumber: 0 // NUEVO: Contador atómico para esta empresa
  // ... otros campos
}
```

### B. Estrategia de Contadores
En lugar de una colección global `_counters`, usaremos un campo `currentTrackingNumber` dentro del propio documento de la empresa. Esto facilita la gestión y evita condiciones de carrera globales, limitando el bloqueo solo a la empresa que está generando el envío.

## 3. Backend (`backend/src`)

### A. Modificar `createCompany` (`controllers/companyController.js`)
Al crear una empresa, se debe generar automáticamente su prefijo.

**Lógica de Generación:**
1.  Tomar las 3 primeras letras del nombre de la empresa (o las iniciales).
2.  Convertir a mayúsculas.
3.  Verificar si ya existe en la BD.
4.  Si existe, intentar variaciones (ej: `LJU` -> `LJX` -> `LJA`).
5.  Guardar `trackingPrefix` y `currentTrackingNumber: 0`.

### B. Actualizar `TrackingGenerator.js` (o `Recoleccion.js`)
Reemplazar la lógica actual de `generarCodigoTracking`.

**Nueva Lógica:**
```javascript
export const generarCodigoTracking = async (companyId) => {
  return await db.runTransaction(async (transaction) => {
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await transaction.get(companyRef);
    
    if (!companyDoc.exists) throw new Error("Empresa no encontrada");
    
    const data = companyDoc.data();
    const prefix = data.trackingPrefix || "GEN"; // Fallback si es antigua
    const nextNumber = (data.currentTrackingNumber || 0) + 1;
    
    // Actualizar contador
    transaction.update(companyRef, { currentTrackingNumber: nextNumber });
    
    // Formatear: PRE-0001
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${prefix}-${paddedNumber}`;
  });
};
```

## 4. Frontend (Opcional por ahora)
*   Mostrar el `trackingPrefix` en el perfil de la empresa (solo lectura).

## 5. Plan de Ejecución (Paso a Paso)

1.  **[ ] Actualizar Controlador de Empresas:**
    *   Modificar `createCompany` para generar y guardar `trackingPrefix`.
    *   Crear un script o endpoint temporal para asignar prefijos a las empresas YA existentes (Migración).

2.  **[ ] Actualizar Generación de Tracking:**
    *   Modificar `backend/src/models/Recoleccion.js` (función `generarCodigoTracking`).
    *   Implementar la transacción de Firestore para garantizar unicidad y secuencia.

3.  **[ ] Pruebas:**
    *   Crear una recolección y verificar que el tracking sea `PRE-0001`.
    *   Crear una segunda y verificar `PRE-0002`.
