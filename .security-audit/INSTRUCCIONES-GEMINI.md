# 📋 INSTRUCCIONES: Cómo Usar Gemini para Auditar

Guía paso a paso para que Gemini Pro audite tu código automáticamente.

---

## 🚀 MÉTODO 1: Auditoría Rápida (Recomendado)

### Paso 1: Abrir Gemini Pro

**Opción A: AnythingLLM** (ya lo tienes instalado)
```
1. Abrir AnythingLLM
2. Crear nuevo workspace o usar uno existente
3. Asegurarte que el modelo sea "Gemini Pro"
4. Listo para empezar
```

**Opción B: Google AI Studio** (más rápido)
```
1. Ir a: https://aistudio.google.com/
2. Click en "Create new chat"
3. Listo para empezar
```

---

### Paso 2: Primera Auditoría - Race Conditions

#### 2.1 Copiar el Prompt

```bash
# En tu terminal:
cat .security-audit/prompt-race-condition-audit.md
```

**O abre el archivo manualmente**:
- Navega a: `c:\Users\elmae\proyecto-envios\.security-audit\`
- Abre: `prompt-race-condition-audit.md`
- Selecciona TODO (Ctrl+A)
- Copia (Ctrl+C)

#### 2.2 Pegar en Gemini

```
1. En Gemini Pro, pega TODO el contenido del prompt
2. Presiona Enter
3. Espera a que Gemini confirme
```

**Gemini responderá algo como**:
```
Entendido, soy un experto en Race Conditions y concurrencia en Firestore.
Estoy listo para auditar código JavaScript/Node.js.

Por favor proporciona el código a auditar.
```

#### 2.3 Copiar Código a Auditar

```bash
# En tu terminal:
cat backend/src/controllers/cargadoresController.js
```

**O abre el archivo manualmente**:
- Navega a: `c:\Users\elmae\proyecto-envios\backend\src\controllers\`
- Abre: `cargadoresController.js`
- Selecciona TODO (Ctrl+A)
- Copia (Ctrl+C)

#### 2.4 Pegar Código en Gemini

```
1. En Gemini Pro, pega el código completo
2. Presiona Enter
3. Espera 10-30 segundos
```

#### 2.5 Gemini Genera el Reporte

**Gemini responderá con un reporte completo**:

```markdown
# 🔒 AUDITORÍA: Race Conditions en cargadoresController.js

**Fecha**: 2025-12-24
**Auditor**: Gemini Pro
**Archivo**: backend/src/controllers/cargadoresController.js

---

## 📊 Resumen Ejecutivo

- **Funciones auditadas**: 8
- **Race Conditions encontradas**: 2
- **Severidad más alta**: MEDIA
- **Score de Seguridad de Concurrencia**: 70/100

---

## 🚨 Vulnerabilidades Detectadas

### Vulnerabilidad #1: Actualización de Estado Sin Transacción

**Severidad**: MEDIA
**Función**: `actualizarEstado` (líneas 145-167)
**CWE**: CWE-362

**Código Vulnerable**:
```javascript
const doc = await cargadorRef.get();
const data = doc.data();

if (data.estado === 'disponible') {
  await cargadorRef.update({ estado: 'ocupado' });
}
```

**Corrección Recomendada**:
```javascript
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(cargadorRef);

  if (!doc.exists) {
    throw new Error('Cargador no encontrado');
  }

  const data = doc.data();

  if (data.estado === 'ocupado') {
    throw new Error('Cargador ya está ocupado');
  }

  transaction.update(cargadorRef, {
    estado: 'ocupado',
    fechaActualizacion: new Date().toISOString()
  });
});
```

[... más vulnerabilidades ...]
```

#### 2.6 Guardar el Reporte

```
1. Copia TODO el reporte que Gemini generó
2. Crea nuevo archivo: .security-audit/reportes/cargadores-race-condition-2025-12-24.md
3. Pega el contenido
4. Guarda el archivo
```

**Comando rápido**:
```bash
# Copiar el reporte de Gemini y ejecutar:
echo "[PEGAR REPORTE AQUI]" > .security-audit/reportes/cargadores-race-condition-2025-12-24.md
```

---

## 🔄 REPETIR PARA OTROS ARCHIVOS

### Archivos Prioritarios para Race Conditions:

#### Archivo 2: almacenUsaController.js
```bash
# 1. Gemini ya tiene el prompt cargado, NO lo vuelvas a pegar
# 2. Solo copia y pega el nuevo código:
cat backend/src/controllers/almacenUsaController.js

# 3. Pega en Gemini
# 4. Gemini generará nuevo reporte
# 5. Guarda en: .security-audit/reportes/almacen-usa-race-condition-2025-12-24.md
```

#### Archivo 3: rutaController.js (función finalizarRuta)
```bash
# Solo necesitas auditar la función finalizarRuta
# Copia solo esa función y pégala en Gemini

# O copia el archivo completo:
cat backend/src/controllers/rutaController.js
```

---

## 🚦 SEGUNDA AUDITORÍA: Rate Limiting

### Paso 1: Nuevo Chat en Gemini

**IMPORTANTE**: Inicia una NUEVA conversación en Gemini

```
1. En AnythingLLM: Click en "New Chat"
2. En Google AI Studio: Click en "Create new chat"
```

### Paso 2: Copiar Prompt de Rate Limiting

```bash
cat .security-audit/prompt-rate-limiting-audit.md
```

### Paso 3: Pegar en Gemini y Esperar Confirmación

```
Gemini responderá:
"Entendido, soy un experto en Rate Limiting y DoS Prevention.
Estoy listo para auditar rutas de Express.js"
```

### Paso 4: Auditar TODAS las Rutas

#### Ruta 1: contenedores.js
```bash
cat backend/src/routes/contenedores.js

# Pegar en Gemini
# Gemini dirá qué endpoints necesitan rate limiting
# Guardar reporte en: .security-audit/reportes/contenedores-rate-limiting-2025-12-24.md
```

#### Ruta 2: usuarios.js (si existe)
```bash
cat backend/src/routes/usuarios.js

# Pegar en Gemini
# Guardar reporte
```

#### Ruta 3: auth.js (si existe)
```bash
cat backend/src/routes/auth.js

# Pegar en Gemini
# Guardar reporte
```

---

## 🔥 TERCERA AUDITORÍA: Firestore Security Rules

### Paso 1: Obtener Reglas Actuales de Firebase

```
1. Ir a: https://console.firebase.google.com
2. Seleccionar tu proyecto
3. Menú lateral: "Firestore Database"
4. Pestaña: "Rules"
5. Copiar TODAS las reglas (Ctrl+A, Ctrl+C)
```

**Tus reglas se verán algo así**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ❌ INSEGURO
    }
  }
}
```

### Paso 2: Nueva Conversación en Gemini

```
1. Crear nuevo chat en Gemini
2. Copiar prompt:
```

```bash
cat .security-audit/prompt-firestore-rules-audit.md
```

```
3. Pegar prompt en Gemini
4. Esperar confirmación
```

### Paso 3: Pegar Reglas de Firestore

```
1. Pegar las reglas que copiaste de Firebase Console
2. Presionar Enter
3. Esperar 30-60 segundos
```

### Paso 4: Gemini Genera Reglas Seguras

**Gemini te dará**:
1. Reporte de vulnerabilidades en tus reglas actuales
2. Código COMPLETO de reglas seguras
3. Instrucciones de cómo probarlas

### Paso 5: Implementar Reglas Seguras

```
1. Copiar el código de reglas que Gemini generó
2. Ir a Firebase Console > Firestore Database > Rules
3. Reemplazar TODAS las reglas con las nuevas
4. Click en "Publish"
```

**⚠️ IMPORTANTE**: ANTES de publicar:

```
1. Click en "Rules Playground" (abajo de las reglas)
2. Probar escenarios:
   - Usuario sin auth intenta leer facturas → Debe ser DENIED
   - Usuario con auth lee facturas de su compañía → Debe ser ALLOWED
   - Admin lee facturas de su compañía → Debe ser ALLOWED
3. Si todos los tests pasan, entonces "Publish"
```

---

## 📋 RESUMEN: Flujo Completo para TODAS las Auditorías

### Template General:

```
┌─────────────────────────────────────────┐
│ 1. ABRIR NUEVO CHAT EN GEMINI          │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 2. COPIAR PROMPT                        │
│    cat .security-audit/prompt-XXX.md    │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 3. PEGAR EN GEMINI                      │
│    Esperar confirmación                 │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 4. COPIAR CÓDIGO A AUDITAR              │
│    cat backend/src/xxx.js               │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 5. PEGAR EN GEMINI                      │
│    Esperar reporte (10-30 seg)          │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 6. GUARDAR REPORTE                      │
│    .security-audit/reportes/xxx.md      │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 7. IMPLEMENTAR CORRECCIONES             │
└─────────────────────────────────────────┘
```

---

## 🎯 Plan de 3 Días con Gemini

### DÍA 1: Race Conditions (2-3 horas)

**Mañana** (1-1.5 horas con Gemini):
```
✅ Nuevo chat en Gemini
✅ Copiar prompt-race-condition-audit.md
✅ Pegar en Gemini
✅ Auditar cargadoresController.js
✅ Auditar almacenUsaController.js
✅ Auditar rutaController.js (finalizarRuta)
✅ Guardar 3 reportes
```

**Tarde** (1-1.5 horas - implementar):
```
✅ Leer reportes de Gemini
✅ Implementar correcciones sugeridas
✅ Testing de las correcciones
```

---

### DÍA 2: Rate Limiting (3-4 horas)

**Mañana** (1 hora con Gemini):
```
✅ Nuevo chat en Gemini
✅ Copiar prompt-rate-limiting-audit.md
✅ Pegar en Gemini
✅ Auditar contenedores.js
✅ Auditar usuarios.js
✅ Auditar auth.js (si existe)
✅ Guardar reportes
```

**Tarde** (2-3 horas - implementar):
```bash
# 1. Instalar express-rate-limit
npm install express-rate-limit

# 2. Implementar según reportes de Gemini
# (Gemini te dará el código exacto)

# 3. Testing:
# - Intentar 6 logins seguidos → Debe bloquear después del 5to
# - Intentar subir 21 archivos en 1 hora → Debe bloquear después del 20vo
```

---

### DÍA 3: Firestore Rules (2-3 horas)

**Mañana** (1 hora con Gemini):
```
✅ Ir a Firebase Console
✅ Copiar reglas actuales
✅ Nuevo chat en Gemini
✅ Copiar prompt-firestore-rules-audit.md
✅ Pegar en Gemini
✅ Pegar reglas de Firestore
✅ Gemini genera reglas seguras
✅ Guardar reporte
```

**Tarde** (1-2 horas - implementar):
```
✅ Copiar reglas seguras de Gemini
✅ Probar en Firebase Rules Playground
✅ Publicar en Firebase Console
✅ Validar que usuarios autenticados pueden acceder
```

---

## 💡 TIPS para Mejores Resultados con Gemini

### ✅ HAZ ESTO:

1. **Siempre copia TODO el prompt**, no solo un fragmento
   ```
   ✅ CORRECTO: Copiar desde "# 🔐 SYSTEM PROMPT" hasta el final
   ❌ INCORRECTO: Copiar solo el resumen
   ```

2. **Espera confirmación de Gemini antes de pegar código**
   ```
   ✅ CORRECTO: Ver "Estoy listo para auditar"
   ❌ INCORRECTO: Pegar código inmediatamente
   ```

3. **Pega archivos COMPLETOS, no fragmentos**
   ```
   ✅ CORRECTO: cat backend/src/controllers/cargadoresController.js (TODO)
   ❌ INCORRECTO: Copiar solo 2-3 funciones
   ```

4. **Un archivo a la vez**
   ```
   ✅ CORRECTO: Auditar cargadoresController.js, esperar reporte, luego almacenUsaController.js
   ❌ INCORRECTO: Pegar 3 archivos juntos
   ```

5. **Guarda TODOS los reportes**
   ```
   ✅ CORRECTO: .security-audit/reportes/[nombre]-[tipo]-2025-12-24.md
   ❌ INCORRECTO: No guardar, perder los reportes
   ```

---

### ❌ EVITA ESTO:

1. ❌ Pegar código sin pegar el prompt primero
2. ❌ Pegar solo fragmentos de funciones
3. ❌ Auditar 5 archivos en un solo mensaje
4. ❌ Ignorar correcciones de severidad CRÍTICA o ALTA
5. ❌ No probar que las correcciones funcionan
6. ❌ Usar el MISMO chat para diferentes tipos de auditoría
   - Race Conditions → Nuevo chat
   - Rate Limiting → Nuevo chat diferente
   - Firestore Rules → Nuevo chat diferente

---

## 🆘 Troubleshooting

### Problema 1: "Gemini no entiende el prompt"

**Solución**:
```
1. Verifica que copiaste TODO el archivo .md (no solo una parte)
2. Verifica que Gemini haya confirmado
3. Si no confirma, pregúntale: "¿Estás listo para auditar?"
```

---

### Problema 2: "El reporte de Gemini es muy genérico"

**Solución**:
```
Pídele más detalles a Gemini:

"Por favor genera código de corrección COMPLETO para cada vulnerabilidad"

O:

"Dame ejemplos concretos de cómo explotar cada vulnerabilidad"
```

---

### Problema 3: "Gemini dice que no hay vulnerabilidades pero yo sé que hay"

**Solución**:
```
1. Verifica que pegaste el archivo completo
2. Pídele que revise de nuevo:
   "Revisa de nuevo, buscando específicamente operaciones
    get() seguidas de update() sin db.runTransaction()"
```

---

### Problema 4: "No sé qué prompt usar"

**Solución**:
```
Ver: .security-audit/RESUMEN-PROMPTS-DISPONIBLES.md

Regla general:
- Controllers → prompt-race-condition-audit.md
- Routes → prompt-rate-limiting-audit.md
- Firebase Rules → prompt-firestore-rules-audit.md
- Middleware auth → prompt-auth-audit.md
```

---

## 📊 Checklist de Auditorías

### Race Conditions
- [ ] cargadoresController.js
- [ ] almacenUsaController.js
- [ ] rutaController.js (finalizarRuta)
- [ ] Otros controllers con estados críticos

### Rate Limiting
- [ ] contenedores.js
- [ ] usuarios.js
- [ ] auth.js
- [ ] Otras rutas

### Firestore Rules
- [ ] Reglas actuales auditadas
- [ ] Reglas seguras implementadas
- [ ] Probadas en Rules Playground

---

## 🎓 Ejemplo Completo: Primera Vez con Gemini

### Escenario: Nunca has usado Gemini para auditar

**PASO 1**: Abrir AnythingLLM
```
1. Click en el icono de AnythingLLM
2. Seleccionar workspace (o crear uno nuevo)
3. Asegurarte que modelo sea "Gemini Pro"
```

**PASO 2**: Abrir el primer prompt
```
1. Abrir File Explorer
2. Ir a: c:\Users\elmae\proyecto-envios\.security-audit\
3. Abrir: prompt-race-condition-audit.md con Notepad
4. Ctrl+A (seleccionar todo)
5. Ctrl+C (copiar)
```

**PASO 3**: Pegar en Gemini
```
1. En AnythingLLM, click en el área de texto
2. Ctrl+V (pegar)
3. Presionar Enter
4. Ver que Gemini responde: "Entendido, estoy listo..."
```

**PASO 4**: Abrir código a auditar
```
1. Abrir File Explorer
2. Ir a: c:\Users\elmae\proyecto-envios\backend\src\controllers\
3. Abrir: cargadoresController.js con Notepad
4. Ctrl+A (seleccionar todo)
5. Ctrl+C (copiar)
```

**PASO 5**: Pegar código en Gemini
```
1. En AnythingLLM, click en el área de texto
2. Ctrl+V (pegar)
3. Presionar Enter
4. Esperar 10-30 segundos
```

**PASO 6**: Gemini genera reporte
```
Gemini responderá con un reporte completo en formato Markdown
```

**PASO 7**: Guardar reporte
```
1. Copiar TODO el reporte de Gemini (Ctrl+A en el reporte, Ctrl+C)
2. Abrir Notepad
3. Ctrl+V (pegar)
4. Guardar como: c:\Users\elmae\proyecto-envios\.security-audit\reportes\cargadores-race-condition-2025-12-24.md
```

**PASO 8**: Leer reporte e implementar correcciones
```
1. Leer el reporte
2. Copiar el código de corrección que Gemini sugiere
3. Implementar en tu código
4. Probar que funciona
```

---

## 🚀 EMPEZAR AHORA

### Si solo tienes 30 minutos HOY:

```bash
# 1. Abrir AnythingLLM
# 2. Copiar este comando y ejecutar en terminal:
cat .security-audit/prompt-race-condition-audit.md

# 3. Copiar TODO lo que salió
# 4. Pegar en Gemini
# 5. Esperar confirmación
# 6. Ejecutar:
cat backend/src/controllers/cargadoresController.js

# 7. Copiar TODO
# 8. Pegar en Gemini
# 9. Esperar reporte (30 segundos)
# 10. Guardar reporte
```

**✅ HECHO**: Ya auditaste tu primer archivo con Gemini!

---

**Última actualización**: 2025-12-24

**🎯 ACCIÓN INMEDIATA**: Abre AnythingLLM AHORA y haz la primera auditoría (30 minutos).
