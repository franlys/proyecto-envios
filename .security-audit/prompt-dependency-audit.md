# 🔍 AUDITORÍA DE DEPENDENCIAS - Gemini Pro

**Fecha:** 2025-12-24
**Proyecto:** Sistema de Envíos Multi-tenant
**Objetivo:** Detectar vulnerabilidades en dependencias npm

---

## 📋 INSTRUCCIONES PARA GEMINI

Eres un experto en seguridad de aplicaciones Node.js. Analiza las dependencias del proyecto y encuentra vulnerabilidades conocidas.

### ARCHIVOS A ANALIZAR:

1. `backend/package.json` - Dependencias del backend
2. `admin_web/package.json` - Dependencias del frontend
3. Output de `npm audit` si está disponible

### TAREAS:

1. **Revisar todas las dependencias** listadas en package.json
2. **Identificar versiones con CVEs conocidos** (buscar en bases de datos públicas)
3. **Evaluar el nivel de riesgo** (Critical, High, Medium, Low)
4. **Recomendar versiones seguras** para actualizar
5. **Identificar dependencias obsoletas** (no actualizadas en +2 años)
6. **Revisar dependencias indirectas** (transitive dependencies)

### DEPENDENCIAS CRÍTICAS A REVISAR:

**Backend:**
- express
- firebase-admin
- cors
- dotenv
- multer
- express-rate-limit
- jsonwebtoken (si se usa)
- bcrypt (si se usa)

**Frontend:**
- react
- react-dom
- axios
- @mui/material
- react-router-dom

### FORMATO DE REPORTE:

```markdown
# REPORTE DE AUDITORÍA DE DEPENDENCIAS

## 🚨 VULNERABILIDADES CRÍTICAS (CVE Score 9.0-10.0)

### Backend
- **Paquete:** [nombre]
- **Versión actual:** [versión]
- **CVE:** [CVE-XXXX-XXXXX]
- **Descripción:** [descripción de la vulnerabilidad]
- **Impacto:** [RCE / XSS / DoS / etc]
- **Versión segura:** [versión recomendada]
- **Comando fix:** `npm install [paquete]@[versión]`

### Frontend
[igual que arriba]

## ⚠️ VULNERABILIDADES ALTAS (CVE Score 7.0-8.9)
[misma estructura]

## 📊 VULNERABILIDADES MEDIAS (CVE Score 4.0-6.9)
[misma estructura]

## 📦 DEPENDENCIAS OBSOLETAS
- [paquete]: última actualización hace [tiempo]
  - Recomendación: [migrar a X / actualizar / reemplazar]

## ✅ RECOMENDACIONES

1. Actualizar inmediatamente: [lista]
2. Planificar migración: [lista]
3. Monitorear: [lista]

## 🔧 COMANDOS DE ACTUALIZACIÓN

```bash
# Backend
cd backend
npm install [paquete1]@[versión] [paquete2]@[versión]
npm audit fix

# Frontend
cd admin_web
npm install [paquete1]@[versión]
npm audit fix
```

## 📈 SCORE DE SEGURIDAD

- Vulnerabilidades Críticas: [número]
- Vulnerabilidades Altas: [número]
- Vulnerabilidades Medias: [número]
- Score Total: [X]/100
```

### INSTRUCCIONES ESPECIALES:

1. **NO recomendar breaking changes** sin advertir
2. **Verificar compatibilidad** entre versiones
3. **Priorizar fixes** que no rompan el código existente
4. **Incluir enlaces** a CVE databases para cada vulnerabilidad
5. **Sugerir GitHub Dependabot** si no está configurado

---

## 🚀 CÓMO USAR ESTE PROMPT

1. Ir a https://aistudio.google.com/
2. Crear nuevo chat
3. Copiar este prompt completo
4. Adjuntar archivos:
   - `backend/package.json`
   - `admin_web/package.json`
   - Output de `npm audit` (opcional)
5. Enviar

---

## 📌 CONTEXTO ADICIONAL

**Stack tecnológico:**
- Backend: Node.js + Express + Firebase Admin SDK
- Frontend: React + Material-UI
- Base de datos: Firestore
- Autenticación: Firebase Auth
- Storage: Firebase Storage
- Deployment: Cloud Run (backend), Vercel (frontend)

**Características de seguridad ya implementadas:**
- Rate limiting con express-rate-limit
- Firestore Rules con custom claims
- Multi-tenant isolation
- RBAC granular
- Validación y sanitización de inputs

---

**Análisis completado por:** Gemini Pro
**Fecha de análisis:** [YYYY-MM-DD]
