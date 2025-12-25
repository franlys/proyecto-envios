# 🎯 GUÍA COMPLETA DE AUDITORÍAS CON GEMINI PRO

**Fecha:** 2025-12-24
**Proyecto:** Sistema de Envíos Multi-tenant
**Herramienta:** Google AI Studio (Gemini Pro)

---

## 📋 RESUMEN DE AUDITORÍAS DISPONIBLES

He creado **4 prompts especializados** para que Gemini Pro realice auditorías completas de seguridad:

| # | Auditoría | Archivo | Prioridad | Tiempo |
|---|-----------|---------|-----------|--------|
| 1 | **Dependencias npm** | `prompt-dependency-audit.md` | 🔴 CRÍTICA | 10 min |
| 2 | **Validación de Inputs** | `prompt-input-validation-audit.md` | 🔴 CRÍTICA | 20 min |
| 3 | **Seguridad de API** | `prompt-api-security-audit.md` | 🔴 CRÍTICA | 30 min |
| 4 | **File Uploads** | `prompt-file-upload-audit.md` | 🟡 ALTA | 15 min |

**Tiempo total:** ~75 minutos
**Costo:** Gratuito (con límites de Gemini Pro)

---

## 🚀 PASO A PASO - CÓMO USAR LOS PROMPTS

### PASO 1: Acceder a Google AI Studio

1. Ir a: https://aistudio.google.com/
2. Iniciar sesión con cuenta de Google
3. Click en **"Create new"** → **"New chat"**

---

### PASO 2: Ejecutar Auditoría de Dependencias ⭐ EMPIEZA AQUÍ

**Tiempo:** 10 minutos
**Prioridad:** CRÍTICA

#### Archivos necesarios:
- `backend/package.json`
- `admin_web/package.json`

#### Comandos para obtener archivos:

```bash
# Desde la raíz del proyecto
cd c:\Users\elmae\proyecto-envios

# Opcional: Ejecutar npm audit antes
cd backend
npm audit > npm-audit-backend.txt

cd ../admin_web
npm audit > npm-audit-frontend.txt
```

#### Instrucciones:

1. Abrir archivo: `.security-audit/prompt-dependency-audit.md`
2. **Copiar TODO el contenido** del archivo
3. En Google AI Studio, pegar el prompt
4. **Adjuntar archivos:**
   - Click en 📎 (attach file)
   - Subir `backend/package.json`
   - Subir `admin_web/package.json`
   - (Opcional) Subir `npm-audit-backend.txt` y `npm-audit-frontend.txt`
5. Click en **"Run"** o Enter
6. Esperar respuesta (5-10 min)
7. **Guardar el reporte** que devuelve Gemini

#### Qué esperar:

Gemini te devolverá:
- Lista de vulnerabilidades CVE conocidas
- Versiones recomendadas para actualizar
- Comandos para ejecutar fixes
- Score de seguridad

#### Acción después:

```bash
# Aplicar fixes recomendados por Gemini
cd backend
npm install <paquetes-recomendados>
npm audit fix

cd ../admin_web
npm install <paquetes-recomendados>
npm audit fix
```

---

### PASO 3: Ejecutar Auditoría de Validación de Inputs

**Tiempo:** 20 minutos
**Prioridad:** CRÍTICA

#### Archivos necesarios:
- `backend/src/routes/*.js` (TODOS los archivos)
- `backend/src/controllers/*.js` (TODOS los archivos)
- `backend/src/utils/validators.js`
- `backend/src/utils/sanitizers.js`

#### Instrucciones:

1. Abrir archivo: `.security-audit/prompt-input-validation-audit.md`
2. **Copiar TODO el contenido**
3. En Google AI Studio, crear **nuevo chat**
4. Pegar el prompt
5. **Adjuntar archivos:**
   - Todos los archivos en `backend/src/routes/`
   - Todos los archivos en `backend/src/controllers/`
   - `backend/src/utils/validators.js`
   - `backend/src/utils/sanitizers.js`

   **Nota:** Si son muchos archivos, puedes:
   - Subir los más críticos primero (auth, recolecciones, contenedores)
   - Ejecutar la auditoría por partes
   - O combinar archivos en un ZIP

6. Click en **"Run"**
7. **Guardar el reporte**

#### Qué esperar:

- Lista de endpoints sin validación
- Vulnerabilidades de NoSQL injection
- Vulnerabilidades de XSS
- Código vulnerable con fixes recomendados

---

### PASO 4: Ejecutar Auditoría de Seguridad API (OWASP)

**Tiempo:** 30 minutos
**Prioridad:** CRÍTICA

#### Archivos necesarios:
- `backend/src/routes/*.js`
- `backend/src/middleware/authMiddleware.js`
- `backend/src/controllers/*.js`
- `backend/src/index.js`

#### Instrucciones:

1. Abrir: `.security-audit/prompt-api-security-audit.md`
2. **Copiar TODO**
3. Nuevo chat en Google AI Studio
4. Pegar prompt
5. **Adjuntar archivos** (mismo proceso que paso anterior)
6. **Run**
7. **Guardar reporte**

#### Qué esperar:

- Análisis OWASP API Security Top 10
- IDOR/BOLA vulnerabilities
- Problemas de autorización
- Exposición de datos sensibles
- Fixes con código

---

### PASO 5: Ejecutar Auditoría de File Uploads

**Tiempo:** 15 minutos
**Prioridad:** ALTA

#### Archivos necesarios:
- `backend/src/routes/contenedores.js`
- `backend/src/routes/recolecciones.js`
- `backend/src/routes/repartidores.js`
- `backend/src/config/firebase.js`

#### Instrucciones:

1. Abrir: `.security-audit/prompt-file-upload-audit.md`
2. **Copiar TODO**
3. Nuevo chat
4. Pegar prompt
5. **Adjuntar archivos de uploads**
6. **Run**
7. **Guardar reporte**

#### Qué esperar:

- Vulnerabilidades de path traversal
- MIME type spoofing
- DoS via large files
- RCE en procesamiento de archivos
- Fixes detallados

---

## 📊 DESPUÉS DE LAS AUDITORÍAS

### Consolidar Reportes

Gemini habrá generado 4 reportes. Crear un documento consolidado:

```markdown
# REPORTE CONSOLIDADO DE AUDITORÍAS
Fecha: 2025-12-24

## AUDITORÍA 1: Dependencias
[copiar reporte de Gemini]

## AUDITORÍA 2: Validación de Inputs
[copiar reporte de Gemini]

## AUDITORÍA 3: Seguridad API
[copiar reporte de Gemini]

## AUDITORÍA 4: File Uploads
[copiar reporte de Gemini]

## RESUMEN EJECUTIVO
- Total vulnerabilidades críticas: X
- Total vulnerabilidades altas: X
- Total vulnerabilidades medias: X
- Score total: X/100

## PLAN DE ACCIÓN PRIORITARIO
1. [Fix más crítico]
2. [Fix crítico 2]
3. ...
```

### Priorizar Fixes

1. **Críticas** (Fix esta semana):
   - Vulnerabilidades con score CVE > 9.0
   - IDOR/BOLA
   - RCE en file uploads
   - Dependencias con exploits públicos

2. **Altas** (Fix este mes):
   - NoSQL injection
   - XSS
   - Missing authorization
   - Path traversal

3. **Medias** (Fix próximos 3 meses):
   - Validaciones débiles
   - Exposición de metadata
   - Rate limiting faltante

---

## 🔧 APLICAR FIXES

### Crear Branch de Seguridad

```bash
git checkout -b security/gemini-audit-fixes
```

### Implementar Fixes por Prioridad

```bash
# Ejemplo: Fix de dependencias
cd backend
npm install express-rate-limit@latest
npm audit fix

git add package.json package-lock.json
git commit -m "fix: Actualizar dependencias vulnerables (Gemini Audit)"
```

### Testing

```bash
# Ejecutar tests después de cada fix
npm test

# Verificar que no rompiste nada
npm run build
npm start
```

### Crear PR

```bash
git push origin security/gemini-audit-fixes

# Luego en GitHub crear PR con:
# Título: "Security: Fixes from Gemini Pro Audit"
# Descripción: [listar vulnerabilidades corregidas]
```

---

## ⚠️ TROUBLESHOOTING

### Problema 1: Gemini dice "Too many files"

**Solución:** Ejecutar auditoría por partes

```bash
# Auditoría 1: Solo rutas críticas
- auth.js
- recolecciones.js
- contenedores.js

# Auditoría 2: Resto de rutas
- rutas.js
- empleados.js
- etc.
```

### Problema 2: Gemini no entiende el contexto

**Solución:** Agregar contexto al prompt

```
CONTEXTO ADICIONAL:
Este es un sistema multi-tenant de envíos con:
- Backend: Node.js + Express + Firestore
- Auth: Firebase Auth
- Roles: admin, almacen_usa, repartidor, etc.
- Ya implementado: rate limiting, RBAC básico
```

### Problema 3: Respuesta muy genérica

**Solución:** Pedir análisis específico

```
Por favor analiza línea por línea los siguientes archivos
y busca específicamente:
1. IDOR en endpoints GET/:id
2. Missing companyId validation
3. NoSQL injection en queries
```

---

## 📈 MÉTRICAS DE ÉXITO

Después de aplicar todos los fixes, deberías ver:

| Métrica | Antes | Después |
|---------|-------|---------|
| Vulnerabilidades Críticas | ~10 | 0 |
| Vulnerabilidades Altas | ~20 | <5 |
| npm audit (backend) | Warnings | 0 warnings |
| npm audit (frontend) | Warnings | 0 warnings |
| OWASP API Score | 60/100 | 90+/100 |
| File Upload Score | 40/100 | 95+/100 |

---

## 🎯 CHECKLIST DE AUDITORÍAS

```
□ Auditoría 1: Dependencias ejecutada
  □ Reporte guardado
  □ Fixes aplicados
  □ npm audit clean

□ Auditoría 2: Validación de Inputs ejecutada
  □ Reporte guardado
  □ Validadores implementados
  □ Tests creados

□ Auditoría 3: Seguridad API ejecutada
  □ Reporte guardado
  □ IDOR fixes aplicados
  □ Authorization refactorizada

□ Auditoría 4: File Uploads ejecutada
  □ Reporte guardado
  □ MIME validation implementada
  □ Path traversal corregido

□ Consolidación
  □ Reporte ejecutivo creado
  □ Todos los fixes en GitHub
  □ PR creado y mergeado
  □ Production deployment exitoso
```

---

## 📚 RECURSOS ADICIONALES

**OWASP Resources:**
- https://owasp.org/www-project-api-security/
- https://owasp.org/www-project-top-ten/

**CVE Databases:**
- https://nvd.nist.gov/
- https://www.cvedetails.com/
- https://snyk.io/vuln/

**Testing Tools:**
- Burp Suite: https://portswigger.net/burp
- OWASP ZAP: https://www.zaproxy.org/
- Postman: https://www.postman.com/

---

## 💡 TIPS PARA MEJORES RESULTADOS

1. **Sé específico** en los prompts
2. **Adjunta archivos completos**, no snippets
3. **Pide ejemplos de código** para los fixes
4. **Pregunta por prioridad** de vulnerabilidades
5. **Solicita tests** para validar fixes
6. **Pide comandos específicos** para aplicar fixes

---

## 🔄 AUDITORÍAS PERIÓDICAS

**Recomendación:** Ejecutar estas auditorías cada:

- **Mensualmente:** Auditoría de dependencias (npm audit)
- **Trimestralmente:** Auditorías completas (las 4)
- **Antes de releases mayores:** Auditorías completas
- **Después de agregar features:** Auditoría específica de la feature

---

## 📞 SOPORTE

Si encuentras problemas con los prompts o las auditorías:

1. Revisar este documento
2. Revisar el prompt específico (tienen instrucciones detalladas)
3. Modificar el prompt para tu caso específico
4. Preguntar a Gemini directamente: "¿Qué necesitas para analizar X?"

---

**Creado por:** Claude Sonnet 4.5
**Fecha:** 2025-12-24
**Versión:** 1.0
**Estado:** ✅ LISTO PARA USAR
