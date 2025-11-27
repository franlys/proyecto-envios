# Protocolo Exhaustivo de Pruebas de Calidad (QA) - Proyecto Envíos

Este documento constituye la guía definitiva para la validación funcional del sistema. Cada prueba debe ejecutarse siguiendo estrictamente los pasos descritos para garantizar la estabilidad de la plataforma.

## � Pre-requisitos Generales
1.  Tener acceso a la **Web Administrativa** y a la **App Móvil**.
2.  Tener conexión a internet estable.
3.  Tener a mano las credenciales de prueba (ver sección final).

---

## 🧪 Módulo 1: Rol Recolector (App Móvil)
**Objetivo**: Verificar que el flujo de recogida de paquetes en campo funciona sin errores.

### Prueba 1.1: Creación de Recolección (Flujo Normal)
*   **Pasos**:
    1.  Iniciar sesión como Recolector en la App.
    2.  Ir a la pantalla de "Nueva Recolección".
    3.  Llenar formulario:
        *   **Cliente**: Seleccionar uno existente o crear uno nuevo "Cliente Prueba".
        *   **Peso**: Ingresar `10.5`.
        *   **Descripción**: "Caja de ropa y zapatos".
    4.  **Acción Crítica**: Tocar el botón de cámara y tomar una foto real.
    5.  Guardar.
*   **Resultado Esperado**:
    *   La app muestra mensaje "Guardado exitosamente".
    *   La recolección aparece inmediatamente en la lista "Pendientes" con estado `Pendiente`.
    *   La foto se visualiza correctamente al abrir el detalle.

### Prueba 1.2: Validación de Errores (Campos Vacíos)
*   **Pasos**:
    1.  Intentar guardar una recolección sin seleccionar Cliente ni poner Peso.
*   **Resultado Esperado**:
    *   La app **NO** debe guardar.
    *   Debe mostrar alertas rojas indicando qué campos faltan.

### Prueba 1.3: Sincronización (Modo Offline - Si aplica)
*   **Pasos**:
    1.  Poner el teléfono en "Modo Avión".
    2.  Crear una recolección y guardar.
    3.  Activar internet nuevamente.
*   **Resultado Esperado**:
    *   La recolección se guarda localmente primero.
    *   Al volver internet, se sube automáticamente al servidor.

---

## 🧪 Módulo 2: Rol Almacén USA (Web/App)
**Objetivo**: Verificar la recepción, clasificación y despacho de mercancía.

### Prueba 2.1: Recepción de Paquetes (Escaneo)
*   **Pasos**:
    1.  Iniciar sesión como Almacén.
    2.  Ir a la sección "Escanear / Recibir".
    3.  Ingresar manualmente el código de tracking de la recolección creada en el paso 1.1 (o escanear QR si es posible).
    4.  Confirmar recepción.
*   **Resultado Esperado**:
    *   El sistema confirma "Paquete Recibido".
    *   El estado del envío cambia de `Pendiente` a `Recibido en Almacén`.
    *   (Opcional) Se envía notificación al cliente "Tu paquete llegó al almacén".

### Prueba 2.2: Creación de Contenedor (Embarque)
*   **Pasos**:
    1.  Ir a "Gestión de Contenedores".
    2.  Crear nuevo contenedor: `CONT-PRUEBA-001`.
    3.  Seleccionar 3 paquetes de la lista de "Disponibles" y asignarlos al contenedor.
    4.  Guardar.
*   **Resultado Esperado**:
    *   El contenedor se crea con estado `Abierto`.
    *   Los paquetes asignados ya no aparecen en la lista de "Disponibles".

### Prueba 2.3: Despacho de Contenedor
*   **Pasos**:
    1.  Abrir el contenedor `CONT-PRUEBA-001`.
    2.  Cambiar estado a `En Tránsito`.
    3.  Ingresar fecha estimada de llegada.
*   **Resultado Esperado**:
    *   Todos los paquetes dentro del contenedor actualizan su estado automáticamente a `En Tránsito`.

---

## 🧪 Módulo 3: Rol Secretaria / Facturación (Web Admin)
**Objetivo**: Verificar el proceso de cobro, facturación y notificaciones.

### Prueba 3.1: Carga de Factura (PDF)
*   **Pasos**:
    1.  Ir a "Facturas Pendientes".
    2.  Buscar el envío de la Prueba 1.1.
    3.  Clic en el botón **Editar (Lápiz)**.
    4.  En la sección "Documento", clic en "Subir Factura".
    5.  Seleccionar cualquier PDF de tu computadora.
*   **Resultado Esperado**:
    *   Barra de progreso llega al 100%.
    *   Aparece enlace "Ver Documento".
    *   Al hacer clic en el enlace, se abre el PDF correctamente en otra pestaña.

### Prueba 3.2: Envío de Notificación (Email)
*   **Pasos**:
    1.  En el mismo modal de edición.
    2.  Clic en el botón **"Enviar Email"**.
*   **Resultado Esperado**:
    *   Mensaje "Correo enviado exitosamente".
    *   **Verificación Real**: Revisar la bandeja de entrada del correo asociado al cliente. Debe haber llegado un email con el asunto "Factura de tu envío...".

### Prueba 3.3: Registro de Pago Parcial y Total
*   **Pasos**:
    1.  En el modal de pago (botón $).
    2.  Registrar un pago de $50 (si el total es $100).
    3.  **Resultado**: El estado cambia a `Pago Parcial` y saldo pendiente es $50.
    4.  Registrar otro pago por los $50 restantes.
    5.  **Resultado**: El estado cambia a `Pagado` y saldo es $0.
    6.  El envío desaparece de la lista de "Pendientes de Pago" (o se mueve al historial).

---

## 🧪 Módulo 4: Rol Admin General
**Objetivo**: Verificar que el dueño tiene control total.

### Prueba 4.1: Dashboard y Métricas
*   **Pasos**:
    1.  Entrar al Dashboard principal.
*   **Resultado Esperado**:
    *   Los contadores (Total Envíos, Ingresos, Pendientes) deben coincidir con las pruebas que acabamos de hacer.
    *   Las gráficas deben renderizarse sin errores.

### Prueba 4.2: Gestión de Usuarios
*   **Pasos**:
    1.  Crear un nuevo usuario "Prueba Borrar".
    2.  Editarle el nombre.
    3.  Desactivarlo o eliminarlo.
*   **Resultado Esperado**:
    *   El usuario ya no puede iniciar sesión.

---

## 🔑 Credenciales para Pruebas

| Rol | Usuario (Email) | Contraseña | Notas |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@envios.com` | `Admin123456` | Acceso total. |
| **Recolector** | `recolector@test.com` | `123456` | *Crear este usuario primero desde Admin* |
| **Almacén** | `almacen@test.com` | `123456` | *Crear este usuario primero desde Admin* |
| **Secretaria** | `secretaria@test.com` | `123456` | *Crear este usuario primero desde Admin* |

## 🐞 ¿Qué hacer si una prueba falla?

Si obtienes un resultado diferente al "Resultado Esperado":
1.  **No intentes arreglarlo**.
2.  Toma una captura de pantalla del error o comportamiento extraño.
3.  Anota exactamente qué paso falló (ej. "Paso 4 de Prueba 1.1: La foto no cargó").
4.  Envía el reporte al desarrollador.
