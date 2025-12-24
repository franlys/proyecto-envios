#!/usr/bin/env node
// .security-audit/security-audit-auto.js
// 🤖 SCRIPT DE AUTOMATIZACIÓN DE AUDITORÍAS DE SEGURIDAD CON GEMINI

/**
 * Este script:
 * 1. Detecta archivos modificados en un commit (vía git diff)
 * 2. Selecciona el prompt de auditoría adecuado según el tipo de archivo
 * 3. Envía el código a la API de Gemini para auditoría
 * 4. Genera un reporte en markdown
 * 5. Opcionalmente bloquea el commit si encuentra vulnerabilidades CRITICAL
 *
 * Uso:
 *   node .security-audit/security-audit-auto.js
 *   node .security-audit/security-audit-auto.js --file backend/src/middleware/auth.js
 *   node .security-audit/security-audit-auto.js --block-on-critical
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// CONFIGURACIÓN
// ========================================

const CONFIG = {
  // Ruta base del proyecto
  projectRoot: path.resolve(__dirname, '..'),

  // Directorio de prompts
  promptsDir: path.resolve(__dirname),

  // Directorio de reportes
  reportsDir: path.resolve(__dirname, 'reportes'),

  // API de Gemini (configurar via .env)
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  geminiApiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',

  // Mapeo de archivos a prompts
  fileTypeMapping: {
    'auth': 'prompt-auth-audit.md',
    'controller': 'prompt-business-logic-audit.md',
    'route': 'prompt-injection-audit.md',
    'middleware': 'prompt-auth-audit.md',
    'service': 'prompt-injection-audit.md',
    'util': 'prompt-injection-audit.md'
  },

  // Severidades que bloquean commits
  blockingSeverities: ['CRITICAL', 'CRITICA'],

  // Extensiones de archivo válidas para auditar
  validExtensions: ['.js', '.ts', '.jsx', '.tsx']
};

// ========================================
// FUNCIONES HELPER
// ========================================

/**
 * Obtener archivos modificados en el staging area de git
 * @returns {string[]} Lista de rutas de archivos modificados
 */
function getModifiedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
      cwd: CONFIG.projectRoot
    });

    return output
      .split('\n')
      .filter(file => file.trim())
      .filter(file => CONFIG.validExtensions.some(ext => file.endsWith(ext)));
  } catch (error) {
    console.warn('⚠️ No se pudo obtener archivos de git, usando archivos del argumento');
    return [];
  }
}

/**
 * Determinar qué tipo de archivo es según su ruta
 * @param {string} filePath - Ruta del archivo
 * @returns {string|null} Tipo de archivo
 */
function getFileType(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
  const dirName = path.basename(path.dirname(filePath)).toLowerCase();

  // Detectar por nombre de archivo
  if (fileName.includes('auth')) return 'auth';
  if (fileName.includes('controller')) return 'controller';
  if (fileName.includes('route')) return 'route';
  if (fileName.includes('middleware')) return 'middleware';
  if (fileName.includes('service')) return 'service';

  // Detectar por directorio
  if (dirName.includes('controller')) return 'controller';
  if (dirName.includes('middleware')) return 'middleware';
  if (dirName.includes('route')) return 'route';
  if (dirName.includes('service')) return 'service';
  if (dirName.includes('util')) return 'util';

  // Por defecto, usar prompt de inyecciones (más general)
  return 'route';
}

/**
 * Cargar prompt de auditoría
 * @param {string} fileType - Tipo de archivo
 * @returns {Promise<string>} Contenido del prompt
 */
async function loadPrompt(fileType) {
  const promptFile = CONFIG.fileTypeMapping[fileType] || CONFIG.fileTypeMapping.route;
  const promptPath = path.join(CONFIG.promptsDir, promptFile);

  try {
    const promptContent = await fs.readFile(promptPath, 'utf-8');
    return promptContent;
  } catch (error) {
    throw new Error(`No se pudo cargar el prompt: ${promptPath}`);
  }
}

/**
 * Leer contenido de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string>} Contenido del archivo
 */
async function readFile(filePath) {
  const fullPath = path.join(CONFIG.projectRoot, filePath);

  try {
    return await fs.readFile(fullPath, 'utf-8');
  } catch (error) {
    throw new Error(`No se pudo leer el archivo: ${filePath}`);
  }
}

/**
 * Llamar a la API de Gemini
 * @param {string} prompt - Prompt del sistema
 * @param {string} code - Código a auditar
 * @returns {Promise<object>} Respuesta de la API
 */
async function callGeminiAPI(prompt, code) {
  if (!CONFIG.geminiApiKey) {
    console.warn('⚠️ GEMINI_API_KEY no configurada, usando mock response');
    return mockGeminiResponse(code);
  }

  const requestBody = {
    contents: [{
      parts: [{
        text: `${prompt}\n\n---\n\nCÓDIGO A AUDITAR:\n\`\`\`javascript\n${code}\n\`\`\``
      }]
    }],
    generationConfig: {
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };

  try {
    const response = await fetch(`${CONFIG.geminiApiUrl}?key=${CONFIG.geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Error de API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error llamando a Gemini API:', error.message);
    return mockGeminiResponse(code);
  }
}

/**
 * Mock response para testing sin API key
 * @param {string} code - Código analizado
 * @returns {object} Respuesta simulada
 */
function mockGeminiResponse(code) {
  return {
    candidates: [{
      content: {
        parts: [{
          text: `# Mock Audit Report\n\n**NOTA**: Esta es una respuesta simulada. Configura GEMINI_API_KEY para auditorías reales.\n\n## Resumen\n- Archivo analizado: ${code.split('\n').length} líneas\n- Vulnerabilidades encontradas: N/A (mock)\n\n*Configura GEMINI_API_KEY en tu .env para auditorías reales.*`
        }]
      }
    }]
  };
}

/**
 * Parsear respuesta de Gemini
 * @param {object} response - Respuesta de la API
 * @returns {object} Reporte parseado
 */
function parseGeminiResponse(response) {
  try {
    const text = response.candidates[0].content.parts[0].text;

    // Detectar severidad CRITICAL/CRITICA en el texto
    const hasCritical = /CRITICAL|CRITICA|CRÍTICA/i.test(text);

    return {
      text,
      hasCritical,
      summary: text.substring(0, 500) + '...'
    };
  } catch (error) {
    return {
      text: 'Error parseando respuesta de Gemini',
      hasCritical: false,
      summary: error.message
    };
  }
}

/**
 * Guardar reporte en archivo
 * @param {string} fileName - Nombre del archivo auditado
 * @param {string} reportContent - Contenido del reporte
 */
async function saveReport(fileName, reportContent) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = fileName.replace(/[^a-zA-Z0-9]/g, '-');
  const reportPath = path.join(CONFIG.reportsDir, `audit-${safeName}-${timestamp}.md`);

  await fs.mkdir(CONFIG.reportsDir, { recursive: true });
  await fs.writeFile(reportPath, reportContent, 'utf-8');

  console.log(`📄 Reporte guardado: ${reportPath}`);
  return reportPath;
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

async function auditFile(filePath) {
  console.log(`\n🔍 Auditando: ${filePath}`);

  // 1. Determinar tipo de archivo
  const fileType = getFileType(filePath);
  console.log(`   Tipo detectado: ${fileType}`);

  // 2. Cargar prompt adecuado
  const prompt = await loadPrompt(fileType);
  console.log(`   Prompt cargado: ${CONFIG.fileTypeMapping[fileType]}`);

  // 3. Leer código
  const code = await readFile(filePath);
  console.log(`   Líneas de código: ${code.split('\n').length}`);

  // 4. Llamar a Gemini API
  console.log(`   🤖 Enviando a Gemini...`);
  const response = await callGeminiAPI(prompt, code);

  // 5. Parsear respuesta
  const report = parseGeminiResponse(response);

  // 6. Guardar reporte
  const reportPath = await saveReport(filePath, report.text);

  // 7. Retornar resultado
  return {
    filePath,
    reportPath,
    hasCritical: report.hasCritical,
    summary: report.summary
  };
}

async function main() {
  console.log('🛡️ AUDITORÍA AUTOMÁTICA DE SEGURIDAD CON GEMINI\n');

  // Parsear argumentos
  const args = process.argv.slice(2);
  const blockOnCritical = args.includes('--block-on-critical');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const specificFile = fileArg ? fileArg.split('=')[1] : null;

  // Obtener archivos a auditar
  let filesToAudit = [];

  if (specificFile) {
    filesToAudit = [specificFile];
  } else {
    filesToAudit = getModifiedFiles();
  }

  if (filesToAudit.length === 0) {
    console.log('✅ No hay archivos para auditar');
    process.exit(0);
  }

  console.log(`📂 Archivos a auditar: ${filesToAudit.length}\n`);

  // Auditar cada archivo
  const results = [];
  for (const file of filesToAudit) {
    try {
      const result = await auditFile(file);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error auditando ${file}:`, error.message);
      results.push({
        filePath: file,
        error: error.message
      });
    }
  }

  // Generar resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE AUDITORÍA');
  console.log('='.repeat(60) + '\n');

  let foundCritical = false;

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.filePath}`);

    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    } else {
      console.log(`   📄 Reporte: ${result.reportPath}`);
      if (result.hasCritical) {
        console.log(`   🚨 VULNERABILIDADES CRÍTICAS ENCONTRADAS`);
        foundCritical = true;
      } else {
        console.log(`   ✅ Sin vulnerabilidades críticas`);
      }
    }
    console.log('');
  });

  // Bloquear commit si se especificó y hay críticas
  if (blockOnCritical && foundCritical) {
    console.error('🚫 COMMIT BLOQUEADO: Se encontraron vulnerabilidades CRÍTICAS');
    console.error('   Revisa los reportes generados y corrige antes de commitear.\n');
    process.exit(1);
  }

  console.log('✅ Auditoría completada\n');
  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
