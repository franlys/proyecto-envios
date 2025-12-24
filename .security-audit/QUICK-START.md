# ⚡ QUICK START: Auditorías con Gemini Pro

Guía ultra-rápida para empezar a auditar con Gemini en **menos de 5 minutos**.

**📖 Para instrucciones PASO A PASO detalladas**: Ver [INSTRUCCIONES-GEMINI.md](INSTRUCCIONES-GEMINI.md)

---

## 🎯 3 Auditorías Más Importantes (Hazlas AHORA)

### 1️⃣ Race Conditions (30 minutos)

**¿Por qué?** Puede causar duplicación de reportes WhatsApp y errores financieros.

**Pasos**:
```bash
# 1. Abrir prompt
cat .security-audit/prompt-race-condition-audit.md

# 2. Copiar TODO el contenido y pegar en Gemini Pro

# 3. Copiar código a auditar
cat backend/src/controllers/cargadoresController.js

# 4. Pegar en Gemini

# 5. Guardar reporte que Gemini genere
```

**Archivos a auditar**:
- `backend/src/controllers/cargadoresController.js`
- `backend/src/controllers/almacenUsaController.js`
- `backend/src/controllers/rutaController.js` (función `finalizarRuta`)

---

### 2️⃣ Rate Limiting (45 minutos)

**¿Por qué?** Sin esto, atacantes pueden hacer brute force de passwords y saturar tu servidor.

**Pasos**:
```bash
# 1. Abrir prompt
cat .security-audit/prompt-rate-limiting-audit.md

# 2. Copiar TODO y pegar en Gemini

# 3. Copiar TODAS las rutas
cat backend/src/routes/contenedores.js
cat backend/src/routes/usuarios.js
cat backend/src/routes/auth.js  # Si existe

# 4. Pegar UNA POR UNA en Gemini

# 5. Implementar rate limiting según Gemini sugiera
```

**Resultado esperado**: Gemini te dirá exactamente qué endpoints necesitan rate limiting y te dará el código completo con `express-rate-limit`.

---

### 3️⃣ Firestore Security Rules (60 minutos)

**¿Por qué?** Si tus reglas están abiertas, CUALQUIERA puede leer/modificar TODA tu base de datos.

**Pasos**:
```bash
# 1. Ir a Firebase Console
# https://console.firebase.google.com
# -> Tu Proyecto -> Firestore Database -> Rules

# 2. Copiar TODAS las reglas actuales

# 3. Abrir prompt
cat .security-audit/prompt-firestore-rules-audit.md

# 4. Copiar TODO y pegar en Gemini

# 5. Pegar las reglas de Firestore en Gemini

# 6. Gemini generará reglas seguras completas

# 7. Reemplazar en Firebase Console y publicar
```

**⚠️ CRÍTICO**: Probar en Firebase Rules Playground ANTES de publicar.

---

## 🚀 Workflow Ultra-Rápido

### Para CUALQUIER prompt:

```bash
# PASO 1: Abrir prompt
cat .security-audit/prompt-[NOMBRE].md

# PASO 2: Copiar TODO

# PASO 3: Pegar en Gemini Pro

# PASO 4: Esperar confirmación
# Gemini dirá: "Entendido, estoy listo para auditar..."

# PASO 5: Copiar código a auditar
cat backend/src/[ARCHIVO].js

# PASO 6: Pegar en Gemini

# PASO 7: Gemini genera reporte automáticamente

# PASO 8: Guardar reporte
# Copia el reporte de Gemini y guárdalo en:
# .security-audit/reportes/[nombre-archivo]-[fecha].md

# PASO 9: Implementar correcciones
```

**Tiempo total por archivo**: 15-30 minutos

---

## 📋 Prompts Disponibles (9 en total)

| # | Prompt | Archivo | Urgencia | Tiempo |
|---|--------|---------|----------|--------|
| 1 | Race Conditions | [prompt-race-condition-audit.md](prompt-race-condition-audit.md) | 🔴 AHORA | 30 min |
| 2 | Rate Limiting | [prompt-rate-limiting-audit.md](prompt-rate-limiting-audit.md) | 🔴 AHORA | 45 min |
| 3 | Firestore Rules | [prompt-firestore-rules-audit.md](prompt-firestore-rules-audit.md) | 🔴 AHORA | 60 min |
| 4 | Autenticación | [prompt-auth-audit.md](prompt-auth-audit.md) | 🟡 Esta semana | 30 min |
| 5 | Inyecciones | [prompt-injection-audit.md](prompt-injection-audit.md) | 🟡 Esta semana | 30 min |
| 6 | Lógica Financiera | [prompt-business-logic-audit.md](prompt-business-logic-audit.md) | 🟡 Esta semana | 45 min |
| 7 | Security Headers | [GUIA-PROMPTS-SIGUIENTES-PASOS.md#4-security-headers-audit](GUIA-PROMPTS-SIGUIENTES-PASOS.md#4-security-headers-audit) | ⚪ Próxima semana | 20 min |
| 8 | Dependencias | [GUIA-PROMPTS-SIGUIENTES-PASOS.md#5-dependency-vulnerability-audit](GUIA-PROMPTS-SIGUIENTES-PASOS.md#5-dependency-vulnerability-audit) | ⚪ Próxima semana | 15 min |
| 9 | Token Revocation | [GUIA-PROMPTS-SIGUIENTES-PASOS.md#6-token-revocation-audit](GUIA-PROMPTS-SIGUIENTES-PASOS.md#6-token-revocation-audit) | ⚪ Próxima semana | 30 min |

---

## 🎯 Plan de 3 Días

### Día 1: Race Conditions (2-3 horas)

**Mañana** (1-1.5 horas):
- Auditar `cargadoresController.js` con Gemini
- Auditar `almacenUsaController.js` con Gemini

**Tarde** (1-1.5 horas):
- Implementar correcciones que Gemini sugiera
- Testing de las correcciones

---

### Día 2: Rate Limiting (3-4 horas)

**Mañana** (1.5-2 horas):
- Auditar TODAS las rutas en `backend/src/routes/` con Gemini
- Gemini dirá qué endpoints necesitan rate limiting

**Tarde** (1.5-2 horas):
- Instalar `express-rate-limit`: `npm install express-rate-limit`
- Implementar rate limiting según Gemini sugiera
- Testing (intentar hacer más de 5 logins seguidos, debe bloquear)

---

### Día 3: Firestore Rules (2-3 horas)

**Mañana** (1-1.5 horas):
- Copiar reglas actuales de Firebase Console
- Auditar con Gemini usando `prompt-firestore-rules-audit.md`
- Gemini generará reglas seguras completas

**Tarde** (1-1.5 horas):
- Probar reglas en Firebase Rules Playground
- Publicar reglas en Firebase Console
- Validar que usuarios autenticados pueden acceder (no rompiste nada)

---

## 📱 Acceso Rápido a Gemini Pro

### Opción 1: AnythingLLM (que ya tienes)

1. Abrir AnythingLLM
2. Seleccionar workspace de seguridad
3. Asegurarte de que modelo sea **Gemini Pro**
4. Pegar prompt y código

### Opción 2: Google AI Studio (alternativa)

1. Ir a: https://aistudio.google.com/
2. Crear nueva conversación
3. Pegar prompt y código
4. Más rápido que AnythingLLM, mismo resultado

---

## 🆘 Troubleshooting

### "Gemini no entiende el prompt"

**Solución**:
- Asegúrate de copiar **TODO** el contenido del archivo `.md`
- Verifica que Gemini haya confirmado: "Entendido, estoy listo..."
- Si no confirma, di: "Por favor confirma que entendiste el prompt"

---

### "El reporte de Gemini es muy genérico"

**Solución**:
- Pega el archivo **completo**, no solo fragmentos
- Pide más detalles: "Genera código de corrección completo para cada vulnerabilidad"
- O: "Dame ejemplos de explotación de cada vulnerabilidad que encontraste"

---

### "No encuentro el prompt que necesito"

**Solución**:
- Ver lista completa: [RESUMEN-PROMPTS-DISPONIBLES.md](RESUMEN-PROMPTS-DISPONIBLES.md)
- Ver guía detallada: [GUIA-PROMPTS-SIGUIENTES-PASOS.md](GUIA-PROMPTS-SIGUIENTES-PASOS.md)

---

### "¿Puedo usar el script automático en vez de Gemini manual?"

**Sí**, pero requiere API key:

```bash
# 1. Obtener API key gratis de Gemini
# https://aistudio.google.com/app/apikey

# 2. Agregar a .env
echo "GEMINI_API_KEY=tu-api-key-aqui" >> .env

# 3. Ejecutar script
node .security-audit/security-audit-auto.js
```

**Ventaja**: Más rápido, automatizado
**Desventaja**: Necesitas API key (aunque es gratis)

---

## 💡 Tips para Maximizar Resultados

### ✅ Haz Esto

1. **Copia TODO el prompt**, no solo el resumen
2. **Espera confirmación** de Gemini antes de pegar código
3. **Pega archivos completos**, Gemini necesita contexto
4. **Implementa correcciones CRÍTICAS primero**, luego las demás
5. **Guarda los reportes** en `.security-audit/reportes/`

### ❌ Evita Esto

1. ❌ Pegar código sin pegar el prompt primero
2. ❌ Pegar solo fragmentos de funciones (Gemini necesita ver todo)
3. ❌ Auditar 5 archivos a la vez (haz uno por uno)
4. ❌ Ignorar correcciones de severidad CRÍTICA
5. ❌ No probar que las correcciones funcionan

---

## 🎓 Ejemplo Completo: Auditar Race Conditions

### Input para Gemini (PASO POR PASO)

**PASO 1**: Abre el prompt
```bash
cat .security-audit/prompt-race-condition-audit.md
```

**PASO 2**: Copia **TODO** lo que salió (desde `# 🔐 SYSTEM PROMPT` hasta el final)

**PASO 3**: Pega en Gemini Pro

**PASO 4**: Gemini responde:
```
Entendido, soy un experto en Race Conditions y estoy listo para auditar.
Por favor proporciona el código a auditar.
```

**PASO 5**: Copia el código a auditar
```bash
cat backend/src/controllers/cargadoresController.js
```

**PASO 6**: Pega en Gemini

**PASO 7**: Gemini genera reporte automáticamente:
```markdown
# 🔒 AUDITORÍA: Race Conditions en cargadoresController.js

## Vulnerabilidades Detectadas

### Vulnerabilidad #1: Actualización de Estado Sin Transacción
**Severidad**: MEDIA
**Función**: `actualizarEstado` (líneas 123-145)

**Código Vulnerable**:
```javascript
const doc = await ref.get();
if (doc.data().estado === 'pendiente') {
  await ref.update({ estado: 'completado' });
}
```

**Corrección**:
```javascript
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(ref);
  if (doc.data().estado === 'completado') {
    throw new Error('Ya completado');
  }
  transaction.update(ref, { estado: 'completado' });
});
```
```

**PASO 8**: Copia el reporte y guárdalo en:
```
.security-audit/reportes/cargadores-race-condition-2025-12-24.md
```

**PASO 9**: Implementa las correcciones en tu código

**PASO 10**: Audita de nuevo para validar que se corrigió

---

## 📊 Estado Actual de Seguridad

### ✅ Ya Corregido (2025-12-23)
- NoSQL Injection
- XSS Almacenado
- Endpoints sin autenticación
- Validación de archivos
- Information disclosure

### ✅ Ya Corregido (2025-12-24)
- Race condition en `rutaController.js` → `cerrarRuta`

### ⏳ Pendiente (HAZ AHORA)
- [ ] Race conditions en `cargadoresController.js`
- [ ] Race conditions en `almacenUsaController.js`
- [ ] Rate limiting en TODAS las rutas
- [ ] Firestore Security Rules

### ⏳ Pendiente (Esta Semana)
- [ ] Security Headers (Helmet.js)
- [ ] Token Revocation
- [ ] Dependency Audit

---

## 🏁 Checklist de Hoy

### Si solo tienes 2 horas:

- [ ] Auditar race conditions en `cargadoresController.js` (30 min)
- [ ] Implementar correcciones (30 min)
- [ ] Auditar rate limiting en `contenedores.js` (30 min)
- [ ] Implementar rate limiting básico (30 min)

### Si tienes 4 horas:

- [ ] Todo lo de arriba
- [ ] Auditar Firestore Rules (1 hora)
- [ ] Implementar reglas seguras (1 hora)

### Si tienes el día completo:

- [ ] Todo lo de arriba
- [ ] Auditar `almacenUsaController.js` para race conditions
- [ ] Auditar TODAS las rutas para rate limiting
- [ ] Testing completo de las correcciones

---

## 📞 Ayuda Adicional

**Documentación completa**:
- [README.md](README.md) - Guía general
- [RESUMEN-PROMPTS-DISPONIBLES.md](RESUMEN-PROMPTS-DISPONIBLES.md) - Lista de 9 prompts
- [GUIA-PROMPTS-SIGUIENTES-PASOS.md](GUIA-PROMPTS-SIGUIENTES-PASOS.md) - Plan detallado

**Reportes**:
- [RESUMEN-FINAL-SEGURIDAD.md](RESUMEN-FINAL-SEGURIDAD.md) - Resumen ejecutivo
- [CHANGELOG-SECURITY.md](CHANGELOG-SECURITY.md) - Registro de cambios

---

**Última actualización**: 2025-12-24

---

**🚀 ¡Empieza AHORA! Copia el primer prompt y pégalo en Gemini.**
