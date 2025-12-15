#!/bin/bash

# Script para configurar las variables de entorno
# Ejecutar con: bash setup-env.sh

echo "🔐 Configurando variables de entorno para The Circle..."
echo ""

# Crear archivo .env para desarrollo local
cat > .env << 'EOF'
# Google reCAPTCHA Keys - Production
# Site Key (Public) - Se usa en el frontend
VITE_RECAPTCHA_SITE_KEY=6LdeGywsAAAAAC0GnkPK2U5GswwSjQEuXhJ6mnt6

# Secret Key (Private) - Se usa en el backend para verificación
RECAPTCHA_SECRET_KEY=6LdeGywsAAAAAEBCLXeDGIpXB3msNsSy3l2VYbAb
EOF

echo "✅ Archivo .env creado exitosamente"
echo ""
echo "📝 Variables configuradas:"
echo "   - VITE_RECAPTCHA_SITE_KEY (para frontend)"
echo "   - RECAPTCHA_SECRET_KEY (para backend)"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - El archivo .env está en .gitignore y NO se subirá a Git"
echo "   - Para Vercel, configura estas variables en Settings → Environment Variables"
echo ""
echo "🚀 Ahora puedes ejecutar: npm run dev"
echo ""

