# Ynera — Deploy en Railway

## Estructura del proyecto

```
├── package.json      # Dependencias y scripts
├── server.js         # Servidor Express
├── public/
│   └── index.html    # Landing principal con diagnóstico integrado
```

## Cómo deployar

1. Crear proyecto nuevo en [railway.app](https://railway.app)
2. Conectar el repo de GitHub (o subir con CLI)
3. Railway detecta `package.json` y corre `npm start` automáticamente
4. Agregar dominio personalizado si querés usar `ynera.com`

## Variables de entorno (opcional)

- `PORT` — Railway lo setea automáticamente

## Assets que faltan crear

El HTML referencia estos archivos que no existen todavía:

| Archivo | Dónde se usa | Qué hacer |
|---|---|---|
| `public/og-image.png` | Open Graph / Twitter Card | Crear imagen 1200×630 con el brand |
| `public/apple-touch-icon.png` | Favicon iOS | Generar desde el SVG del logo |
| `public/favicon-32x32.png` | Favicon navegador | Generar desde el SVG del logo |
| `public/favicon-16x16.png` | Favicon navegador | Generar desde el SVG del logo |

> El sitio funciona igual sin estos archivos — el navegador simplemente no muestra favicon custom ni preview social completa.

## Comando para probar local

```bash
npm install
npm start
# → http://localhost:3000
```
