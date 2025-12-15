# CAPTCHA Setup Instructions

## ⚠️ IMPORTANTE: Configuración de Google reCAPTCHA

El formulario actualmente usa una **clave de prueba** de Google reCAPTCHA que solo funciona en `localhost`. Para usar el formulario en producción, necesitas obtener tus propias claves.

## Pasos para configurar reCAPTCHA:

### 1. Obtener las claves de Google reCAPTCHA

1. Ve a [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en el botón **"+"** para crear un nuevo sitio
4. Completa el formulario:
   - **Label**: "The Circle Form" (o el nombre que prefieras)
   - **reCAPTCHA type**: Selecciona **"reCAPTCHA v2"** → **"I'm not a robot" Checkbox**
   - **Domains**: Agrega tus dominios:
     - `localhost` (para desarrollo)
     - `thecirclevlc.com` (tu dominio de producción)
     - Cualquier otro dominio donde esté alojada tu aplicación
   - Acepta los términos de servicio
5. Haz clic en **Submit**
6. Copia las claves que se generan:
   - **Site Key** (clave pública)
   - **Secret Key** (clave privada)

### 2. Configurar las claves en tu proyecto

1. Crea un archivo `.env` en la raíz del proyecto (si no existe)
2. Agrega las siguientes variables:

```env
VITE_RECAPTCHA_SITE_KEY=tu_site_key_aqui
```

3. **NO compartas** la Secret Key en el frontend. Esta se usa en el backend para verificación.

### 3. Actualizar el código

Abre el archivo `Form.tsx` y reemplaza la línea:

```typescript
sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
```

Por:

```typescript
sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
```

### 4. Verificación en el backend (Recomendado)

Para máxima seguridad, deberías verificar el token del CAPTCHA en tu backend antes de procesar el formulario:

```javascript
// Ejemplo de verificación en el backend
const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
});

const data = await response.json();
if (!data.success) {
  // Rechazar el formulario
}
```

### 5. Reiniciar el servidor de desarrollo

Después de agregar las variables de entorno:

```bash
npm run dev
```

## Claves de prueba actuales

**⚠️ Solo para desarrollo local:**
- Site Key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Esta es una clave de prueba oficial de Google que **siempre pasa la validación**
- **NO** uses esta clave en producción

## Recursos adicionales

- [Documentación de reCAPTCHA](https://developers.google.com/recaptcha/docs/display)
- [FAQ de reCAPTCHA](https://developers.google.com/recaptcha/docs/faq)
- [Mejores prácticas](https://developers.google.com/recaptcha/docs/practice)

## Solución de problemas

**El CAPTCHA no aparece:**
- Verifica que la Site Key sea correcta
- Asegúrate de que el dominio esté registrado en la consola de reCAPTCHA
- Revisa la consola del navegador para ver errores

**El CAPTCHA siempre falla:**
- Verifica que estés usando reCAPTCHA v2 (no v3)
- Confirma que el dominio coincida con el registrado
- Intenta limpiar la caché del navegador

**Error "Invalid site key":**
- La Site Key no es válida o no corresponde al dominio actual
- Verifica que hayas copiado la clave correctamente

