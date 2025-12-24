# 🚀 DEPLOYMENT DE FIRESTORE RULES - Guía Paso a Paso

**Tiempo estimado:** 15-30 minutos
**Impacto en seguridad:** Score 95/100 → 100/100

---

## ⚡ PASO A PASO RÁPIDO

### 1. BACKUP (2 minutos)

1. Ir a: https://console.firebase.google.com
2. Seleccionar tu proyecto
3. Click en **Firestore Database** (menú izquierdo)
4. Click en pestaña **Rules** (arriba)
5. **Copiar TODO** el contenido actual (Ctrl+A, Ctrl+C)
6. Pegar en un archivo de texto y guardar como `firestore-rules-backup-2025-12-24.txt`

**¿Por qué?** Si algo sale mal, puedes restaurar las reglas anteriores.

---

### 2. COPIAR NUEVAS REGLAS (1 minuto)

1. Abrir archivo: `.security-audit/firestore-rules-COPIAR-AQUI.txt`
2. Copiar TODO el contenido (Ctrl+A, Ctrl+C)

---

### 3. PEGAR EN FIREBASE CONSOLE (1 minuto)

1. Volver a Firebase Console → Firestore Database → Rules
2. **Seleccionar TODO** el contenido del editor (Ctrl+A)
3. **Pegar** las nuevas reglas (Ctrl+V)
4. **NO publicar todavía** ⚠️

---

### 4. PROBAR EN RULES PLAYGROUND (10 minutos)

#### 4.1 Abrir Rules Playground

1. Scroll down en la página de Rules
2. Click en **"Simulator"** o **"Rules Playground"** (botón abajo del editor)

#### 4.2 Test 1: Usuario sin auth NO puede leer facturas ❌

```
Location: /databases/(default)/documents/recolecciones/TEST_123
Simulation type: get
Authentication: Not signed in

Click "Run" → Expected: ❌ DENIED (Permission Denied)
```

#### 4.3 Test 2: Usuario de compañía A NO puede leer factura de compañía B ❌

```
Location: /databases/(default)/documents/recolecciones/TEST_456
Simulation type: get
Authentication: Authenticated

Click "Show custom token data" y agregar:
{
  "uid": "USER_123",
  "token": {
    "companyId": "COMPANY_A",
    "rol": "repartidor"
  }
}

Click "Run" → Expected: ❌ DENIED
(porque el documento tiene companyId: COMPANY_B)
```

**IMPORTANTE:** Para simular que el documento tiene companyId diferente:
- En el Playground NO puedes cambiar los datos del documento
- Este test fallará si no hay documento real
- **Saltar este test** por ahora, validaremos en producción

#### 4.4 Test 3: Admin lee factura de su compañía ✅

```
Location: /databases/(default)/documents/recolecciones/FACTURA_REAL
Simulation type: get
Authentication: Authenticated

Custom token:
{
  "uid": "TU_UID_ADMIN",
  "token": {
    "companyId": "TU_COMPANY_ID_REAL",
    "rol": "admin_general"
  }
}

Click "Run" → Expected: ✅ ALLOWED
```

**¿Cómo obtener datos reales?**
1. Ir a Firestore Database → Data
2. Click en colección `recolecciones`
3. Click en cualquier documento
4. Copiar el `companyId` que aparece
5. Usar ese `companyId` en el test

#### 4.5 Test 4: Repartidor actualiza SU ruta ✅

```
Location: /databases/(default)/documents/rutas/RUTA_REAL
Simulation type: update
Authentication: Authenticated

Custom token:
{
  "uid": "REPARTIDOR_UID",
  "token": {
    "companyId": "COMPANY_ID_DE_LA_RUTA",
    "rol": "repartidor"
  }
}

Click "Run" → Expected: ✅ ALLOWED
(solo si repartidorId en la ruta == uid del token)
```

#### 4.6 Test 5: Usuario NO autenticado NO puede crear factura ❌

```
Location: /databases/(default)/documents/recolecciones/NEW_FACTURA
Simulation type: create
Authentication: Not signed in

Click "Run" → Expected: ❌ DENIED
```

---

### 5. PUBLICAR (1 minuto)

✅ **Solo si TODOS los tests pasaron**

1. Click en botón **"Publish"** (arriba a la derecha)
2. Confirmar en el modal que aparece
3. Esperar 1-2 minutos para que se despliegue

---

### 6. VALIDAR EN PRODUCCIÓN (5-10 minutos)

#### 6.1 Test de Login y Acceso

1. Abrir tu aplicación en el navegador
2. Hacer login con un usuario normal (NO admin)
3. Verificar que puede ver sus facturas ✅
4. Verificar que puede ver sus rutas ✅

#### 6.2 Test de Multi-Tenant

**Importante:** Si tienes 2 compañías configuradas

1. Login con usuario de Compañía A
2. Verificar que SOLO ve datos de Compañía A ✅
3. Logout
4. Login con usuario de Compañía B
5. Verificar que SOLO ve datos de Compañía B ✅

#### 6.3 Test de Roles

1. Login como repartidor
2. Intentar eliminar una factura (debería fallar) ❌
3. Logout
4. Login como admin_general
5. Intentar eliminar una factura (debería funcionar) ✅

---

### 7. MONITOREAR LOGS (Primeros 30 minutos)

1. Ir a Firebase Console → Firestore Database → Usage
2. Click en **"Rules evaluation"**
3. Verificar que NO hay:
   - Muchos "denied" inesperados
   - Errores en las reglas

**Si ves muchos "denied":**
- Revisar qué operaciones están siendo bloqueadas
- Verificar que los custom claims están configurados correctamente en los usuarios

---

## ⚠️ ROLLBACK (Si algo sale mal)

### Si la aplicación deja de funcionar:

1. Ir a Firebase Console → Firestore Database → Rules
2. **Eliminar TODO** el contenido
3. **Pegar** el backup que guardaste en el paso 1
4. Click en **"Publish"**
5. Esperar 1-2 minutos

### Si algunos usuarios no pueden acceder:

**Problema común:** Falta `companyId` o `rol` en custom claims

1. Ir a Firebase Console → Authentication → Users
2. Click en un usuario que reporta problemas
3. Verificar en la sección **"Custom claims"** que tiene:
   ```json
   {
     "companyId": "COMPANY_123",
     "rol": "repartidor"
   }
   ```

4. Si NO tiene custom claims, ejecutar desde el backend:
   ```javascript
   const admin = require('firebase-admin');

   await admin.auth().setCustomUserClaims(userId, {
     companyId: 'COMPANY_123',
     rol: 'repartidor'
   });
   ```

---

## 📊 CHECKLIST DE VALIDACIÓN

### Pre-Deployment
- [ ] Backup de reglas actuales guardado
- [ ] Nuevas reglas copiadas desde archivo
- [ ] Reglas pegadas en Firebase Console
- [ ] Test 1 pasado (usuario sin auth bloqueado)
- [ ] Test 3 pasado (admin puede leer su compañía)
- [ ] Test 5 pasado (usuario sin auth no puede crear)

### Post-Deployment
- [ ] Reglas publicadas
- [ ] Login funciona correctamente
- [ ] Usuarios ven sus datos
- [ ] Multi-tenant funciona (usuarios de CompañíaA no ven datos de CompañíaB)
- [ ] Repartidores NO pueden eliminar facturas
- [ ] Admins SÍ pueden eliminar facturas
- [ ] NO hay errores masivos en logs de Firestore

---

## 🎯 ERRORES COMUNES Y SOLUCIONES

### Error 1: "Permission Denied" para TODOS los usuarios

**Causa:** Usuarios no tienen custom claims configurados

**Solución:**
```javascript
// En backend, para cada usuario
const admin = require('firebase-admin');

// Obtener usuario de Firestore
const userDoc = await db.collection('usuarios').doc(userId).get();
const userData = userDoc.data();

// Setear custom claims
await admin.auth().setCustomUserClaims(userId, {
  companyId: userData.companyId,
  rol: userData.rol
});

// Decirle al usuario que haga logout/login
```

### Error 2: "Property is undefined: companyId" en logs

**Causa:** Algunos documentos no tienen campo `companyId`

**Solución:**
```javascript
// Script para agregar companyId a documentos existentes
const batch = db.batch();

const snapshot = await db.collection('recolecciones')
  .where('companyId', '==', null)
  .get();

snapshot.forEach(doc => {
  batch.update(doc.ref, {
    companyId: 'TU_COMPANY_ID_DEFAULT'
  });
});

await batch.commit();
```

### Error 3: Admin no puede crear nuevos usuarios

**Causa:** Regla muy restrictiva en `usuarios`

**Verificar:** Admin tiene rol `admin_general` o `propietario` en sus custom claims

**Solución temporal:** Agregar tu UID específico:
```javascript
// En las reglas, temporalmente:
allow create: if hasAnyRole(['admin_general', 'propietario', 'super_admin'])
              || request.auth.uid == 'TU_UID_ADMIN_AQUI';
```

---

## 📈 MÉTRICAS DE ÉXITO

### Después de 1 hora:

- [ ] 0 errores críticos en logs
- [ ] < 5% de requests denegados (en Usage → Rules evaluation)
- [ ] Usuarios pueden trabajar normalmente
- [ ] NO hay tickets de soporte sobre "no puedo ver mis datos"

### Después de 24 horas:

- [ ] Score de seguridad: 100/100 ✅
- [ ] Multi-tenant 100% funcional
- [ ] RBAC funcionando correctamente
- [ ] 0 data leakage entre compañías

---

## 🎉 DEPLOYMENT EXITOSO

Si todos los tests pasaron y la aplicación funciona:

**¡FELICITACIONES!** 🎊

Has implementado:
- ✅ Multi-tenant isolation
- ✅ Role-Based Access Control (RBAC)
- ✅ Validación de datos
- ✅ Protección de campos críticos
- ✅ Score de seguridad: 100/100

**Próximos pasos opcionales:**
1. Auditoría de Autenticación (`.security-audit/prompt-auth-audit.md`)
2. Auditoría de Inyección (`.security-audit/prompt-injection-audit.md`)
3. Auditoría de Lógica de Negocio (`.security-audit/prompt-business-logic-audit.md`)

---

**Tiempo total estimado:** 15-30 minutos
**Dificultad:** Media
**Impacto:** Alto (Score +5 puntos)

**¿Dudas?** Revisar [FIRESTORE-RULES-SEGURAS.md](FIRESTORE-RULES-SEGURAS.md) para documentación completa.
