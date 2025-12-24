# 🛡️ Sistema de Auditoría de Seguridad Automatizada

Sistema completo de auditoría de seguridad usando **Gemini Pro** para detectar vulnerabilidades en el código antes de hacer commit.

---

## 📚 Índice de Documentación

### ⚡ Inicio Rápido
- **[QUICK-START.md](QUICK-START.md)** - ⚡ Empieza a auditar en menos de 5 minutos

### 🎯 Guías Principales
- **[RESUMEN-PROMPTS-DISPONIBLES.md](RESUMEN-PROMPTS-DISPONIBLES.md)** - 📋 Lista completa de 9 prompts disponibles
- **[GUIA-PROMPTS-SIGUIENTES-PASOS.md](GUIA-PROMPTS-SIGUIENTES-PASOS.md)** - 🚀 Plan de auditoría con timeline
- **[RESUMEN-FINAL-SEGURIDAD.md](RESUMEN-FINAL-SEGURIDAD.md)** - 📊 Resumen ejecutivo de mejoras
- **[CHANGELOG-SECURITY.md](CHANGELOG-SECURITY.md)** - 📝 Registro de todas las correcciones

### 🔐 Prompts de Auditoría

#### ✅ Prompts Originales
- **[prompt-auth-audit.md](prompt-auth-audit.md)** - Autenticación y autorización
- **[prompt-injection-audit.md](prompt-injection-audit.md)** - NoSQL injection, XSS, SSRF
- **[prompt-business-logic-audit.md](prompt-business-logic-audit.md)** - Lógica de negocio financiera

#### 🆕 Prompts Nuevos (2025-12-24)
- **[prompt-race-condition-audit.md](prompt-race-condition-audit.md)** - Race conditions y concurrencia
- **[prompt-rate-limiting-audit.md](prompt-rate-limiting-audit.md)** - DoS y brute force
- **[prompt-firestore-rules-audit.md](prompt-firestore-rules-audit.md)** - Firestore Security Rules

### 📁 Reportes Generados
- [reportes/race-condition-fix-2025-12-24.md](reportes/race-condition-fix-2025-12-24.md)
- [reportes/] - Otros reportes de auditoría

---

## 📂 Estructura de Archivos

```
.security-audit/
├── README.md                              # Este archivo
│
├── GUIAS/
│   ├── RESUMEN-PROMPTS-DISPONIBLES.md     # 📋 Índice de 9 prompts
│   ├── GUIA-PROMPTS-SIGUIENTES-PASOS.md   # 🚀 Plan de auditoría
│   ├── GUIA-USO-GEMINI-SEGURIDAD.md       # 📖 Uso manual de Gemini
│   ├── RESUMEN-FINAL-SEGURIDAD.md         # 📊 Resumen ejecutivo
│   └── CHANGELOG-SECURITY.md              # 📝 Registro de cambios
│
├── PROMPTS ORIGINALES/
│   ├── prompt-auth-audit.md               # 🔐 Autenticación
│   ├── prompt-injection-audit.md          # 💉 Inyecciones
│   └── prompt-business-logic-audit.md     # 💰 Lógica financiera
│
├── PROMPTS NUEVOS/
│   ├── prompt-race-condition-audit.md     # 🔄 Race conditions
│   ├── prompt-rate-limiting-audit.md      # 🚦 Rate limiting
│   └── prompt-firestore-rules-audit.md    # 🔥 Firestore Rules
│
├── AUTOMATIZACIÓN/
│   ├── security-audit-auto.js             # 🤖 Script de auditoría
│   └── install-git-hook.sh                # 🪝 Git hook installer
│
└── reportes/                              # 📄 Reportes generados
    ├── race-condition-fix-2025-12-24.md
    └── [otros reportes]
```

---

## 🚀 Inicio Rápido

### Opción 1: Auditoría Manual con Gemini

1. Abre tu interfaz de Gemini Pro (AnythingLLM o similar)
2. Abre el prompt adecuado: `prompt-auth-audit.md`, `prompt-injection-audit.md`, etc.
3. Copia TODO el contenido del prompt
4. Pega en Gemini y espera confirmación
5. Copia el código del archivo a auditar (ej: `backend/src/middleware/auth.js`)
6. Pega el código en Gemini
7. Gemini generará un reporte de vulnerabilidades

**Ver**: [GUIA-USO-GEMINI-SEGURIDAD.md](GUIA-USO-GEMINI-SEGURIDAD.md)

---

### Opción 2: Auditoría Automática con Script

#### Requisitos
- Node.js 18+
- API Key de Gemini (opcional, funciona en modo mock sin ella)

#### Configuración

1. **Obtener API Key de Gemini** (gratis):
   ```bash
   # Visita: https://aistudio.google.com/app/apikey
   # Crea una API key y cópiala
   ```

2. **Configurar variable de entorno**:
   ```bash
   # En tu .env (raíz del proyecto):
   echo "GEMINI_API_KEY=tu-api-key-aqui" >> .env
   ```

3. **Instalar dependencias** (si no están):
   ```bash
   # El script usa solo APIs nativas de Node.js, no requiere npm install
   ```

#### Uso del Script

**Auditar archivos modificados en staging**:
```bash
node .security-audit/security-audit-auto.js
```

**Auditar un archivo específico**:
```bash
node .security-audit/security-audit-auto.js --file=backend/src/middleware/auth.js
```

**Bloquear si encuentra vulnerabilidades críticas**:
```bash
node .security-audit/security-audit-auto.js --block-on-critical
```

#### Ejemplo de Salida

```
🛡️ AUDITORÍA AUTOMÁTICA DE SEGURIDAD CON GEMINI

📂 Archivos a auditar: 2

🔍 Auditando: backend/src/middleware/auth.js
   Tipo detectado: auth
   Prompt cargado: prompt-auth-audit.md
   Líneas de código: 207
   🤖 Enviando a Gemini...
📄 Reporte guardado: .security-audit/reportes/audit-auth-2025-12-23.md

🔍 Auditando: backend/src/routes/contenedores.js
   Tipo detectado: route
   Prompt cargado: prompt-injection-audit.md
   Líneas de código: 670
   🤖 Enviando a Gemini...
📄 Reporte guardado: .security-audit/reportes/audit-contenedores-2025-12-23.md

============================================================
📊 RESUMEN DE AUDITORÍA
============================================================

1. backend/src/middleware/auth.js
   📄 Reporte: .security-audit/reportes/audit-auth-2025-12-23.md
   ✅ Sin vulnerabilidades críticas

2. backend/src/routes/contenedores.js
   📄 Reporte: .security-audit/reportes/audit-contenedores-2025-12-23.md
   🚨 VULNERABILIDADES CRÍTICAS ENCONTRADAS

🚫 COMMIT BLOQUEADO: Se encontraron vulnerabilidades CRÍTICAS
   Revisa los reportes generados y corrige antes de commitear.
```

---

### Opción 3: Git Hook Automático (Pre-Commit)

#### Instalación del Hook

**En Linux/Mac**:
```bash
chmod +x .security-audit/install-git-hook.sh
./.security-audit/install-git-hook.sh
```

**En Windows (Git Bash)**:
```bash
bash .security-audit/install-git-hook.sh
```

**Manual** (si el script no funciona):
```bash
# 1. Crear archivo .git/hooks/pre-commit
# 2. Copiar el contenido de install-git-hook.sh
# 3. Dar permisos: chmod +x .git/hooks/pre-commit
```

#### Cómo Funciona

1. **Antes de cada commit**:
   - Git ejecuta automáticamente el hook `pre-commit`
   - El hook ejecuta `security-audit-auto.js`
   - Audita todos los archivos en staging (git add)

2. **Si encuentra vulnerabilidades CRÍTICAS**:
   - Bloquea el commit
   - Muestra mensaje de error
   - Genera reportes en `.security-audit/reportes/`

3. **Si NO encuentra críticas**:
   - Permite el commit
   - Genera reportes para revisión posterior

#### Saltar el Hook (Emergencias)

```bash
# Para un commit sin auditoría:
git commit --no-verify -m "mensaje"

# ⚠️ Usa solo en emergencias, NO para evitar corregir vulnerabilidades
```

---

## 🔧 Configuración Avanzada

### Mapeo de Archivos a Prompts

El script detecta automáticamente qué prompt usar según el nombre/directorio del archivo:

| Tipo de Archivo | Prompt Usado | Detecta |
|-----------------|--------------|---------|
| `*auth*` | `prompt-auth-audit.md` | JWT, roles, sesiones |
| `*controller*` | `prompt-business-logic-audit.md` | Race conditions, lógica financiera |
| `*route*`, `*service*` | `prompt-injection-audit.md` | NoSQL injection, XSS, SSRF |
| `*middleware*` | `prompt-auth-audit.md` | Autorización, permisos |
| `*util*` | `prompt-injection-audit.md` | Validación de inputs |

### Personalizar Mapeo

Edita `security-audit-auto.js`:

```javascript
const CONFIG = {
  fileTypeMapping: {
    'auth': 'prompt-auth-audit.md',
    'controller': 'prompt-business-logic-audit.md',
    // Agregar custom mappings:
    'payment': 'prompt-business-logic-audit.md',
    'upload': 'prompt-injection-audit.md'
  }
};
```

---

## 📊 Integración con CI/CD

### GitHub Actions

Crear `.github/workflows/security-audit.yml`:

```yaml
name: Security Audit

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Run Security Audit
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          node .security-audit/security-audit-auto.js --block-on-critical

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: .security-audit/reportes/
```

### GitLab CI

Crear `.gitlab-ci.yml`:

```yaml
security-audit:
  stage: test
  image: node:18
  script:
    - node .security-audit/security-audit-auto.js --block-on-critical
  artifacts:
    when: always
    paths:
      - .security-audit/reportes/
  only:
    - merge_requests
```

---

## 🆘 Solución de Problemas

### "GEMINI_API_KEY no configurada"

- El script funciona en **modo mock** sin API key
- Para auditorías reales, configura `GEMINI_API_KEY` en `.env`
- Obtén una gratis en: https://aistudio.google.com/app/apikey

### "Error: No se pudo cargar el prompt"

- Verifica que los archivos `prompt-*.md` existan en `.security-audit/`
- Verifica que no hayan sido renombrados

### "Permission denied" en Git Hook

```bash
chmod +x .git/hooks/pre-commit
```

### El hook no se ejecuta

- Verifica que existe: `ls -la .git/hooks/pre-commit`
- Verifica que tenga permisos de ejecución (`-rwxr-xr-x`)
- Prueba manualmente: `.git/hooks/pre-commit`

---

## 📚 Recursos

- **Prompts Especializados**: Ver archivos `prompt-*.md`
- **Reportes de Ejemplo**: Ver carpeta `reportes/`
- **Guía de Uso Manual**: [GUIA-USO-GEMINI-SEGURIDAD.md](GUIA-USO-GEMINI-SEGURIDAD.md)

---

## 🔒 Seguridad de la API Key

**⚠️ IMPORTANTE**: NO subas tu `GEMINI_API_KEY` al repositorio

```bash
# En .gitignore (ya debería estar):
.env
.env.local
.env.production
```

Si accidentalmente la subiste:
1. Revoca la API key en https://aistudio.google.com/app/apikey
2. Genera una nueva
3. Actualiza `.env` local
4. Haz commit de la revocación

---

## 🤝 Contribuir

Para mejorar los prompts de auditoría:

1. Edita los archivos `prompt-*.md`
2. Prueba con archivos reales
3. Documenta mejoras en este README

---

**Última actualización**: 2025-12-23
**Mantenedor**: Equipo de Desarrollo
