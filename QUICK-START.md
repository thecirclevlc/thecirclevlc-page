# ⚡ Quick Start - Sistema de Seguridad

## 🚀 Inicio Rápido (5 minutos)

### Para Desarrollo Local

```bash
# 1. Las variables de entorno ya están configuradas ✅
cat .env

# 2. Instalar dependencias (si no lo has hecho)
npm install

# 3. Ejecutar en desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:5173/form
```

### Para Deploy en Vercel

```bash
# 1. Commit y push
git add .
git commit -m "Add reCAPTCHA security system"
git push origin main

# 2. Configurar en Vercel (IMPORTANTE!)
# Ve a: https://vercel.com/dashboard
# Tu Proyecto → Settings → Environment Variables
# Agrega:

VITE_RECAPTCHA_SITE_KEY = 6LdeGywsAAAAAC0GnkPK2U5GswwSjQEuXhJ6mnt6
RECAPTCHA_SECRET_KEY = 6LdeGywsAAAAAEBCLXeDGIpXB3msNsSy3l2VYbAb

# 3. Redeploy desde Vercel Dashboard
# Deployments → ... → Redeploy
```

---

## ✅ Verificación Rápida

### Test 1: CAPTCHA Visible
1. Abre `/form`
2. Scroll hasta el final
3. ✅ Debes ver el widget de reCAPTCHA

### Test 2: Validación Funciona
1. Llena el formulario
2. NO marques el CAPTCHA
3. Click "DONE"
4. ✅ Debe mostrar error

### Test 3: Envío Exitoso
1. Marca el CAPTCHA
2. Click "DONE"
3. ✅ Debe enviar y mostrar mensaje de éxito

---

## 📚 Documentación Completa

- **[SECURITY-SUMMARY.md](./SECURITY-SUMMARY.md)** - Resumen completo
- **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)** - Deploy a Vercel
- **[SECURITY-SETUP.md](./SECURITY-SETUP.md)** - Configuración detallada
- **[CAPTCHA-SETUP.md](./CAPTCHA-SETUP.md)** - Setup de reCAPTCHA

---

## 🔑 Claves Configuradas

✅ **Site Key:** `6LdeGywsAAAAAC0GnkPK2U5GswwSjQEuXhJ6mnt6`
✅ **Secret Key:** `6LdeGywsAAAAAEBCLXeDGIpXB3msNsSy3l2VYbAb`

---

## ❓ Problemas?

**CAPTCHA no aparece:**
```bash
# Verifica que la variable esté configurada
echo $VITE_RECAPTCHA_SITE_KEY
```

**Error al verificar:**
```bash
# Revisa los logs
vercel logs tu-proyecto.vercel.app
```

**Más ayuda:** Lee [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)

---

🎉 **Ya está todo configurado y listo para usar!**

