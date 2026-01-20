# ⚛️ Quantum32 Control Center - Web

**Análisis de Wikipedia + Conexión directa con Arduino** usando Web Serial API

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://TU-USUARIO.github.io/quantum32-analyzer/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Características Principales

- ✅ **Conexión directa con Arduino** desde el navegador (Web Serial API)
- ✅ Análisis de artículos de Wikipedia en tiempo real
- ✅ Vectorización TF-IDF (32 dimensiones)
- ✅ Envío automático de datos a esclavos I2C
- ✅ Monitor serial integrado en el navegador
- ✅ Visualización de estados Quantum32
- ✅ Sin instalación - funciona desde GitHub Pages

## 🌐 Demo en Vivo

**URL:** `https://TU-USUARIO.github.io/quantum32-analyzer/`

## 🔌 Conexión con Arduino

### Requisitos

1. **Navegador compatible:** Chrome, Edge u Opera (en escritorio)
2. **Arduino Quantum32** conectado por USB
3. **Sketch Arduino** cargado (ver sección Arduino)

### Cómo conectar

1. Abre la aplicación en tu navegador
2. Conecta el Arduino por USB
3. Click en "🔌 Conectar Arduino"
4. Selecciona el puerto en el diálogo
5. ¡Listo! Estado cambia a 🟢 Conectado

### Enviar datos

1. Analiza un artículo de Wikipedia
2. Click en "Enviar a Arduino"
3. Los datos se envían automáticamente a los 4 esclavos I2C
4. Ve la confirmación en el monitor serial

## 🚀 Despliegue en GitHub Pages

### Paso 1: Crear Repositorio

1. Crea un nuevo repositorio: `quantum32-analyzer`
2. Márcalo como público
3. NO inicialices con README (lo subirás después)

### Paso 2: Subir Archivos

Sube estos 3 archivos a tu repositorio:

- `index.html` - Interfaz principal
- `app.js` - Lógica de la aplicación
- `LICENSE` - Licencia MIT
- `README.md` - Este archivo

**Opción A: Desde GitHub Web**

1. Click en "Add file" → "Upload files"
2. Arrastra los 3 archivos
3. Commit → "Initial commit"

**Opción B: Con Git**

```bash
git clone https://github.com/TU-USUARIO/quantum32-analyzer.git
cd quantum32-analyzer

# Copia los archivos aquí

git add .
git commit -m "Add Quantum32 Control Center"
git push origin main
```

### Paso 3: Activar GitHub Pages

1. Ve a Settings → Pages
2. Source: `main` branch
3. Folder: `/ (root)`
4. Click "Save"
5. Espera 1-2 minutos

### Paso 4: ¡Acceder!

```
https://TU-USUARIO.github.io/quantum32-analyzer/
```

## 📦 Estructura del Proyecto

```
quantum32-analyzer/
├── index.html          # Interfaz HTML
├── app.js              # Lógica JavaScript
├── README.md          # Documentación
└── LICENSE            # Licencia MIT
```

## 🎯 Uso Completo

### 1. Análisis de Artículo

```
1. Escribe el título: "Inteligencia artificial"
2. Click "Analizar"
3. Espera 2-3 segundos
4. Ve los resultados visualizados
```

### 2. Conectar con Arduino

```
1. Conecta Arduino por USB
2. Click "🔌 Conectar Arduino"
3. Selecciona puerto en el diálogo
4. Indicador cambia a 🟢 verde
```

### 3. Enviar Datos

```
1. Con Arduino conectado
2. Después de analizar
3. Click "Enviar a Arduino"
4. Ve confirmación en monitor serial
```

### 4. Comandos del Monitor

- **Mostrar Análisis:** Ver datos en OLED
- **Mostrar Bulk:** Ver máscara de bits
- **Leer Esclavos:** Leer estados I2C
- **Limpiar:** Limpiar consola

## 🤖 Sketch Arduino

Carga este sketch en tu ESP32 maestro:

```cpp
// arduino_wikipedia_receiver.ino
// (Usa el sketch incluido en el proyecto original)
```

El sketch debe:
- Escuchar en Serial a 115200 baudios
- Reconocer formato: `START|título|b0,b1,b2,b3|mask|weight|END`
- Distribuir estados a esclavos I2C (0x10-0x13)
- Mostrar en OLED

## 💡 Web Serial API

### ¿Qué es?

Web Serial API permite que páginas web se comuniquen directamente con dispositivos seriales (Arduino, ESP32, etc.) sin necesidad de:

- Instalar software
- Ejecutar servidores locales
- Plugins o extensiones

### Navegadores Compatibles

| Navegador | Soporte | Versión |
|-----------|---------|---------|
| Chrome | ✅ | 89+ |
| Edge | ✅ | 89+ |
| Opera | ✅ | 75+ |
| Firefox | ❌ | No |
| Safari | ❌ | No |

### Seguridad

- El usuario debe aprobar la conexión manualmente
- Solo funciona en HTTPS o localhost
- GitHub Pages usa HTTPS automáticamente ✅

## 🔧 Solución de Problemas

### ❌ "Web Serial API no disponible"

**Causa:** Navegador no compatible  
**Solución:** Usa Chrome, Edge u Opera en escritorio

### ❌ No aparece el puerto

**Causa:** Arduino no detectado  
**Solución:**
- Verifica cable USB
- Comprueba drivers
- Revisa en Device Manager (Windows)

### ❌ "Failed to open serial port"

**Causa:** Puerto en uso  
**Solución:**
- Cierra Arduino IDE Serial Monitor
- Cierra otros programas que usen el puerto
- Desconecta y reconecta el Arduino

### ❌ Arduino no responde

**Causa:** Baudrate incorrecto o sketch no cargado  
**Solución:**
- Verifica baudrate: 115200
- Recarga el sketch Arduino
- Revisa conexiones I2C

## 📊 Datos Técnicos

### Formato de Comunicación

```
START|título|b0,b1,b2,b3|bulkmask|weight|END
```

**Ejemplo:**
```
START|Inteligencia artificial|120,98,145,110|2777788434|0.7845|END
```

### Protocolo Serial

- **Baudrate:** 115200
- **Data bits:** 8
- **Stop bits:** 1
- **Parity:** None
- **Flow control:** None

### Comandos Disponibles

- `SHOW_ANALYSIS` - Mostrar análisis en OLED
- `SHOW_BULK` - Mostrar máscara del bulk
- `READ_SLAVES` - Leer estados de esclavos
- `HELP` - Mostrar ayuda

## 🎓 Conceptos

### Boundary States

Valores de 0-255 para cada esclavo I2C.  
Representan la distribución local del vector.

```
Vector [32D] → 4 chunks → Norma L2 × 255
Chunk 0 → Esclavo 0 (0x10): 120
Chunk 1 → Esclavo 1 (0x11): 98
Chunk 2 → Esclavo 2 (0x12): 145
Chunk 3 → Esclavo 3 (0x13): 110
```

### Bulk Mask

Máscara de 32 bits.  
Indica características dominantes.

```
Vector > 0.5 → Bit = 1
Vector ≤ 0.5 → Bit = 0

Resultado: 0xA5C3F012
```

### Semantic Weight

Entropía normalizada (0-1).  
Indica riqueza del vocabulario.

```
Alto (>0.7): Vocabulario diverso
Bajo (<0.4): Vocabulario enfocado
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/mejora`
3. Commit: `git commit -m 'Agrega mejora'`
4. Push: `git push origin feature/mejora`
5. Abre un Pull Request

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE)

## 🙏 Créditos

- **Quantum32 Original:** Vicente Lorca ([@vlorcap](https://github.com/vlorcap))
- **Control Center Web:** Complemento con Web Serial API
- **Wikipedia API:** Wikimedia Foundation

## 📞 Soporte

¿Problemas?

1. Revisa la sección "Solución de Problemas" arriba
2. Abre un [Issue](https://github.com/TU-USUARIO/quantum32-analyzer/issues)
3. Verifica que tu navegador soporte Web Serial API

## ⚡ Ventajas de esta Versión

### vs Versión Python

| Característica | Web (GitHub Pages) | Python Local |
|----------------|:------------------:|:------------:|
| **Instalación** | ❌ No requiere | ✅ Pip install |
| **Acceso** | 🌐 Desde cualquier lugar | 🏠 Solo local |
| **Conexión Arduino** | ✅ Web Serial API | ✅ PySerial |
| **Compatibilidad** | Chrome/Edge/Opera | Todos |
| **Hosting** | ✅ Gratis (GitHub) | ❌ Servidor propio |
| **Actualizaciones** | 🔄 Git push | 📝 Manual |

### Lo Mejor de Ambos Mundos

✅ Funciona desde GitHub Pages  
✅ Se conecta con Arduino físico  
✅ Sin instalación de software  
✅ Actualizable con git push  
✅ Accesible desde cualquier computadora  

## 🚀 Próximos Pasos

1. Despliega en GitHub Pages
2. Conecta tu Arduino Quantum32
3. Analiza artículos de Wikipedia
4. Observa los datos en los esclavos I2C
5. ¡Comparte tu link!

---

**¿Te gusta el proyecto? ⭐ Dale una estrella!**

**URL del proyecto:** `https://TU-USUARIO.github.io/quantum32-analyzer/`
