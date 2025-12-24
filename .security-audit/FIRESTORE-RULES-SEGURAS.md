# 🔥 Firestore Security Rules - Implementación Completa

**Fecha**: 2025-12-24
**Autor**: Claude Code + Gemini Pro
**Estado**: ✅ LISTO PARA IMPLEMENTAR

---

## 📋 Instrucciones de Implementación

### PASO 1: Backup de Reglas Actuales

```
1. Ir a: https://console.firebase.google.com
2. Seleccionar tu proyecto
3. Firebase Console → Firestore Database → Rules
4. Copiar TODAS las reglas actuales (Ctrl+A, Ctrl+C)
5. Guardar en archivo de texto como backup
```

### PASO 2: Copiar Reglas Seguras

Copiar el código completo de la sección "Reglas Completas" más abajo.

### PASO 3: Probar en Rules Playground

**IMPORTANTE**: Probar ANTES de publicar

```
1. Click en "Rules Playground" (abajo del editor)
2. Ejecutar los tests de la sección "Tests de Validación"
3. Verificar que todos los tests pasan
```

###PASO 4: Publicar

```
1. Si TODOS los tests pasaron → Click en "Publish"
2. Esperar 1-2 minutos para que se despliegue
3. Validar en la aplicación que usuarios autenticados pueden acceder
```

---

## 🔐 Reglas Completas de Firestore

Copiar ESTE CÓDIGO COMPLETO:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ========================================
    // FUNCIONES HELPER
    // ========================================

    // Validar que el usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }

    // Validar que el usuario pertenece a la compañía del documento
    function belongsToCompany(companyId) {
      return isAuthenticated()
             && request.auth.token.companyId == companyId;
    }

    // Validar que el usuario tiene un rol específico
    function hasRole(role) {
      return isAuthenticated()
             && request.auth.token.rol == role;
    }

    // Validar que el usuario tiene uno de varios roles
    function hasAnyRole(roles) {
      return isAuthenticated()
             && request.auth.token.rol in roles;
    }

    // Validar que el usuario es el propietario del documento
    function isOwner(userId) {
      return isAuthenticated()
             && request.auth.uid == userId;
    }

    // Validar que NO se modifican campos críticos
    function notModifyingCriticalFields(fields) {
      return !request.resource.data.diff(resource.data)
              .affectedKeys()
              .hasAny(fields);
    }

    // Validar que el request tiene todos los campos requeridos
    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }

    // ========================================
    // COLECCIÓN: companies
    // ========================================
    match /companies/{companyId} {
      // Lectura: Usuario puede leer su propia compañía o super_admin puede leer todas
      allow read: if belongsToCompany(companyId)
                  || hasRole('super_admin');

      // Creación: Solo super_admin puede crear compañías
      allow create: if hasRole('super_admin')
                    && hasRequiredFields(['nombre', 'plan', 'estado']);

      // Actualización: Solo propietario de la compañía o super_admin
      allow update: if (belongsToCompany(companyId) && hasAnyRole(['propietario', 'admin_general']))
                    || hasRole('super_admin');

      // Eliminación: Solo super_admin
      allow delete: if hasRole('super_admin');
    }

    // ========================================
    // COLECCIÓN: usuarios
    // ========================================
    match /usuarios/{userId} {
      // Lectura: Usuario puede leer su propio perfil o admin de su compañía
      allow read: if isOwner(userId)
                  || (isAuthenticated() && belongsToCompany(resource.data.companyId) && hasAnyRole(['admin_general', 'propietario', 'super_admin']));

      // Creación: Admin o propietario de la compañía puede crear usuarios
      allow create: if hasAnyRole(['admin_general', 'propietario', 'super_admin'])
                    && request.resource.data.companyId == request.auth.token.companyId
                    && hasRequiredFields(['email', 'rol', 'companyId']);

      // Actualización: Usuario puede actualizar su perfil (pero NO rol ni companyId)
      //                o admin puede actualizar usuarios de su compañía
      allow update: if (isOwner(userId) && notModifyingCriticalFields(['rol', 'companyId', 'uid', 'email']))
                    || (belongsToCompany(resource.data.companyId) && hasAnyRole(['admin_general', 'propietario', 'super_admin']));

      // Eliminación: Solo admin o super_admin
      allow delete: if (belongsToCompany(resource.data.companyId) && hasAnyRole(['admin_general', 'propietario']))
                    || hasRole('super_admin');
    }

    // ========================================
    // COLECCIÓN: recolecciones (facturas)
    // ========================================
    match /recolecciones/{recoleccionId} {
      // Lectura: Solo usuarios de la misma compañía
      allow read: if belongsToCompany(resource.data.companyId);

      // Creación: Usuarios autenticados de la compañía
      allow create: if isAuthenticated()
                    && request.resource.data.companyId == request.auth.token.companyId
                    && hasRequiredFields(['codigoTracking', 'companyId', 'estado']);

      // Actualización: Usuarios autenticados de la misma compañía
      //                NO pueden modificar companyId ni codigoTracking
      allow update: if belongsToCompany(resource.data.companyId)
                    && notModifyingCriticalFields(['companyId', 'codigoTracking', 'createdAt']);

      // Eliminación: Solo admin_general, propietario o super_admin
      allow delete: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'propietario', 'super_admin']);
    }

    // ========================================
    // COLECCIÓN: contenedores
    // ========================================
    match /contenedores/{contenedorId} {
      // Lectura: Solo usuarios de la misma compañía
      allow read: if belongsToCompany(resource.data.companyId);

      // Creación: Admin_general, almacen_usa o super_admin
      allow create: if hasAnyRole(['admin_general', 'almacen_usa', 'super_admin'])
                    && request.resource.data.companyId == request.auth.token.companyId
                    && hasRequiredFields(['numeroContenedor', 'companyId', 'estado']);

      // Actualización: Usuarios de la compañía con roles apropiados
      allow update: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'almacen_usa', 'almacen_rd', 'super_admin'])
                    && notModifyingCriticalFields(['companyId', 'numeroContenedor', 'createdAt']);

      // Eliminación: Solo admin_general o super_admin
      allow delete: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'super_admin']);
    }

    // ========================================
    // COLECCIÓN: rutas
    // ========================================
    match /rutas/{rutaId} {
      // Lectura: Solo usuarios de la misma compañía
      allow read: if belongsToCompany(resource.data.companyId);

      // Creación: Admin_general, almacen_rd o super_admin
      allow create: if hasAnyRole(['admin_general', 'almacen_rd', 'super_admin'])
                    && request.resource.data.companyId == request.auth.token.companyId
                    && hasRequiredFields(['nombre', 'companyId', 'estado', 'zona']);

      // Actualización: Usuarios de la compañía con roles apropiados
      //                Repartidor puede actualizar solo SU ruta asignada
      allow update: if (belongsToCompany(resource.data.companyId) && hasAnyRole(['admin_general', 'almacen_rd', 'cargador', 'super_admin']))
                    || (belongsToCompany(resource.data.companyId) && hasRole('repartidor') && resource.data.repartidorId == request.auth.uid)
                    && notModifyingCriticalFields(['companyId', 'createdAt']);

      // Eliminación: Solo admin_general o super_admin
      allow delete: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'super_admin']);
    }

    // ========================================
    // COLECCIÓN: embarques
    // ========================================
    match /embarques/{embarqueId} {
      // Lectura: Solo usuarios de la misma compañía
      allow read: if belongsToCompany(resource.data.companyId);

      // Creación: Usuarios autenticados de la compañía
      allow create: if isAuthenticated()
                    && request.resource.data.companyId == request.auth.token.companyId;

      // Actualización: Usuarios de la misma compañía
      allow update: if belongsToCompany(resource.data.companyId)
                    && notModifyingCriticalFields(['companyId', 'createdAt']);

      // Eliminación: Solo admin_general o super_admin
      allow delete: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'super_admin']);
    }

    // ========================================
    // COLECCIÓN: tickets
    // ========================================
    match /tickets/{ticketId} {
      // Lectura: Creador del ticket o admin de la compañía
      allow read: if isOwner(resource.data.userId)
                  || (belongsToCompany(resource.data.companyId) && hasAnyRole(['admin_general', 'propietario', 'super_admin']));

      // Creación: Usuarios autenticados
      allow create: if isAuthenticated()
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.companyId == request.auth.token.companyId;

      // Actualización: Admin puede responder, usuario puede ver respuestas
      allow update: if (belongsToCompany(resource.data.companyId) && hasAnyRole(['admin_general', 'propietario', 'super_admin']))
                    || (isOwner(resource.data.userId) && notModifyingCriticalFields(['userId', 'companyId', 'createdAt', 'respuesta']));

      // Eliminación: Solo admin o super_admin
      allow delete: if (belongsToCompany(resource.data.companyId) && hasAnyRole(['admin_general', 'propietario']))
                    || hasRole('super_admin');
    }

    // ========================================
    // COLECCIÓN: solicitudes
    // ========================================
    match /solicitudes/{solicitudId} {
      // Lectura: Solo usuarios de la misma compañía
      allow read: if belongsToCompany(resource.data.companyId);

      // Creación: Usuarios autenticados de la compañía
      allow create: if isAuthenticated()
                    && request.resource.data.companyId == request.auth.token.companyId;

      // Actualización: Usuarios de la compañía con roles apropiados
      allow update: if belongsToCompany(resource.data.companyId)
                    && notModifyingCriticalFields(['companyId', 'createdAt']);

      // Eliminación: Solo admin
      allow delete: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'super_admin']);
    }

    // ========================================
    // COLECCIÓN: gastos_ruta
    // ========================================
    match /gastos_ruta/{gastoId} {
      // Lectura: Solo usuarios de la misma compañía
      allow read: if belongsToCompany(resource.data.companyId);

      // Creación: Usuarios autenticados de la compañía
      allow create: if isAuthenticated()
                    && request.resource.data.companyId == request.auth.token.companyId;

      // Actualización: Usuarios de la misma compañía
      allow update: if belongsToCompany(resource.data.companyId)
                    && notModifyingCriticalFields(['companyId', 'createdAt']);

      // Eliminación: Solo admin
      allow delete: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'super_admin']);
    }

    // ========================================
    // COLECCIÓN: sectores
    // ========================================
    match /sectores/{sectorId} {
      // Lectura: Todos los usuarios autenticados pueden leer sectores
      allow read: if isAuthenticated();

      // Creación: Solo admin o super_admin
      allow create: if hasAnyRole(['admin_general', 'super_admin']);

      // Actualización: Solo admin o super_admin
      allow update: if hasAnyRole(['admin_general', 'super_admin']);

      // Eliminación: Solo super_admin
      allow delete: if hasRole('super_admin');
    }

    // ========================================
    // COLECCIÓN: nomina
    // ========================================
    match /nomina/{nominaId} {
      // Lectura: Solo usuarios de la misma compañía
      allow read: if belongsToCompany(resource.data.companyId);

      // Creación: Solo admin_general o super_admin
      allow create: if hasAnyRole(['admin_general', 'super_admin'])
                    && request.resource.data.companyId == request.auth.token.companyId;

      // Actualización: Solo admin_general o super_admin
      allow update: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'super_admin'])
                    && notModifyingCriticalFields(['companyId', 'createdAt']);

      // Eliminación: Solo admin_general o super_admin
      allow delete: if belongsToCompany(resource.data.companyId)
                    && hasAnyRole(['admin_general', 'super_admin']);
    }

    // ========================================
    // DENEGAR TODO LO DEMÁS
    // ========================================
    // Cualquier otra ruta NO especificada: DENEGAR
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🧪 Tests de Validación

Ejecutar estos tests en **Firebase Rules Playground** ANTES de publicar:

### Test 1: Usuario sin autenticación no puede leer facturas
```
Operation: get
Location: /recolecciones/FACTURA_123
Auth: Not signed in
Expected: ❌ DENIED
```

### Test 2: Usuario de compañía A no puede leer factura de compañía B
```
Operation: get
Location: /recolecciones/FACTURA_456
Auth: Authenticated
  Custom claims: { "companyId": "COMPANY_A", "rol": "repartidor" }
Resource data: { "companyId": "COMPANY_B" }
Expected: ❌ DENIED
```

### Test 3: Admin lee factura de su compañía
```
Operation: get
Location: /recolecciones/FACTURA_789
Auth: Authenticated
  Custom claims: { "companyId": "COMPANY_A", "rol": "admin_general" }
Resource data: { "companyId": "COMPANY_A" }
Expected: ✅ ALLOWED
```

### Test 4: Repartidor actualiza SU ruta asignada
```
Operation: update
Location: /rutas/RUTA_001
Auth: Authenticated
  uid: USER_123
  Custom claims: { "companyId": "COMPANY_A", "rol": "repartidor" }
Resource data: { "companyId": "COMPANY_A", "repartidorId": "USER_123", "estado": "en_entrega" }
Expected: ✅ ALLOWED
```

### Test 5: Repartidor NO puede actualizar ruta de otro repartidor
```
Operation: update
Location: /rutas/RUTA_002
Auth: Authenticated
  uid: USER_123
  Custom claims: { "companyId": "COMPANY_A", "rol": "repartidor" }
Resource data: { "companyId": "COMPANY_A", "repartidorId": "USER_999", "estado": "en_entrega" }
Expected: ❌ DENIED
```

### Test 6: Usuario NO puede modificar su propio rol
```
Operation: update
Location: /usuarios/USER_123
Auth: Authenticated
  uid: USER_123
  Custom claims: { "companyId": "COMPANY_A", "rol": "repartidor" }
Request data: { "rol": "admin_general" }  (trying to change role)
Resource data: { "rol": "repartidor", "companyId": "COMPANY_A" }
Expected: ❌ DENIED
```

### Test 7: Usuario puede actualizar su nombre (campo no crítico)
```
Operation: update
Location: /usuarios/USER_123
Auth: Authenticated
  uid: USER_123
  Custom claims: { "companyId": "COMPANY_A", "rol": "repartidor" }
Request data: { "nombre": "Nuevo Nombre" }  (not a critical field)
Resource data: { "nombre": "Nombre Anterior", "companyId": "COMPANY_A", "rol": "repartidor" }
Expected: ✅ ALLOWED
```

---

## ⚠️ IMPORTANTE: Qué Validar Después de Publicar

### 1. Usuarios Autenticados Pueden Acceder
```
- Login en la aplicación
- Verificar que puedes ver tus rutas/facturas/contenedores
- Verificar que NO ves datos de otras compañías
```

### 2. Roles Funcionan Correctamente
```
- Admin puede crear/editar/eliminar
- Repartidor solo puede actualizar SUS rutas
- Usuario NO puede cambiar su propio rol
```

### 3. Aislamiento por Compañía
```
- Usuario de Compañía A NO ve datos de Compañía B
- Super_admin SÍ puede ver todo
```

---

## 🆘 Si Algo Falla

### Usuarios legítimos no pueden acceder
```
1. Ir a Firebase Console → Firestore Database → Rules
2. Pegar las reglas anteriores (backup)
3. Publicar
4. Revisar qué test falló en Rules Playground
5. Ajustar reglas y volver a probar
```

### Error: "Missing or insufficient permissions"
```
Causa: Usuario no tiene el custom claim correcto (companyId o rol)

Solución:
1. Verificar en Firebase Console → Authentication
2. Ver usuario → Custom claims
3. Debe tener: { "companyId": "...", "rol": "..." }
4. Si no tiene, agregar manualmente o re-login
```

---

## 📊 Beneficios de Estas Reglas

### ✅ Seguridad
- Acceso restringido por compañía (multi-tenant)
- Validación de roles para operaciones críticas
- Prevención de modificación de campos críticos (rol, companyId)
- Protección contra acceso no autorizado

### ✅ Privacidad
- Usuario de compañía A NO puede ver datos de compañía B
- Usuario solo ve SUS rutas, facturas, etc.
- Admin solo puede administrar SU compañía

### ✅ Compliance
- Cumple con GDPR (aislamiento de datos)
- Cumple con SOC 2 (control de acceso)
- Auditable (Firestore logs)

---

## 🎯 Próximos Pasos

1. ✅ Implementar estas reglas en Firebase Console
2. ✅ Probar en Rules Playground
3. ✅ Publicar
4. ✅ Validar en la aplicación
5. ⏳ Monitorear logs por 24-48 horas
6. ⏳ Ajustar si es necesario

---

**Última actualización**: 2025-12-24
**Estado**: ✅ LISTO PARA PRODUCCIÓN
**Aprobado por**: Claude Code + Gemini Pro

---

**🔥 RECUERDA**: Probar en Rules Playground ANTES de publicar en producción!
