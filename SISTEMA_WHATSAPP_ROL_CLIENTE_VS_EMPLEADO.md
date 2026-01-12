# 🔐 Sistema de Roles WhatsApp: Cliente vs Empleado

## 📊 RESUMEN DEL SISTEMA

### ✅ **¿QUÉ TENEMOS IMPLEMENTADO?**

El sistema **identifica automáticamente** a empleados y clientes en WhatsApp usando el campo `whatsappFlota` de los usuarios.

---

## 🔑 Identificación de Usuarios

### **Cómo Funciona**
1. Cuando llega un mensaje de WhatsApp, el sistema extrae el número de teléfono (`remoteJid`)
2. Busca en la colección `usuarios` si ese número coincide con algún campo `whatsappFlota`
3. Si encuentra coincidencia → **EMPLEADO** (obtiene su rol: repartidor, secretaria, etc.)
4. Si NO encuentra coincidencia → **CLIENTE** (acceso público limitado)

### **Código de Identificación**
```javascript
// backend/src/controllers/whatsappWebhookController.js:165-179
const usuariosSnapshot = await db.collection('usuarios')
    .where('companyId', '==', companyId)
    .where('whatsappFlota', '==', remoteJid.split('@')[0])
    .limit(1)
    .get();

if (!usuariosSnapshot.empty) {
    // ✅ ES EMPLEADO
    userRole = userData.rol;
    userName = userData.nombre;
    console.log(`✅ EMPLEADO: ${userName} | Rol: ${userRole}`);
} else {
    // 👤 ES CLIENTE
    console.log(`👤 CLIENTE: ${pushName} (sin rol)`);
}
```

---

## 🚫 Protección de Comandos de Empleados

### **Validación Automática**
Los clientes **NO PUEDEN** ejecutar comandos de empleados. Si lo intentan, reciben un mensaje amigable.

### **Comandos Bloqueados para Clientes**
```javascript
// Línea 192-201
const COMANDOS_EMPLEADOS = [
    'reasignar', 'info', 'lista',                      // Secretaria
    'mis rutas', 'ruta actual', 'próxima entrega',     // Repartidor
    'gastos', 'registrar gasto', 'pendientes',
    'mis citas', 'pool', 'próxima cita',               // Recolector
    'contenedor', 'pendientes usa', 'stats almacen',   // Almacén USA
    'recibidos', 'disponibles',                        // Almacén RD
    'stats', 'alertas', 'reporte semanal',             // Admin
    'top repartidores', 'zonas críticas'
];
```

### **Respuesta para Clientes**
Si un cliente escribe `reasignar EMI-0001`, recibe:

```
🔒 Comando no disponible

El comando "reasignar" es exclusivo para empleados.

✨ Como cliente puedes:
📦 Agendar envíos - Escribe "agendar"
🔍 Rastrear paquetes - Envía tu código (ej: EMI-0001)
💲 Consultar precios - Escribe "precio"
👨‍💻 Hablar con soporte - Escribe "soporte"

Escribe "menú" para ver todas las opciones.
```

---

## 📋 Comando de Ayuda Inteligente

### **Para Empleados**
Cuando un empleado escribe `ayuda` o `comandos`:
- Muestra su rol actual
- Lista SOLO los comandos de su rol
- No muestra comandos de otros roles

**Ejemplo (Repartidor):**
```
💡 COMANDOS DISPONIBLES

👤 Tu rol: repartidor

🚚 Repartidor:
• `mis rutas` - Ver rutas activas
• `ruta actual` - Ruta en curso
• `próxima entrega` - Siguiente paquete
• `gastos` - Ver gastos del día
• `registrar gasto [tipo] [monto]`
• `pendientes` - Paquetes sin entregar

💬 Todos los comandos funcionan por WhatsApp.
```

### **Para Clientes**
Cuando un cliente escribe `ayuda`:
- Muestra opciones públicas
- No menciona comandos de empleados
- Enfoque en servicios al cliente

**Ejemplo:**
```
💡 ¿QUÉ PUEDO HACER?

👋 Hola Juan, soy tu asistente virtual. Puedo ayudarte con:

📦 Agendar Recolección
   Escribe: "agendar", "nuevo envío", "pickup"

🔍 Rastrear tu Envío
   Envía tu código: EMI-0001, LOE-9999
   O escribe: "dónde está", "rastrear"

💲 Consultar Precios
   Escribe: "precio", "cuánto cuesta", "tarifa"

👨‍💻 Hablar con Soporte
   Escribe: "soporte", "ayuda", "agente"

🕐 Horarios y Ubicación
   Escribe: "horario" o "dirección"

📋 Para ver el menú completo, escribe "menú"
```

---

## 🎯 Roles de Empleados Soportados

| Rol | Variable | Comandos Principales |
|-----|----------|---------------------|
| **Secretaria** | `secretaria`, `secretaria_usa` | `lista`, `info`, `reasignar` |
| **Admin General** | `admin_general` | Todos los de secretaria + `stats`, `alertas` |
| **Propietario** | `propietario` | Todos los comandos |
| **Repartidor** | `repartidor` | `mis rutas`, `próxima entrega`, `gastos` |
| **Recolector** | `recolector` | `mis citas`, `pool`, `aceptar` |
| **Almacén USA** | `almacen_usa` | `contenedor`, `pendientes usa` |
| **Almacén RD** | `almacen_rd` | `recibidos`, `disponibles` |

---

## 📱 ¿Cómo se Asigna el WhatsApp de Flota?

### **Al Crear un Empleado**
En el panel admin, cuando creas un empleado, hay un campo:

```javascript
// backend/src/controllers/empleadoController.js:11
const {
    whatsappFlota,  // ← Número de WhatsApp Business de la empresa
    whatsappPersonal // ← Número personal del empleado (opcional)
} = req.body;
```

**Ejemplo:**
- **Empresa**: Embarques Ivan (WhatsApp Business: +1 809-555-1234)
- **Empleado**: Juan Pérez (Repartidor)
- **whatsappFlota**: `18095551234` (sin + ni espacios)
- **whatsappPersonal**: `18291234567` (su celular personal)

### **¿Qué Número Debe Usar el Empleado?**
El empleado debe escribir desde el **número de flota** (`whatsappFlota`) para que el sistema lo reconozca.

---

## 🧪 Cómo Probar el Sistema

### **Test 1: Cliente Enviando Comando de Empleado**
1. Desde un número **NO registrado** en `usuarios`
2. Envía: `reasignar EMI-0001`
3. **Resultado esperado**: Mensaje de "Comando no disponible"

### **Test 2: Empleado Ejecutando Comando**
1. Desde el número registrado en `whatsappFlota` de un repartidor
2. Envía: `mis rutas`
3. **Resultado esperado**: Lista de rutas activas

### **Test 3: Cliente Pidiendo Ayuda**
1. Desde número de cliente
2. Envía: `ayuda`
3. **Resultado esperado**: Menú de opciones públicas

### **Test 4: Empleado Pidiendo Ayuda**
1. Desde número de empleado (secretaria)
2. Envía: `comandos`
3. **Resultado esperado**: Solo comandos de secretaria

---

## 🔍 Logs Mejorados

El sistema ahora muestra claramente en los logs quién es quién:

```bash
# Empleado identificado:
✅ EMPLEADO identificado: Juan Pérez | Rol: repartidor | WhatsApp Flota: 18095551234

# Cliente detectado:
👤 CLIENTE detectado: María López | WhatsApp: 18091234567 (no registrado como empleado)

# Cliente intentando comando bloqueado:
🚫 Cliente intentó usar comando de empleado: "reasignar"
```

---

## 🚀 Mejoras Implementadas

### **Antes** ❌
- Clientes podían intentar ejecutar cualquier comando
- No había diferenciación clara entre cliente y empleado
- El comando "ayuda" no funcionaba para clientes
- Logs genéricos sin distinción de roles

### **Ahora** ✅
- Validación temprana de comandos de empleados
- Mensajes amigables cuando clientes intentan comandos bloqueados
- Comando "ayuda" inteligente (muestra opciones según el rol)
- Logs detallados con identificación clara de empleados vs clientes
- Sistema completamente funcional y seguro

---

## 📋 Resumen de Features Implementadas

| Feature | Estado | Descripción |
|---------|--------|-------------|
| Identificación por WhatsApp Flota | ✅ Completo | Busca `whatsappFlota` en usuarios |
| Protección de comandos | ✅ Completo | Bloquea comandos de empleados para clientes |
| Ayuda contextual | ✅ Completo | Mensajes diferentes para empleados/clientes |
| Logs mejorados | ✅ Completo | Identifica claramente empleado vs cliente |
| Validación de roles | ✅ Completo | Verifica permisos antes de ejecutar |
| Mensajes amigables | ✅ Completo | Respuestas educativas para clientes |

---

## 🛠️ Mantenimiento

### **Agregar Nuevo Comando de Empleado**
1. Agregar el comando a la lista `COMANDOS_EMPLEADOS` (línea 192)
2. Implementar la lógica del comando con validación de rol
3. Actualizar el comando "ayuda" para ese rol

### **Cambiar Mensaje de Bloqueo**
Editar línea 213-220 en `whatsappWebhookController.js`

---

## ✅ Conclusión

El sistema está **completamente funcional** y separa correctamente:
- ✅ Empleados identificados por `whatsappFlota`
- ✅ Clientes sin acceso a comandos internos
- ✅ Mensajes contextuales según el tipo de usuario
- ✅ Protección de comandos sensibles
- ✅ Experiencia optimizada para ambos tipos de usuarios
