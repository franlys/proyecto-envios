# 🎨 Instrucciones para Crear Animaciones de Estados de Tracking

## 📋 Resumen Ejecutivo

Se necesitan **12 animaciones** (formato Lottie JSON o GIF) para representar visualmente cada estado del proceso de entrega en la página de tracking público.

---

## 🎯 Especificaciones Técnicas Generales

### Formato y Dimensiones
- **Formato preferido:** Lottie JSON (para web) o GIF animado
- **Dimensiones:** 400x400 px (cuadrado)
- **Tamaño de archivo:** Máximo 200KB por animación
- **Duración:** 2-3 segundos por loop
- **Frame rate:** 30 fps
- **Paleta de colores:** Usar los colores especificados para cada estado

### Requisitos de Diseño
1. **Espacio para logo:** Reservar área de 80x80px en la esquina superior derecha para el logo de la empresa
2. **Estilo:** Flat design, minimalista, profesional
3. **Fondo:** Transparente o blanco (#FFFFFF)
4. **Iconos:** Líneas suaves, sin detalles excesivos
5. **Animación:** Loop infinito, transiciones suaves

---

## 📦 Animaciones Requeridas (12 Estados)

### 1. Pendiente de Recolección
**Nombre del archivo:** `pending-pickup.json` o `pending-pickup.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Pendiente de Recolección" para un sistema de tracking de paquetes.

Elementos visuales:
- Un paquete/caja de cartón en color café (#D2691E) con líneas de cinta adhesiva
- El paquete debe estar en el centro, ligeramente inclinado
- Agregar un reloj pequeño flotando cerca del paquete (indicando espera)
- El reloj debe girar sus manecillas lentamente
- Pequeñas líneas punteadas alrededor del paquete indicando que está "esperando"

Animación:
- El paquete debe hacer un movimiento sutil de "respiración" (escala del 100% al 105% y viceversa)
- El reloj gira sus manecillas
- Las líneas punteadas aparecen y desaparecen con fade
- Duración: 2.5 segundos en loop

Colores:
- Paquete: #D2691E (café)
- Reloj: #FFA500 (naranja)
- Líneas: #E0E0E0 (gris claro)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo de empresa

Estilo: Flat design, minimalista, profesional, sin sombras complejas.
```

---

### 2. Recolectada
**Nombre del archivo:** `collected.json` o `collected.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Recolectada" (paquete ya recogido).

Elementos visuales:
- Un paquete de cartón en color café (#D2691E)
- Una mano/brazo estilizado levantando el paquete desde abajo
- Un ícono de check mark (✓) grande apareciendo sobre el paquete

Animación:
- La mano entra desde la parte inferior de la pantalla
- Agarra el paquete y lo levanta hacia el centro
- El check mark aparece con un efecto de "pop" (scale de 0% a 120% y luego a 100%)
- El paquete se balancea ligeramente en la mano
- Duración: 3 segundos, luego loop

Colores:
- Paquete: #D2691E (café)
- Mano: #FFE4B5 (piel clara, puede variar)
- Check mark: #4CAF50 (verde éxito)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design, líneas suaves, colores sólidos.
```

---

### 3. En Contenedor (USA)
**Nombre del archivo:** `container-usa.json` o `container-usa.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "En Contenedor USA" (empacado en contenedor de envío).

Elementos visuales:
- Un contenedor de carga estilizado (forma rectangular grande) en color azul oscuro (#2C5F8D)
- Varios paquetes pequeños entrando al contenedor desde diferentes ángulos
- Una pequeña bandera de USA (🇺🇸) en la esquina del contenedor
- Líneas de movimiento indicando carga

Animación:
- El contenedor está abierto (puerta lateral visible)
- Los paquetes (3-4 paquetes pequeños) flotan y entran al contenedor uno por uno
- Cada paquete hace un pequeño "bounce" al entrar
- Al final, la puerta del contenedor se cierra parcialmente
- Duración: 3 segundos en loop

Colores:
- Contenedor: #2C5F8D (azul marino)
- Paquetes: #D2691E (café)
- Bandera USA: Colores oficiales (rojo, blanco, azul)
- Líneas de movimiento: #B0C4DE (azul claro)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Isométrico suave, flat design, líneas limpias.
```

---

### 4. Incompleta (USA)
**Nombre del archivo:** `incomplete-usa.json` o `incomplete-usa.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Incompleta USA" (faltan artículos).

Elementos visuales:
- Un contenedor azul oscuro (#2C5F8D) semi-abierto
- 3 paquetes dentro del contenedor
- 1 paquete con signo de interrogación (?) flotando afuera, separado
- Ícono de advertencia (⚠️) en color naranja parpadeando

Animación:
- El paquete con "?" flota hacia arriba y hacia abajo suavemente
- El ícono de advertencia parpadea (opacidad del 100% al 40% y viceversa)
- Los paquetes dentro del contenedor se mueven ligeramente como buscando algo
- Duración: 2.5 segundos en loop

Colores:
- Contenedor: #2C5F8D (azul marino)
- Paquetes completos: #D2691E (café)
- Paquete faltante: #F4A460 (café claro con borde punteado)
- Signo "?": #FF9800 (naranja)
- Advertencia: #FF9800 (naranja)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design, énfasis en el elemento faltante.
```

---

### 5. En Tránsito a RD
**Nombre del archivo:** `transit-rd.json` o `transit-rd.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "En Tránsito a República Dominicana" (barco/avión en movimiento).

Elementos visuales:
- Un barco de carga estilizado navegando sobre olas
- Contenedores apilados en el barco
- Olas del mar moviéndose
- Nubes pasando en el fondo
- Pequeña bandera de República Dominicana (🇩🇴) como destino

Animación:
- El barco se mueve de izquierda a derecha lentamente
- Las olas se mueven en dirección contraria (derecha a izquierda) creando sensación de movimiento
- Las nubes pasan lentamente de derecha a izquierda
- El barco se balancea ligeramente arriba/abajo (efecto de navegación)
- Duración: 4 segundos en loop

Colores:
- Barco: #34495E (gris azulado)
- Contenedores: #2196F3 (azul), #D2691E (café)
- Olas: #3498DB (azul océano), #5DADE2 (azul claro)
- Nubes: #ECF0F1 (blanco grisáceo)
- Bandera RD: Colores oficiales (rojo, azul, blanco)
- Fondo: Degradado de #87CEEB (cielo) a #E0F7FF (horizonte)

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design con perspectiva lateral, minimalista.
```

---

### 6. Recibida en RD
**Nombre del archivo:** `received-rd.json` o `received-rd.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Recibida en República Dominicana" (llegada al almacén).

Elementos visuales:
- Un edificio de almacén estilizado con puertas de carga
- Un contenedor llegando al edificio
- Un montacargas/carretilla elevadora descargando
- Bandera de República Dominicana (🇩🇴) en el edificio
- Ícono de ubicación (pin de mapa) sobre el edificio

Animación:
- El contenedor llega desde la izquierda hacia el edificio
- Las puertas del almacén se abren
- El montacargas sale del edificio y se acerca al contenedor
- El pin de ubicación hace un "bounce" (rebote) para indicar llegada
- Check mark aparece brevemente
- Duración: 3.5 segundos en loop

Colores:
- Edificio: #95A5A6 (gris), #7F8C8D (gris oscuro para techo)
- Contenedor: #2C5F8D (azul marino)
- Montacargas: #FFA500 (naranja)
- Bandera RD: Colores oficiales
- Pin de ubicación: #4CAF50 (verde)
- Check mark: #4CAF50 (verde)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design con vista frontal del edificio, isométrico suave.
```

---

### 7. Pendiente de Confirmación
**Nombre del archivo:** `pending-confirmation.json` o `pending-confirmation.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Pendiente de Confirmación del Cliente".

Elementos visuales:
- Un teléfono móvil en el centro mostrando una notificación
- Un paquete pequeño flotando cerca del teléfono
- Iconos de campana (🔔) o sobre de correo (✉️) parpadeando
- Puntos suspensivos (...) animados indicando espera

Animación:
- El teléfono vibra ligeramente (movimiento horizontal rápido)
- La notificación en la pantalla parpadea (opacidad 40% a 100%)
- El ícono de campana hace un pequeño "ring" (rotación de -10° a +10°)
- Los puntos suspensivos aparecen uno por uno: . .. ...
- Duración: 2.5 segundos en loop

Colores:
- Teléfono: #34495E (gris oscuro), pantalla #FFFFFF (blanco)
- Paquete: #D2691E (café)
- Notificación: #FF9800 (naranja)
- Campana: #FFA500 (naranja dorado)
- Puntos: #7F8C8D (gris medio)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design, enfoque en el teléfono y notificación.
```

---

### 8. Confirmada
**Nombre del archivo:** `confirmed.json` or `confirmed.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Confirmada por el Cliente".

Elementos visuales:
- Un teléfono móvil mostrando un gran check mark (✓) en la pantalla
- Un paquete junto al teléfono
- Partículas/confeti pequeños cayendo alrededor (celebración sutil)
- Un pulso de luz emanando del check mark

Animación:
- El check mark aparece con efecto "draw" (dibujado de arriba hacia abajo)
- Luego hace un "pop" (scale 0% → 120% → 100%)
- Partículas/confeti caen lentamente desde arriba
- Pulso de luz se expande desde el check mark (círculo que crece y desaparece)
- Duración: 3 segundos en loop

Colores:
- Teléfono: #34495E (gris oscuro), pantalla #FFFFFF (blanco)
- Check mark: #4CAF50 (verde éxito)
- Paquete: #D2691E (café)
- Confeti: #4CAF50, #FFA500, #2196F3 (multicolor)
- Pulso: #4CAF50 con opacidad decreciente
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design, celebración sutil pero clara.
```

---

### 9. En Ruta de Entrega
**Nombre del archivo:** `on-route.json` or `on-route.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "En Ruta de Entrega" (camión en movimiento).

Elementos visuales:
- Un camión de reparto visto de lado, color blanco/azul
- Ruedas girando
- Líneas de velocidad detrás del camión
- Carretera/calle con líneas punteadas
- Pequeño pin de ubicación (📍) parpadeando sobre el camión (GPS)

Animación:
- El camión se mueve de izquierda a derecha
- Las ruedas giran continuamente
- Las líneas de velocidad aparecen y desaparecen
- La carretera se mueve de derecha a izquierda (efecto parallax)
- El pin de GPS parpadea (escala 100% a 110%)
- Duración: 3 segundos en loop

Colores:
- Camión: #FFFFFF (blanco), #2196F3 (azul para detalles)
- Ruedas: #2C3E50 (negro)
- Líneas de velocidad: #E0E0E0 (gris claro)
- Carretera: #7F8C8D (gris asfalto)
- Líneas de carretera: #FFFFFF (blanco)
- Pin GPS: #FF5722 (rojo/naranja)
- Fondo: Transparente o #E8F5E9 (verde muy claro para césped/fondo)

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design con vista lateral, sensación de movimiento.
```

---

### 10. Lista para Entregar
**Nombre del archivo:** `ready-delivery.json` or `ready-delivery.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Lista para Entregar" (paquete preparado).

Elementos visuales:
- Un paquete grande en el centro con cinta adhesiva verde
- Un clipboard con checklist al lado del paquete
- Checks (✓) apareciendo en el checklist
- Una casa pequeña en el fondo (destino final)

Animación:
- Los checks en el checklist aparecen uno por uno de arriba hacia abajo
- El paquete hace un pequeño "bounce" cada vez que aparece un check
- La casa en el fondo parpadea suavemente (indicando destino)
- Al final, todo el paquete brilla brevemente (borde dorado)
- Duración: 3 segundos en loop

Colores:
- Paquete: #D2691E (café)
- Cinta: #4CAF50 (verde)
- Clipboard: #ECF0F1 (blanco grisáceo)
- Checks: #4CAF50 (verde)
- Casa: #34495E (gris oscuro), techo #E74C3C (rojo)
- Brillo: #FFD700 (dorado)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design, enfoque en el paquete listo.
```

---

### 11. Entregada (Éxito)
**Nombre del archivo:** `delivered.json` or `delivered.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "Entregada Exitosamente" (celebración de entrega).

Elementos visuales:
- Un paquete abierto mostrando el contenido (regalo/producto genérico)
- Manos recibiendo el paquete desde arriba
- Confeti y estrellas cayendo alrededor
- Un gran check mark (✓) o thumbs up (👍) sobre todo
- Corazones pequeños flotando (satisfacción del cliente)

Animación:
- Las manos entran desde arriba y reciben el paquete
- El paquete se abre con efecto de "pop"
- Confeti y estrellas explotan desde el paquete
- El check mark aparece con "draw effect" + scale pop
- Los corazones flotan hacia arriba lentamente
- Duración: 4 segundos en loop

Colores:
- Paquete: #D2691E (café)
- Manos: #FFE4B5 (piel)
- Confeti: #4CAF50, #FFA500, #2196F3, #E91E63 (multicolor)
- Check mark: #4CAF50 (verde éxito)
- Estrellas: #FFD700 (dorado)
- Corazones: #E91E63 (rosa/rojo)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design con celebración vibrante, colores alegres.
```

---

### 12. No Entregada (Problema)
**Nombre del archivo:** `not-delivered.json` or `not-delivered.gif`

**Prompt para Gemini:**
```
Crea una animación Lottie JSON de 400x400px que represente "No Entregada" (problema en la entrega).

Elementos visuales:
- Un paquete con signo de "X" rojo sobre él
- Una casa con puerta cerrada o candado
- Ícono de advertencia (⚠️) o signo de "prohibido" (🚫)
- Un camión de reparto retrocediendo

Animación:
- El camión intenta acercarse a la casa
- La puerta permanece cerrada/candado visible
- El camión retrocede lentamente
- El signo "X" aparece sobre el paquete con shake (vibración)
- El ícono de advertencia parpadea
- Duración: 3.5 segundos en loop

Colores:
- Paquete: #D2691E (café)
- "X": #F44336 (rojo error)
- Casa: #95A5A6 (gris)
- Puerta cerrada: #7F8C8D (gris oscuro)
- Candado: #E74C3C (rojo)
- Camión: #FFFFFF (blanco), #2196F3 (azul)
- Advertencia: #FF9800 (naranja)
- Fondo: Transparente

Espacio reservado:
- Esquina superior derecha (320x0 a 400x80): Dejar vacío para logo

Estilo: Flat design, tono serio pero no alarmante.
```

---

## 🎨 Paleta de Colores del Sistema

Para mantener consistencia, usa estos colores en todas las animaciones:

| Color | Hex Code | Uso |
|-------|----------|-----|
| Verde Éxito | `#4CAF50` | Estados positivos, checks |
| Azul Información | `#2196F3` | Tránsito, contenedores, camiones |
| Naranja Advertencia | `#FF9800` | Pendientes, advertencias |
| Rojo Error | `#F44336` | No entregada, problemas |
| Café Paquete | `#D2691E` | Todos los paquetes |
| Gris Neutro | `#95A5A6` | Edificios, elementos secundarios |
| Dorado Destacado | `#FFD700` | Brillos, estrellas |

---

## 📐 Template de Composición

Cada animación debe seguir esta composición:

```
┌─────────────────────────────────────────┐
│                               [LOGO]    │ ← 80x80px reservado
│                                         │
│                                         │
│            [ANIMACIÓN                   │
│             PRINCIPAL]                  │ ← 240x240px centro
│                                         │
│                                         │
│                                         │
│            [Elementos                   │
│             Secundarios]                │
│                                         │
└─────────────────────────────────────────┘
   400x400px
```

---

## 🚀 Prompt Genérico para Lottie

Si necesitas un prompt más genérico para todas las animaciones:

```
Crea un set de 12 animaciones Lottie JSON (400x400px cada una) para un sistema de tracking de paquetes. Cada animación representa un estado diferente del proceso de entrega.

Requisitos técnicos:
- Formato: Lottie JSON optimizado para web
- Dimensiones: 400x400px (cuadrado)
- Tamaño máximo: 200KB por archivo
- Duración: 2-4 segundos con loop infinito
- Frame rate: 30fps
- Fondo: Transparente
- Espacio reservado: Esquina superior derecha (80x80px) para logo de empresa

Estilo visual:
- Flat design moderno y minimalista
- Líneas suaves sin detalles excesivos
- Colores sólidos (sin degradados complejos)
- Animaciones suaves y profesionales
- Sin sombras complejas

Estados a crear:
1. Pendiente de Recolección (naranja #FFA500)
2. Recolectada (verde #4CAF50)
3. En Contenedor USA (azul #2196F3)
4. Incompleta USA (naranja advertencia #FF9800)
5. En Tránsito a RD (azul océano #3498DB)
6. Recibida en RD (verde #4CAF50)
7. Pendiente de Confirmación (naranja #FF9800)
8. Confirmada (verde #4CAF50)
9. En Ruta de Entrega (azul #2196F3)
10. Lista para Entregar (verde #4CAF50)
11. Entregada (verde celebración #4CAF50)
12. No Entregada (rojo #F44336)

Genera cada animación individualmente con los elementos visuales apropiados para cada estado.
```

---

## 📦 Estructura de Archivos

Organiza las animaciones en esta estructura:

```
admin_web/public/animations/
├── pending-pickup.json
├── collected.json
├── container-usa.json
├── incomplete-usa.json
├── transit-rd.json
├── received-rd.json
├── pending-confirmation.json
├── confirmed.json
├── on-route.json
├── ready-delivery.json
├── delivered.json
└── not-delivered.json
```

---

## 🧪 Cómo Probar las Animaciones

### En Lottie Files (Recomendado)
1. Sube el JSON a https://lottiefiles.com/
2. Verifica que el loop funcione correctamente
3. Revisa que el espacio del logo esté vacío
4. Descarga y optimiza si es necesario

### En el Proyecto
```javascript
import Lottie from 'lottie-react';
import pendingAnimation from './animations/pending-pickup.json';

<Lottie
  animationData={pendingAnimation}
  loop={true}
  style={{ width: 400, height: 400 }}
/>
```

---

## ✅ Checklist de Calidad

Antes de aprobar cada animación, verifica:

- [ ] Dimensiones exactas: 400x400px
- [ ] Tamaño de archivo: < 200KB
- [ ] Espacio reservado para logo visible y vacío (esquina superior derecha)
- [ ] Animación hace loop perfectamente (sin saltos)
- [ ] Colores coinciden con la paleta del sistema
- [ ] Elementos son legibles y claros
- [ ] Fondo es transparente
- [ ] Duración apropiada (2-4 segundos)
- [ ] Estilo consistente con las demás animaciones
- [ ] No hay detalles excesivos o texto pequeño ilegible

---

## 🎯 Ejemplo de Uso Final

Cuando implementes en el código, se verá así:

```jsx
// En PublicTracking.jsx
const getAnimationForState = (estado) => {
  const animations = {
    'pendiente_recoleccion': pendingPickup,
    'recolectada': collected,
    'en_contenedor_usa': containerUSA,
    'incompleta_usa': incompleteUSA,
    'en_transito_rd': transitRD,
    'recibida_rd': receivedRD,
    'pendiente_confirmacion': pendingConfirmation,
    'confirmada': confirmed,
    'en_ruta': onRoute,
    'lista_para_entregar': readyDelivery,
    'entregada': delivered,
    'no_entregada': notDelivered
  };

  return animations[estado];
};

// Render
<div className="relative">
  <Lottie
    animationData={getAnimationForState(estadoActual)}
    loop={true}
    style={{ width: 400, height: 400 }}
  />
  {/* Logo de la empresa en la esquina */}
  <img
    src={companyLogo}
    className="absolute top-2 right-2 w-20 h-20"
    alt="Logo"
  />
</div>
```

---

## 📝 Notas Finales

1. **Herramientas recomendadas para crear Lottie:**
   - Adobe After Effects + plugin Bodymovin
   - Lottie Creator (online)
   - Rive (para animaciones interactivas)

2. **Alternativa GIF:**
   Si prefieres GIF en lugar de Lottie:
   - Mantener las mismas especificaciones
   - Optimizar con herramientas como ezGIF
   - Fondo transparente (PNG sequence)

3. **Personalización por empresa:**
   El espacio reservado (80x80px) permite que cada empresa muestre su logo sin modificar las animaciones base.

---

**¿Listo para generar?** Copia los prompts individuales a Gemini, DALL-E, Midjourney o tu herramienta favorita de generación de animaciones. 🎨✨
