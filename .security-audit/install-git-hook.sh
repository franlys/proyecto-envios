#!/bin/bash
# .security-audit/install-git-hook.sh
# Script para instalar el git hook de pre-commit

echo "🔧 Instalando git hook de auditoría de seguridad..."

# Crear directorio de hooks si no existe
mkdir -p .git/hooks

# Crear pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook: Auditoría de seguridad automática

echo "🛡️ Ejecutando auditoría de seguridad..."

# Ejecutar auditoría
node .security-audit/security-audit-auto.js --block-on-critical

# Capturar código de salida
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Commit bloqueado por vulnerabilidades críticas"
  echo "   Revisa los reportes en .security-audit/reportes/"
  echo "   Para hacer commit sin auditoría: git commit --no-verify"
  echo ""
  exit 1
fi

echo "✅ Auditoría de seguridad completada"
exit 0
EOF

# Dar permisos de ejecución
chmod +x .git/hooks/pre-commit

echo "✅ Git hook instalado en .git/hooks/pre-commit"
echo ""
echo "📝 Uso:"
echo "  - El hook se ejecutará automáticamente en cada commit"
echo "  - Para saltear: git commit --no-verify"
echo "  - Para desinstalar: rm .git/hooks/pre-commit"
echo ""
