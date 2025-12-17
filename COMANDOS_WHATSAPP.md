# Sistema de Comandos WhatsApp por Rol

## Resumen Ejecutivo

Sistema completo de comandos interactivos por WhatsApp que permite a cada rol gestionar sus operaciones diarias sin necesidad de ingresar al sistema web. Los comandos son identificados automáticamente por el número de WhatsApp del empleado vinculado a su cuenta.

---

## 1. SECRETARIAS / ADMIN GENERAL

### Propósito
Gestión rápida de entregas fallidas y reasignación masiva para optimizar rutas.

### Comandos Disponibles

#### `lista`
- **Función**: Ver todas las entregas fallidas (no_entregada)
- **Ejemplo**: `lista`
- **Respuesta**: Lista de hasta 10 entregas fallidas con código de tracking, cliente, zona y motivo de fallo
- **Caso de uso**: Revisar pendientes al inicio del día antes de crear nuevas rutas

#### `info EMI-XXXX`
- **Función**: Ver detalles completos de una entrega específica
- **Ejemplo**: `info EMI-0245`
- **Respuesta**: Cliente, dirección, teléfono, motivo de fallo, repartidor anterior, evidencias
- **Caso de uso**: Investigar por qué falló una entrega antes de decidir acción

#### `reasignar EMI-XXXX`
- **Función**: Devolver una entrega fallida al estado "recibida_rd" para nueva ruta
- **Ejemplo**: `reasignar EMI-0245`
- **Respuesta**: Confirmación de reasignación exitosa
- **Caso de uso**: Reasignar entregas individualmente cuando solo algunas son viables

#### `reasignar todo`
- **Función**: Reasignar TODAS las entregas fallidas a estado "recibida_rd" en una sola operación
- **Ejemplo**: `reasignar todo`
- **Respuesta**: Confirmación con cantidad de entregas reasignadas
- **Caso de uso**: Al final del día o inicio de la semana para limpiar todas las fallidas
- **Nota**: Usa batch update de Firestore para operación atómica

### Flujo de Trabajo Típico
1. Recibir reporte diario automático a las 8:00 PM con entregas fallidas
2. Por la mañana: escribir `lista` para revisar pendientes
3. Para casos específicos: `info EMI-0245` para investigar
4. Decidir: `reasignar EMI-0245` individual o `reasignar todo` masivo
5. Crear nuevas rutas en sistema web con paquetes ahora en estado "recibida_rd"

---

## 2. REPARTIDORES

### Propósito
Seguimiento de ruta en tiempo real, gestión de gastos y consulta de entregas pendientes sin desviar atención de la ruta.

### Comandos Básicos

#### `mis rutas`
- **Función**: Ver TODAS las rutas activas (asignada, en_curso, cargada)
- **Ejemplo**: `mis rutas`
- **Respuesta**: Lista de rutas con nombre, estado, cantidad de paquetes, zona
- **Caso de uso**: Al inicio del día para ver qué rutas tiene asignadas
- **Nota**: Puede haber múltiples rutas activas

#### `gastos`
- **Función**: Ver todos los gastos registrados HOY en todas las rutas activas
- **Ejemplo**: `gastos`
- **Respuesta**: Lista detallada de gastos con tipo, monto, ruta asociada y total
- **Caso de uso**: Revisar antes de cerrar ruta para verificar que todo está registrado

#### `pendientes`
- **Función**: Ver paquetes aún sin entregar (asignado, en_ruta)
- **Ejemplo**: `pendientes`
- **Respuesta**: Hasta 10 paquetes con código, cliente y zona
- **Caso de uso**: Durante la ruta para planificar siguientes paradas

### Comandos Bonus (Nuevos)

#### `ruta actual`
- **Función**: Ver detalles de la ruta EN CURSO en este momento
- **Ejemplo**: `ruta actual`
- **Respuesta**:
  - Nombre de ruta y zona
  - Total paquetes, entregados y pendientes
  - Gastos acumulados
  - Hora de inicio real
- **Caso de uso**: Checkpoint rápido durante el día para saber progreso exacto
- **Beneficio**: Motivación y visibilidad de avance

#### `próxima entrega`
- **Función**: Ver detalles del SIGUIENTE paquete a entregar en ruta actual
- **Ejemplo**: `próxima entrega`
- **Respuesta**:
  - Código de tracking
  - Nombre y teléfono del cliente
  - Dirección completa con referencia
  - Monto total y pendiente por cobrar
- **Caso de uso**: Antes de cada parada para tener info del cliente lista
- **Beneficio**: Entrega más profesional con datos correctos

#### `registrar gasto [tipo] [monto]`
- **Función**: Agregar gasto a la ruta activa sin entrar al sistema
- **Ejemplo**:
  - `registrar gasto gasolina 500`
  - `registrar gasto peaje 50`
  - `registrar gasto comida 150`
- **Respuesta**: Confirmación con gasto registrado y total acumulado del día
- **Caso de uso**: Inmediatamente después del gasto para no olvidar
- **Beneficio**: Contabilidad precisa sin depender de memoria al final del día
- **Nota**: Se guarda en el array `gastos` de la ruta con timestamp

### Flujo de Trabajo Típico
1. Por la mañana: `mis rutas` para ver asignaciones
2. Al salir: `ruta actual` para confirmar detalles
3. Antes de cada parada: `próxima entrega` para ver info del cliente
4. Después de cualquier gasto: `registrar gasto gasolina 500`
5. Durante el día: `gastos` para tracking de presupuesto
6. Al atardecer: `pendientes` para planificar cierre de ruta

---

## 3. RECOLECTORES

### Propósito
Gestión de citas de recolección, aceptación/rechazo de asignaciones y consulta de pool compartido.

### Comandos Básicos

#### `mis citas`
- **Función**: Ver citas asignadas (asignada_pendiente, asignada)
- **Ejemplo**: `mis citas`
- **Respuesta**: Lista de citas con cliente, fecha, hora, dirección y estado de aceptación
- **Caso de uso**: Planificar agenda del día
- **Nota**: Indica cuáles están pendientes de aceptación

#### `pool`
- **Función**: Ver solicitudes disponibles en el pool compartido (estado: pendiente)
- **Ejemplo**: `pool`
- **Respuesta**: Hasta 10 solicitudes con cliente, fecha/hora y sector
- **Caso de uso**: Buscar trabajo adicional cuando hay tiempo libre
- **Nota**: Para tomar una solicitud debe usar el sistema web

### Comandos Bonus (Nuevos)

#### `próxima cita`
- **Función**: Ver detalles de la PRÓXIMA cita cronológicamente
- **Ejemplo**: `próxima cita`
- **Respuesta**:
  - Cliente y teléfono
  - Fecha y hora exacta
  - Dirección con referencia
  - Notas especiales
  - Estado de aceptación
- **Caso de uso**: Al salir a ruta para saber a dónde ir primero
- **Beneficio**: Priorización automática sin calcular manualmente

#### `aceptar [ID]`
- **Función**: Aceptar una asignación manual de Secretaria
- **Ejemplo**: `aceptar SOL-001`
- **Respuesta**: Confirmación con detalles de cliente, fecha, hora y teléfono
- **Caso de uso**: Responder a asignación manual recibida por WhatsApp
- **Beneficio**: No necesita entrar al sistema para confirmar
- **Nota**: Cambia estado de "asignada_pendiente" a "asignada"
- **Timeout**: Si no acepta en 10 minutos, vuelve al pool

#### `rechazar [ID] [motivo]`
- **Función**: Rechazar una asignación con motivo registrado
- **Ejemplo**: `rechazar SOL-001 no puedo llegar a tiempo`
- **Respuesta**: Confirmación de rechazo y devolución al pool
- **Caso de uso**: Cuando tiene conflicto de horario o zona
- **Beneficio**: Libera la solicitud inmediatamente para que otro recolector la tome
- **Nota**: Motivo queda registrado en historial

### Flujo de Trabajo Típico
1. Recibir notificación WhatsApp de asignación manual por Secretaria
2. Usar `mis citas` para ver todas las asignaciones
3. Decidir: `aceptar SOL-001` o `rechazar SOL-001 conflicto de horario`
4. Por la mañana: `próxima cita` para saber a dónde ir
5. Si tiene tiempo libre: `pool` para buscar trabajo adicional
6. Durante el día: `mis citas` para recordar agenda

---

## 4. ALMACÉN USA

### Propósito
Monitoreo de inventario, estado de contenedor y procesamiento de paquetes recibidos.

### Comandos Básicos

#### `contenedor`
- **Función**: Ver información del contenedor abierto actualmente
- **Ejemplo**: `contenedor`
- **Respuesta**: Nombre, código, cantidad de paquetes y fecha de cierre estimada
- **Caso de uso**: Verificar si hay contenedor disponible para agregar paquetes

#### `pendientes usa`
- **Función**: Ver paquetes pendientes de procesar (pendiente, en_revision)
- **Ejemplo**: `pendientes usa`
- **Respuesta**: Hasta 15 paquetes con código, remitente y cantidad de items
- **Caso de uso**: Planificar trabajo de revisión del día

### Comandos Bonus (Nuevos)

#### `stats almacen`
- **Función**: Dashboard de estadísticas del almacén USA
- **Ejemplo**: `stats almacen`
- **Respuesta**:
  - Cantidad de pendientes
  - En revisión
  - Procesados hoy (en tránsito)
  - Estado del contenedor abierto (si/no y cantidad)
- **Caso de uso**: Checkpoint matutino para planificar prioridades del día
- **Beneficio**: KPIs instantáneos sin entrar al sistema

#### `últimos recibidos`
- **Función**: Ver últimos 10 paquetes ingresados al sistema
- **Ejemplo**: `últimos recibidos`
- **Respuesta**: Lista con código, remitente, estado y hora de ingreso
- **Caso de uso**: Verificar que paquetes recién escaneados aparecen correctamente
- **Beneficio**: Validación inmediata de ingreso correcto al sistema

### Flujo de Trabajo Típico
1. Al llegar: `stats almacen` para ver panorama del día
2. Verificar: `contenedor` para saber si hay uno abierto
3. Durante recepción: `últimos recibidos` para validar escaneo
4. Planificar revisión: `pendientes usa` para ver backlog
5. Cierre del día: `stats almacen` para verificar avance

---

## 5. ALMACÉN RD

### Propósito
Control de paquetes recibidos listos para asignar a rutas de entrega.

### Comandos Básicos

#### `recibidos` / `disponibles`
- **Función**: Ver paquetes en estado "recibida_rd" listos para rutas (son el mismo comando)
- **Ejemplo**: `recibidos` o `disponibles`
- **Respuesta**: Hasta 15 paquetes con código, cliente y zona
- **Caso de uso**: Al crear rutas para saber cuántos paquetes hay y de qué zonas
- **Beneficio**: Planificación eficiente de rutas por zona

### Flujo de Trabajo Típico
1. Por la mañana: `recibidos` para ver inventario disponible
2. Antes de crear ruta: `disponibles` para confirmar cantidad por zona
3. Después de asignar rutas: `recibidos` de nuevo para ver qué quedó pendiente

---

## 6. ADMIN GENERAL / PROPIETARIO

### Propósito
Monitoreo ejecutivo del negocio, alertas críticas y reportes gerenciales sin necesidad de dashboard.

### Comandos Básicos

#### `stats`
- **Función**: Estadísticas en vivo del día actual
- **Ejemplo**: `stats`
- **Respuesta**:
  - Entregas completadas
  - En proceso
  - Fallidas
  - Rutas activas
  - Tasa de éxito (%)
- **Caso de uso**: Checkpoint rápido durante el día para monitorear operación

#### `alertas`
- **Función**: Resumen de alertas del sistema
- **Ejemplo**: `alertas`
- **Respuesta**:
  - Cantidad de entregas fallidas
  - Rutas en curso (posiblemente atrasadas)
  - Paquetes sin asignar (si > 10)
  - Mensaje de "todo bien" si no hay alertas
- **Caso de uso**: Identificar problemas operativos que requieren atención

### Comandos Bonus (Nuevos)

#### `reporte semanal`
- **Función**: Resumen de los últimos 7 días
- **Ejemplo**: `reporte semanal`
- **Respuesta**:
  - Rango de fechas
  - Total de entregas exitosas
  - Entregas fallidas
  - Tasa de éxito global (%)
  - Ingresos totales generados
- **Caso de uso**: Reuniones semanales o reportes a inversionistas
- **Beneficio**: Métricas consolidadas sin generar reportes manualmente

#### `top repartidores`
- **Función**: Ranking de los 5 mejores repartidores por entregas
- **Ejemplo**: `top repartidores`
- **Respuesta**:
  - Top 5 con medallas (🥇🥈🥉)
  - Nombre del repartidor
  - Cantidad de entregas exitosas
  - Periodo: última semana
- **Caso de uso**: Identificar empleados destacados para incentivos
- **Beneficio**: Reconocimiento basado en datos, no en percepción

#### `zonas críticas`
- **Función**: Zonas geográficas con mayor cantidad de entregas fallidas
- **Ejemplo**: `zonas críticas`
- **Respuesta**:
  - Top 5 zonas con más fallos
  - Cantidad de entregas fallidas por zona
- **Caso de uso**: Identificar problemas logísticos o necesidad de redistribución
- **Beneficio**: Decisiones estratégicas para mejorar cobertura

### Flujo de Trabajo Típico
1. Todas las mañanas: `stats` para ver panorama del día anterior
2. Si hay problemas: `alertas` para identificar prioridades
3. Reunión semanal: `reporte semanal` para métricas consolidadas
4. Revisión de personal: `top repartidores` para reconocimientos
5. Planificación estratégica: `zonas críticas` para optimización de rutas

---

## 7. COMANDO UNIVERSAL

#### `ayuda` / `comandos` / `help`
- **Función**: Ver lista de comandos disponibles para tu rol
- **Ejemplo**: `ayuda`
- **Respuesta**: Lista personalizada según el rol del usuario que escribe
- **Caso de uso**: Recordar comandos disponibles sin consultar documentación

---

## Arquitectura Técnica

### Identificación Automática de Usuario
```javascript
// Busca en colección 'usuarios' por campo 'whatsappFlota'
const usuariosSnapshot = await db.collection('usuarios')
    .where('companyId', '==', companyId)
    .where('whatsappFlota', '==', remoteJid.split('@')[0])
    .limit(1)
    .get();

if (!usuariosSnapshot.empty) {
    const userData = usuariosSnapshot.docs[0].data();
    userRole = userData.rol; // secretaria, repartidor, recolector, etc.
    userName = userData.nombre;
    userId = usuariosSnapshot.docs[0].id;
}
```

### Seguridad por Rol
- Cada comando valida el rol antes de ejecutar
- Ejemplo: `const esSecretaria = ['secretaria', 'secretaria_usa', 'admin_general', 'propietario'].includes(userRole);`
- Si el rol no coincide, el comando no se ejecuta

### Integración con Reporte Diario
El cron job de entregas fallidas (8:00 PM) incluye instrucciones de comandos:
```javascript
mensaje += `\n\n🔄 *Estas entregas necesitan reasignación.*\n\n`;
mensaje += `💬 *COMANDOS DISPONIBLES:*\n`;
mensaje += `• Escribe \`lista\` - Ver todas las fallidas\n`;
mensaje += `• Escribe \`info EMI-XXXX\` - Ver detalles\n`;
mensaje += `• Escribe \`reasignar EMI-XXXX\` - Reasignar una\n`;
mensaje += `• Escribe \`reasignar todo\` - Reasignar todas\n\n`;
mensaje += `📱 _Puedes gestionar todo desde WhatsApp._`;
```

---

## Tabla Resumen de Comandos por Rol

| Rol | Comandos Básicos | Comandos Bonus | Total |
|-----|-----------------|----------------|-------|
| **Secretarias** | lista, info, reasignar, reasignar todo | - | 4 |
| **Repartidores** | mis rutas, gastos, pendientes | ruta actual, próxima entrega, registrar gasto | 6 |
| **Recolectores** | mis citas, pool | próxima cita, aceptar, rechazar | 5 |
| **Almacén USA** | contenedor, pendientes usa | stats almacen, últimos recibidos | 4 |
| **Almacén RD** | recibidos/disponibles | - | 1 |
| **Admin/Propietario** | stats, alertas | reporte semanal, top repartidores, zonas críticas | 5 |
| **Todos** | ayuda/comandos/help | - | 1 |
| **TOTAL** | - | - | **26 comandos** |

---

## Beneficios del Sistema

### Operacionales
- **Reducción de tiempo**: Tareas de 2-3 minutos (login web) ahora son 10 segundos (comando WhatsApp)
- **Accesibilidad móvil**: Funciona desde cualquier celular sin app adicional
- **Menos interrupciones**: Repartidores no desvían atención de la ruta
- **Registro inmediato**: Gastos se registran al momento, no al final del día

### Gerenciales
- **Datos en tiempo real**: Decisiones basadas en información actualizada
- **Transparencia**: Todos los comandos quedan registrados en logs
- **Autonomía**: Empleados resuelven tareas sin depender de oficina
- **Reconocimiento**: Sistema de ranking automático basado en datos

### Técnicos
- **Sin app adicional**: Usa infraestructura de WhatsApp existente
- **Escalable**: Agregar nuevos comandos es agregar un bloque if
- **Mantenible**: Cada comando es independiente, fácil de debuggear
- **Seguro**: Validación de rol en cada comando

---

## Casos de Uso Reales

### Caso 1: Secretaria Limpia Entregas Fallidas
**Situación**: Lunes por la mañana, hay 15 entregas fallidas del viernes.
**Sin comandos**: Entra al sistema web, busca cada entrega, cambia estado manualmente una por una (15-20 minutos).
**Con comandos**:
1. Escribe `lista` para revisar (10 segundos)
2. Escribe `reasignar todo` (5 segundos)
3. Entra al sistema web a crear rutas (2 minutos)
**Tiempo ahorrado**: 13-18 minutos

### Caso 2: Repartidor Registra Gastos Durante Ruta
**Situación**: Ruta de 8 horas con 3 paradas de gasolina, 2 peajes, 1 comida.
**Sin comandos**: Guarda tickets en bolsillo, al final del día intenta recordar montos exactos y tipos (error común: olvida peajes pequeños).
**Con comandos**: Después de cada gasto escribe:
- `registrar gasto gasolina 500`
- `registrar gasto peaje 50`
- `registrar gasto comida 150`
**Beneficio**: Contabilidad 100% precisa, sin pérdida de tickets, sin errores de memoria.

### Caso 3: Admin Detecta Problema de Zona
**Situación**: Miércoles al mediodía, sospecha que hay problema en zona específica.
**Sin comandos**: Entra al dashboard web, genera reporte, filtra por zona, analiza datos (5-7 minutos).
**Con comandos**:
1. Escribe `zonas críticas` (5 segundos)
2. Ve inmediatamente que "Los Mina" tiene 8 fallos vs 1-2 de otras zonas
3. Llama a encargado de esa zona para investigar
**Tiempo ahorrado**: 5 minutos, pero más importante: **detección temprana de problema**.

### Caso 4: Recolector Rechaza Asignación Conflictiva
**Situación**: Recibe asignación manual para Las Américas a las 2 PM, pero ya tiene cita en Villa Mella a las 2:30 PM (imposible llegar).
**Sin comandos**: Debe llamar a oficina, esperar que contesten, explicar situación, esperar que reasignen manualmente (3-5 minutos + frustración).
**Con comandos**: Escribe `rechazar SOL-045 ya tengo cita en Villa Mella 2:30pm` (15 segundos), solicitud vuelve al pool automáticamente, otro recolector la toma.
**Beneficio**: Resolución instantánea, registro automático de motivo, sin frustración.

---

## Mantenimiento y Expansión

### Agregar Nuevo Comando
1. Agregar bloque `if` con regex de detección en whatsappWebhookController.js
2. Validar rol con variable `esROLE`
3. Implementar lógica de consulta/actualización Firestore
4. Enviar mensaje de respuesta con `whatsappService.sendMessage()`
5. Actualizar comando `ayuda` con nuevo comando
6. Documentar en este archivo

### Logs y Debugging
Todos los comandos hacen `console.log('🔍 Comando XXX detectado')` para tracking.
Ver logs en Railway o servidor de producción con:
```bash
railway logs --follow
```

### Pruebas
Usar número de WhatsApp de prueba vinculado a usuario de cada rol en Firestore.
Enviar comandos desde WhatsApp y verificar respuestas.

---

## Notas Finales

- **Educación del usuario**: Incluir comandos disponibles en onboarding de empleados
- **Iteración continua**: Pedir feedback a empleados sobre comandos más usados/útiles
- **Monitoreo de uso**: Agregar analytics para saber qué comandos son más populares
- **Limitaciones**: Algunos comandos sugieren "usa el sistema web" cuando la acción es muy compleja (ej: crear ruta requiere drag-and-drop, no factible por WhatsApp)

**Sistema diseñado y desarrollado para optimizar operaciones diarias mediante automatización conversacional.**
