# 🔥 AUDITORÍA: Firestore Security Rules

**Fecha**: 2025-12-24
**Auditor**: Gemini Pro
**Archivo Auditado**: `firestore.rules`

---

## 📊 Resumen Ejecutivo

- **Colecciones analizadas**: 12+
- **Reglas Inseguras ("Open World")**: 10+
- **Estado Global**: 🔴 **CRÍTICO**

---

## 🚨 Vulnerabilidades Críticas

### 1. Reglas "Permitir Todo si Autenticado" (Insecure Direct Object References)
**Severidad**: 💀 **CRÍTICA**
**Ubicación**: Casi todo el archivo.

Ejemplos:
```javascript
// Línea 28
match /recolecciones/{recoleccionId} {
  allow read, write: if request.auth != null;
}
// Línea 33
match /contenedores/{contenedorId} {
  allow read, write: if request.auth != null;
}
```

**El Problema**:
La condición `if request.auth != null` SOLO verifica que el usuario esté logueado. **NO verifica**:
1.  **Company Isolation**: Un usuario de la "Empresa A" puede leer/borrar/editar recolecciones de la "Empresa B" simplemente conociendo (o adivinando) el ID.
2.  **Roles**: Un "Chofer" puede borrar un "Embarque" o editar su propio "Salario" (si estuviera en esa colección).
3.  **Propiedad**: Cualquiera puede modificar datos que no le pertenecen.

**Escenario de Ataque**:
Un usuario malicioso se registra (o loguea), obtiene su token, y usa un script para hacer `db.collection('recolecciones').doc('ID-AJENO').delete()`. Firestore lo permitirá porque `auth != null`.

---

## ✅ Solución: Reglas Robustas (Multi-Tenant + Roles)

Se debe implementar una función helper para validar la compañía y roles.

### Propuesta de Nuevas Reglas (Seguras):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- FUNCIONES HELPER ---
    
    // Verificar que el usuario pertenece a la misma compañía del documento
    function isSameCompany(resourceData) {
      return request.auth.token.companyId == resourceData.companyId;
    }
    
    // Verificar Rol
    function hasRole(roles) {
      // Asumiendo que el rol viaja en el Custom Claim del token (ideal) 
      // O leyendo el user doc (más costoso)
      return request.auth.token.rol in roles; 
    }

    // --- REGLAS ---

    // Usuarios: Solo leer/editar propio perfil
    match /usuarios/{userId} {
      allow read: if request.auth != null; // O restringir a misma compañía
      allow write: if request.auth.uid == userId;
    }

    // Recolecciones: Solo misma compañía
    match /recolecciones/{docId} {
       allow read: if request.auth != null && isSameCompany(resource.data);
       allow create: if request.auth != null && request.resource.data.companyId == request.auth.token.companyId;
       allow update, delete: if request.auth != null 
                             && isSameCompany(resource.data)
                             && hasRole(['admin_general', 'super_admin', 'secretaria']); 
    }

    // Contenedores: Solo misma compañía
    match /contenedores/{docId} {
       allow read: if request.auth != null && isSameCompany(resource.data);
       allow write: if request.auth != null 
                    && isSameCompany(resource.data)
                    && hasRole(['admin_general', 'almacen_usa']);
    }
    
    // ... aplicar patrón similar a rutas, embarques, etc.
  }
}
```

**Acción Inmediata**:
Es urgente reemplazar las reglas `allow write: if request.auth != null` por validaciones de `companyId` como mínimo.

---
*Reporte generado por Gemini Pro Security Auditor*
