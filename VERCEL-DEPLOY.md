# 🚀 Guía de Deploy a Vercel con Seguridad Completa

## Configuración de Variables de Entorno en Vercel

### Paso a Paso

1. **Accede a tu proyecto en Vercel**
   - Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
   - Selecciona tu proyecto "thecircle"

2. **Configura las variables de entorno**
   - Click en **Settings** en el menú superior
   - Click en **Environment Variables** en el menú lateral

3. **Agrega las siguientes variables:**

#### Variable 1: VITE_RECAPTCHA_SITE_KEY

```
Name: VITE_RECAPTCHA_SITE_KEY
Value: <VITE_RECAPTCHA_SITE_KEY — ver Vercel>
Environments: ✅ Production ✅ Preview ✅ Development
```

- Click en **Add**

#### Variable 2: RECAPTCHA_SECRET_KEY

```
Name: RECAPTCHA_SECRET_KEY
Value: <RECAPTCHA_SECRET_KEY — ver Vercel>
Environments: ✅ Production ✅ Preview ✅ Development
```

- Click en **Add**

4. **Redeploy el proyecto**
   
   Opción A - Desde Vercel Dashboard:
   - Ve a **Deployments**
   - Click en los 3 puntos (...) del último deployment
   - Click en **Redeploy**
   - ✅ Marca "Use existing Build Cache"
   - Click en **Redeploy**

   Opción B - Desde tu terminal:
   ```bash
   git add .
   git commit -m "Add reCAPTCHA security with server verification"
   git push origin main
   ```

5. **Verificar el deployment**
   - Espera a que termine el deployment (1-2 minutos)
   - Ve a tu sitio: `https://tu-dominio.vercel.app`
   - Navega a `/form`
   - Prueba enviar el formulario:
     - Sin CAPTCHA → debe mostrar error ❌
     - Con CAPTCHA → debe funcionar ✅

---

## 🔍 Verificar que la API Funciona

### Opción 1: Desde el navegador

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Envía el formulario con el CAPTCHA completado
4. Busca la petición a `/api/verify-captcha`
5. Deberías ver:
   ```json
   {
     "success": true,
     "message": "Captcha verified successfully"
   }
   ```

### Opción 2: Desde terminal (usando curl)

```bash
# Reemplaza TU_DOMINIO con tu dominio real
curl -X POST https://tu-dominio.vercel.app/api/verify-captcha \
  -H "Content-Type: application/json" \
  -d '{"captchaToken": "test"}'
```

Deberías recibir un error porque es un token de prueba:
```json
{
  "success": false,
  "error": "Captcha verification failed"
}
```

Esto es correcto! ✅ Significa que la API está funcionando y verificando tokens.

---

## 📊 Ver Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Click en **Logs** en el menú lateral
3. Filtra por `/api/verify-captcha`
4. Verás cada intento de verificación:
   ```
   [POST] /api/verify-captcha - 200 OK
   Captcha verified successfully
   ```

---

## ⚠️ Troubleshooting

### Error: "Captcha verification failed" siempre

**Causa:** La variable `RECAPTCHA_SECRET_KEY` no está configurada o es incorrecta.

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `RECAPTCHA_SECRET_KEY` tenga el valor: `<RECAPTCHA_SECRET_KEY — ver Vercel>`
3. Asegúrate de haber seleccionado los 3 entornos (Production, Preview, Development)
4. Redeploy el proyecto

### Error: "Cannot POST /api/verify-captcha"

**Causa:** La función serverless no se desplegó correctamente.

**Solución:**
1. Verifica que el archivo `api/verify-captcha.ts` exista en tu repositorio
2. Verifica que `@vercel/node` esté en `package.json`
3. Haz commit y push de nuevo:
   ```bash
   git add api/
   git commit -m "Add captcha verification API"
   git push
   ```

### El CAPTCHA no aparece

**Causa:** La variable `VITE_RECAPTCHA_SITE_KEY` no está configurada.

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `VITE_RECAPTCHA_SITE_KEY` tenga el valor: `<VITE_RECAPTCHA_SITE_KEY — ver Vercel>`
3. **IMPORTANTE:** Esta variable debe tener el prefijo `VITE_` para que Vite la exponga al cliente
4. Redeploy

### Error: "Invalid domain for site key"

**Causa:** El dominio no está registrado en Google reCAPTCHA.

**Solución:**
1. Ve a [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Selecciona tu site key
3. En **Domains**, agrega:
   - Tu dominio de Vercel: `tu-proyecto.vercel.app`
   - Tu dominio personalizado (si tienes uno)
   - `localhost` (para desarrollo)
4. Guarda los cambios

---

## ✅ Checklist de Deploy

Antes de considerar el deploy completo, verifica:

- [ ] Ambas variables de entorno configuradas en Vercel
- [ ] Variables configuradas para Production, Preview y Development
- [ ] Proyecto redesplegado después de agregar las variables
- [ ] Archivo `api/verify-captcha.ts` en el repositorio
- [ ] `@vercel/node` en `package.json`
- [ ] El CAPTCHA aparece en `/form`
- [ ] El formulario rechaza envíos sin CAPTCHA
- [ ] El formulario acepta envíos con CAPTCHA válido
- [ ] La API `/api/verify-captcha` responde correctamente
- [ ] Los logs de Vercel muestran verificaciones exitosas

---

## 🎯 Testing Post-Deploy

### Test 1: Formulario sin CAPTCHA
1. Ve a `https://tu-dominio.vercel.app/form`
2. Llena todos los campos
3. **NO** marques el CAPTCHA
4. Click en "DONE"
5. ✅ Debe mostrar error y hacer scroll al CAPTCHA

### Test 2: Formulario con CAPTCHA
1. Marca el CAPTCHA
2. Click en "DONE"
3. ✅ Debe enviar el formulario y mostrar mensaje de éxito

### Test 3: Campos vacíos
1. Deja campos vacíos
2. Marca el CAPTCHA
3. Click en "DONE"
4. ✅ Debe mostrar error en los campos vacíos

### Test 4: API directa
```bash
curl -X POST https://tu-dominio.vercel.app/api/verify-captcha \
  -H "Content-Type: application/json" \
  -d '{"captchaToken": "invalid"}'
```
5. ✅ Debe retornar error de verificación

---

## 📈 Monitoreo Post-Deploy

### En Vercel
1. **Analytics**: Ve a Analytics para ver tráfico
2. **Logs**: Monitorea llamadas a `/api/verify-captcha`
3. **Functions**: Verifica el rendimiento de la función serverless

### En Google reCAPTCHA
1. Ve a [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Selecciona tu site
3. Ve a **Analytics**:
   - Requests por día
   - Tasa de éxito
   - Bots bloqueados

---

## 🔐 Seguridad Post-Deploy

### ✅ Verificaciones de Seguridad

1. **Secret Key protegida**
   - ✅ La Secret Key nunca se expone al cliente
   - ✅ Solo se usa en el backend (serverless function)

2. **Verificación server-side**
   - ✅ Todos los tokens se verifican con Google antes de procesar
   - ✅ No se confía en la validación del cliente

3. **Rate Limiting**
   - ✅ Google reCAPTCHA provee rate limiting automático
   - ✅ Bots y tráfico malicioso son bloqueados

4. **CORS configurado**
   - ✅ Headers CORS configurados en `vercel.json`
   - ✅ Solo peticiones válidas son procesadas

---

## 🚀 Deploy Completo!

Si todos los tests pasan, tu sistema de seguridad está funcionando correctamente:

- ✅ Frontend protegido con validación
- ✅ reCAPTCHA bloqueando bots
- ✅ Backend verificando tokens
- ✅ Secret Key segura
- ✅ Logs de seguridad activos

**🎉 Tu formulario está protegido con seguridad de nivel empresarial!**

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en Vercel
2. Verifica la consola del navegador
3. Lee [SECURITY-SETUP.md](./SECURITY-SETUP.md) para más detalles
4. Contacta al equipo de desarrollo

---

**Última actualización:** Diciembre 2025

