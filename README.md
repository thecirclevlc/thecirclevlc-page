# THECIRCLE | VOL. II

Una landing page exclusiva e inmersiva con WebGL, animaciones avanzadas con Framer Motion y un diseño minimalista oscuro.

## 🚀 Características

- ✨ **WebGL Background**: Grid distorsionado con efectos de onda reactivos al mouse
- 🎭 **Animaciones Avanzadas**: Tipografía cinética con Framer Motion
- 🎨 **Diseño Moderno**: Paleta de colores rojo oscuro (#C42121) sobre negro profundo
- 📱 **Responsive**: Optimizado para todos los dispositivos
- ⚡ **Performance**: Construido con Vite para máxima velocidad

## 🛠️ Stack Tecnológico

- **React 19** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Framer Motion** - Animaciones
- **Tailwind CSS** - Estilos (CDN)
- **Lucide React** - Iconos
- **WebGL** - Gráficos 3D nativos

## 📦 Instalación Local

### Prerequisitos

- Node.js 18+ 
- npm o pnpm

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <tu-repo>
   cd thecircle
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno (opcional)**
   ```bash
   cp .env.example .env.local
   # Edita .env.local si necesitas usar la API de Gemini
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```
   La app estará disponible en `http://localhost:3000`

5. **Construir para producción**
   ```bash
   npm run build
   ```

6. **Preview de producción**
   ```bash
   npm run preview
   ```

## 🌐 Deploy en Vercel

### Opción 1: Deploy con Git (Recomendado)

1. **Push tu código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <tu-repo-url>
   git push -u origin main
   ```

2. **Conectar con Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Click en "Add New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Vite
   - Click en "Deploy"

3. **Configurar variables de entorno (si es necesario)**
   - En tu proyecto de Vercel, ve a Settings → Environment Variables
   - Agrega `GEMINI_API_KEY` si planeas usar funcionalidades de IA

### Opción 2: Deploy con Vercel CLI

1. **Instalar Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
4. **Deploy a producción**
   ```bash
   vercel --prod
   ```

## ⚙️ Configuración

### Variables de Entorno

El proyecto soporta las siguientes variables de entorno:

- `GEMINI_API_KEY`: (Opcional) API key para funcionalidades futuras con IA

### Personalización

- **Colores**: El tema principal usa `#C42121` (rojo) y `#050000` (negro). Puedes cambiarlos en `App.tsx`
- **WebGL Shaders**: Los shaders están en `App.tsx` líneas 8-73
- **Animaciones**: Ajusta velocidades en las configuraciones de Framer Motion

## 📁 Estructura del Proyecto

```
thecircle/
├── App.tsx              # Componente principal con WebGL y UI
├── index.tsx            # Entry point de React
├── types.ts             # Definiciones de TypeScript
├── index.html           # HTML base
├── index.css            # Estilos personalizados
├── vite.config.ts       # Configuración de Vite
├── tsconfig.json        # Configuración de TypeScript
├── vercel.json          # Configuración de Vercel
├── package.json         # Dependencias
└── README.md            # Este archivo
```

## 🎯 Optimizaciones para Producción

El proyecto incluye:

- ✅ **Tree shaking** automático con Vite
- ✅ **Code splitting** optimizado
- ✅ **Asset optimization** (imágenes, fonts)
- ✅ **Minificación** de JS/CSS
- ✅ **Caché headers** configurados en Vercel
- ✅ **SPA fallback** para rutas
- ✅ **Meta tags SEO** completos

## 🐛 Troubleshooting

### El build falla en Vercel

- Asegúrate de que todas las dependencias estén en `dependencies` (no en `devDependencies`)
- Verifica que Node.js sea versión 18+

### WebGL no funciona

- Algunos navegadores antiguos no soportan WebGL
- Verifica que no haya bloqueadores de hardware acceleration

### Tailwind no carga estilos

- El proyecto usa Tailwind CDN, si necesitas más control, instala Tailwind localmente

## 📝 Licencia

© 2025 THECIRCLE. Todos los derechos reservados.

## 🤝 Contribuciones

Este es un proyecto privado. Para consultas, contacta al equipo de THECIRCLE.

---

**Desarrollado con ❤️ y ☕ por el equipo de THECIRCLE**
