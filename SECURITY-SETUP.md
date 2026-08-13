# 🔒 Configuración de Seguridad - The Circle

## ✅ Sistema de Seguridad Implementado

El formulario de The Circle ahora cuenta con **múltiples capas de seguridad** para proteger contra spam, bots y formularios maliciosos.

---

## 🛡️ Capas de Seguridad

### 1. **Validación del Frontend**
- ✅ Validación de campos requeridos
- ✅ Validación de formato de email
- ✅ Feedback visual de errores con animaciones

### 2. **Google reCAPTCHA v2**
- ✅ Verificación "I'm not a robot" antes de enviar
- ✅ Tema oscuro personalizado
- ✅ Reset automático después de cada intento

### 3. **Verificación del Servidor (Backend)**
- ✅ API endpoint serverless en Vercel (`/api/verify-captcha`)
- ✅ Verificación del token con Google antes de procesar el formulario
- ✅ Secret Key segura (nunca expuesta al cliente)
- ✅ Manejo de errores robusto
- ✅ Logs de seguridad

---

## 🔑 Claves Configuradas

Las siguientes claves de reCAPTCHA han sido configuradas:

### Site Key (Pública - Frontend)
```
<VITE_RECAPTCHA_SITE_KEY — ver Vercel>
```

### Secret Key (Privada - Backend)
```
<RECAPTCHA_SECRET_KEY — ver Vercel>
```

⚠️ **IMPORTANTE**: La Secret Key está protegida en variables de entorno y **nunca se expone al cliente**.

---

## 📋 Flujo de Seguridad

```
1. Usuario llena el formulario
   ↓
2. Usuario completa el reCAPTCHA
   ↓
3. Validación de campos en el frontend
   ↓
4. Envío del token de reCAPTCHA al servidor
   ↓
5. Servidor verifica el token con Google
   ↓
6. Si válido → Procesa el formulario
   Si inválido → Rechaza y muestra error
```

---

## 🚀 Configuración para Producción en Vercel

### Paso 1: Configurar Variables de Entorno

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto "thecircle"
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

| Variable | Valor | Entorno |
|----------|-------|---------|
| `VITE_RECAPTCHA_SITE_KEY` | `<VITE_RECAPTCHA_SITE_KEY — ver Vercel>` | Production, Preview, Development |
| `RECAPTCHA_SECRET_KEY` | `<RECAPTCHA_SECRET_KEY — ver Vercel>` | Production, Preview, Development |

### Paso 2: Redeploy

Después de configurar las variables:

```bash
git add .
git commit -m "Add reCAPTCHA security"
git push
```

O desde Vercel Dashboard:
- Ve a **Deployments**
- Click en los 3 puntos del último deployment
- Click en **Redeploy**

### Paso 3: Verificar

1. Ve a tu sitio en producción
2. Intenta enviar el formulario sin completar el CAPTCHA → debe mostrar error
3. Completa el CAPTCHA y envía → debe funcionar correctamente
4. Verifica en los logs de Vercel que la API `/api/verify-captcha` está funcionando

---

## 🔍 Endpoints de API

### `/api/verify-captcha`

**Método:** POST  
**Content-Type:** application/json

**Request Body:**
```json
{
  "captchaToken": "token-from-recaptcha"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Captcha verified successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Captcha verification failed",
  "errorCodes": ["invalid-input-response"]
}
```

---

## 🧪 Testing Local

### 1. Verificar que las variables están configuradas

```bash
cat .env
```

Deberías ver:
```
VITE_RECAPTCHA_SITE_KEY=<VITE_RECAPTCHA_SITE_KEY — ver Vercel>
RECAPTCHA_SECRET_KEY=<RECAPTCHA_SECRET_KEY — ver Vercel>
```

### 2. Ejecutar en desarrollo

```bash
npm run dev
```

### 3. Probar el formulario

1. Abre http://localhost:5173/form
2. Llena todos los campos
3. **NO** marques el CAPTCHA y haz click en "DONE"
   - Debe mostrar error y scroll al CAPTCHA
4. Marca el CAPTCHA y envía de nuevo
   - Debe funcionar correctamente

### 4. Testing de la API serverless

Para probar la API localmente con Vercel CLI:

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Ejecutar en modo desarrollo
vercel dev
```

Luego prueba el endpoint:

```bash
curl -X POST http://localhost:3000/api/verify-captcha \
  -H "Content-Type: application/json" \
  -d '{"captchaToken": "test-token"}'
```

---

## 🔐 Mejores Prácticas Implementadas

### ✅ Seguridad del Frontend
- Validación de entrada antes de enviar
- No se exponen claves privadas
- Timeouts y límites de reintentos

### ✅ Seguridad del Backend
- Verificación server-side del CAPTCHA
- Secret Key protegida en variables de entorno
- Rate limiting a través de reCAPTCHA
- Logs de seguridad

### ✅ Protección de Datos
- CORS configurado correctamente
- No se guardan tokens de CAPTCHA
- Reset automático después de cada uso

### ✅ Experiencia de Usuario
- Feedback claro de errores
- Animaciones suaves
- Tema oscuro coherente con el diseño

---

## 📊 Monitoreo

### Ver logs de verificación en Vercel

1. Ve a tu proyecto en Vercel
2. Click en **Logs** en el menú lateral
3. Filtra por `/api/verify-captcha`
4. Aquí verás:
   - Intentos de verificación
   - Tokens rechazados
   - Errores de configuración

### Monitoreo en Google reCAPTCHA

1. Ve a [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Selecciona tu site
3. Ve a **Analytics** para ver:
   - Requests por día
   - Tasa de éxito
   - Intentos sospechosos bloqueados

---

## ⚠️ Solución de Problemas

### El CAPTCHA no aparece

**Problema:** El widget no se muestra en la página.

**Solución:**
1. Verifica que la Site Key esté configurada correctamente en `.env`
2. Asegúrate de que el dominio esté registrado en Google reCAPTCHA
3. Revisa la consola del navegador para errores

### Error "Invalid site key"

**Problema:** La Site Key no es válida.

**Solución:**
1. Verifica que la Site Key sea exactamente: `<VITE_RECAPTCHA_SITE_KEY — ver Vercel>`
2. Confirma que el dominio coincida con el registrado en Google
3. Limpia la caché del navegador

### La verificación siempre falla

**Problema:** El backend rechaza todos los CAPTCHA.

**Solución:**
1. Verifica que la Secret Key esté configurada en Vercel
2. Revisa los logs de la función `/api/verify-captcha`
3. Confirma que estés usando reCAPTCHA v2 (no v3)

### CORS Error

**Problema:** Error de CORS al llamar a `/api/verify-captcha`.

**Solución:**
- Los headers CORS están configurados en `api/verify-captcha.ts`
- Verifica que la función esté desplegada correctamente en Vercel
- En desarrollo local, usa `vercel dev` en lugar de `npm run dev`

---

## 🔄 Actualizar las Claves

Si necesitas cambiar las claves de reCAPTCHA:

1. **Genera nuevas claves** en [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)

2. **Actualiza `.env` local:**
   ```bash
   # Edita el archivo .env
   VITE_RECAPTCHA_SITE_KEY=tu_nueva_site_key
   RECAPTCHA_SECRET_KEY=tu_nueva_secret_key
   ```

3. **Actualiza Vercel:**
   - Ve a Settings → Environment Variables
   - Edita cada variable con los nuevos valores
   - Redeploy

4. **Reinicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

---

## 📚 Referencias

- [Google reCAPTCHA Docs](https://developers.google.com/recaptcha/docs/display)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Environment Variables en Vercel](https://vercel.com/docs/projects/environment-variables)

---

## ✅ Checklist de Seguridad

Antes de ir a producción, verifica:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Archivo `.env` en `.gitignore` (ya configurado)
- [ ] Dominios registrados en Google reCAPTCHA
- [ ] API `/api/verify-captcha` funcionando
- [ ] CAPTCHA visible en el formulario
- [ ] Verificación rechaza tokens inválidos
- [ ] Formulario se envía correctamente con CAPTCHA válido
- [ ] Logs de Vercel muestran verificaciones exitosas

---

**🎉 Tu formulario ahora está protegido con seguridad de nivel empresarial!**

