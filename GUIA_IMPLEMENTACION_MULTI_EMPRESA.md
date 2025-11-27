# Guía de Implementación Multi-Empresa (Email y Facturación)

## ✅ Implementación Completada

La funcionalidad multi-empresa ha sido implementada exitosamente. Ahora cada compañía puede tener su propia configuración de correo electrónico y diseño de facturas personalizado.

## 📋 Cambios Implementados

### 1. Backend

#### `backend/src/controllers/companyController.js`
- ✅ Modificado `createCompany` para aceptar `emailConfig` e `invoiceDesign`
- ✅ Modificado `updateCompany` para permitir actualización de configuraciones

#### `backend/src/services/notificationService.js`
- ✅ Refactorizado `createTransporter` para aceptar configuración dinámica
- ✅ Actualizado `sendEmail` para usar configuración de la compañía
- ✅ Actualizado `sendInvoiceStatusUpdate` para pasar configuración

#### `backend/src/controllers/facturacionController.js`
- ✅ Modificado para obtener y pasar configuración de compañía al enviar correos
- ✅ Integrado con el servicio de notificaciones

#### `backend/src/services/pdfService.js` (NUEVO)
- ✅ Creado servicio completo de generación de PDFs con diseño personalizado
- ✅ Soporte para logos, colores personalizados, plantillas y textos

### 2. Frontend

#### `admin_web/src/pages/Companies.jsx`
- ✅ Agregados campos de configuración de correo en el formulario
- ✅ Agregados campos de diseño de factura en el formulario
- ✅ Modal ampliado para mostrar todas las opciones
- ✅ Formulario actualizado para crear y editar compañías con configuraciones

## 🚀 Cómo Usar

### Para Super Administradores

#### 1. Crear una Nueva Compañía con Configuración

1. Ir a **Gestión de Compañías**
2. Clic en **+ Nueva Compañía**
3. Llenar los datos básicos:
   - Nombre de la Compañía
   - Email del Administrador
   - Contraseña del Administrador
   - Teléfono
   - Dirección
   - Plan

4. **Configuración de Correo:**
   - **Email de la Compañía**: El correo de Gmail de la compañía
   - **Contraseña de Aplicación**: La contraseña de aplicación generada en Google (ver GUIA_GMAIL_APP_PASSWORD.md)

   Ejemplo:
   ```
   Email: embarquesivan@gmail.com
   Contraseña: wimu etth qgnf qplx
   ```

5. **Diseño de Factura:**
   - **URL del Logo**: Link directo a la imagen del logo (puede subirse a Firebase Storage)
   - **Color Principal**: Color de marca (para encabezados, bordes)
   - **Color Secundario**: Color de fondo para secciones
   - **Plantilla**: Moderna, Clásica o Minimalista
   - **Texto de Encabezado**: Mensaje en la parte superior de la factura
   - **Texto de Pie de Página**: Términos, condiciones o información legal

6. Clic en **Crear Compañía**

#### 2. Editar Configuración de una Compañía Existente

1. Ir a **Gestión de Compañías**
2. Clic en **Editar** en la compañía deseada
3. Modificar las configuraciones de correo o diseño
4. Clic en **Guardar Cambios**

### Estructura de Datos en Firestore

```javascript
companies/{companyId}
{
  nombre: "Embarques Iván",
  adminEmail: "admin@embarquesivan.com",
  plan: "premium",
  telefono: "(809) 123-4567",
  direccion: "Santo Domingo, RD",
  activo: true,

  // Configuración de Correo
  emailConfig: {
    service: "gmail",
    user: "embarquesivan@gmail.com",
    pass: "wimu etth qgnf qplx", // Contraseña de aplicación
    from: "embarquesivan@gmail.com"
  },

  // Diseño de Facturas
  invoiceDesign: {
    logoUrl: "https://storage.googleapis.com/.../logo.png",
    primaryColor: "#1976D2",
    secondaryColor: "#f5f5f5",
    template: "modern",
    headerText: "Gracias por confiar en nosotros",
    footerText: "Términos y condiciones: ..."
  }
}
```

## 🔧 Cómo Funciona

### Envío de Correos

Cuando se envía un correo (por ejemplo, al actualizar el estado de una factura):

1. El sistema obtiene el `companyId` de la recolección
2. Lee la configuración de la compañía desde Firestore
3. Pasa la configuración al servicio de notificaciones
4. El servicio crea un transporter con las credenciales de la compañía
5. Envía el correo desde el email configurado de la compañía

**Fallback**: Si no hay configuración de compañía, usa las variables de entorno (EMAIL_USER, EMAIL_PASS) como respaldo.

### Generación de PDFs

El servicio `pdfService.js` genera facturas PDF personalizadas:

1. Recibe los datos de la factura y la configuración de la compañía
2. Descarga el logo desde la URL (si existe)
3. Aplica los colores personalizados
4. Usa la plantilla seleccionada
5. Incluye los textos de encabezado y pie de página
6. Genera el PDF en memoria

## 📝 Ejemplo de Uso Programático

```javascript
import { sendEmail } from './services/notificationService.js';
import { db } from './config/firebase.js';

// Obtener configuración de la compañía
const companyDoc = await db.collection('companies').doc('embarques_ivan').get();
const companyConfig = companyDoc.data();

// Enviar correo con configuración de la compañía
await sendEmail(
  'cliente@email.com',
  'Asunto del correo',
  '<h1>Contenido HTML</h1>',
  [], // attachments
  companyConfig // Configuración de la compañía
);
```

## 🔐 Seguridad

- Las contraseñas de aplicación se guardan en la base de datos
- Solo los super_admin pueden crear/editar compañías
- Las credenciales NO se exponen en las respuestas del API
- Se recomienda usar contraseñas de aplicación de Gmail en lugar de contraseñas reales

## ⚠️ Consideraciones Importantes

1. **Contraseñas de Aplicación**: Cada compañía debe generar su propia contraseña de aplicación en Gmail
2. **Logos**: Los logos deben estar en URLs públicas accesibles
3. **Colores**: Usar formato hexadecimal (#RRGGBB)
4. **Plantillas**: Actualmente soporta 'modern', 'classic', 'minimal'
5. **Fallback**: Si no hay configuración, usa las variables de entorno del sistema

## 🎯 Próximos Pasos Recomendados

1. **Encriptación**: Implementar encriptación para las contraseñas de email
2. **Subida de Logos**: Agregar función para subir logos directamente a Firebase Storage desde el formulario
3. **Vista Previa**: Agregar preview del diseño de factura en el formulario
4. **Plantillas Avanzadas**: Crear más plantillas de diseño
5. **Validación**: Validar correos con un botón "Probar Conexión"

## 📚 Archivos Relacionados

- `INSTRUCCIONES_MULTI_EMPRESA.md` - Instrucciones técnicas originales
- `GUIA_GMAIL_APP_PASSWORD.md` - Cómo generar contraseñas de aplicación en Gmail
- `GUIA_NOTIFICACIONES_COMPLETAS.md` - ⭐ Guía completa de notificaciones por email
- `backend/src/controllers/companyController.js` - Controlador de compañías
- `backend/src/controllers/recoleccionesController.js` - Controlador de recolecciones (incluye notificaciones)
- `backend/src/services/notificationService.js` - Servicio de notificaciones
- `backend/src/services/pdfService.js` - Servicio de generación de PDFs
- `admin_web/src/pages/Companies.jsx` - Interfaz de gestión de compañías

## ✅ Checklist de Implementación

- [x] Modificar `companyController.js` para soportar nuevos campos
- [x] Refactorizar `notificationService.js` para configuración dinámica
- [x] Crear `pdfService.js` para generación de PDFs personalizados
- [x] Actualizar frontend para editar configuraciones
- [x] Instalar dependencia `pdfkit`
- [x] Actualizar `facturacionController.js` para pasar configuración
- [x] Agregar notificaciones en `recoleccionesController.js` para todos los estados
- [x] Implementar notificaciones de cambio de estado del envío
- [x] Implementar notificaciones de confirmación de pago
- [x] Crear documentación de uso

## 🐛 Solución de Problemas

### Los correos no se envían
- Verificar que la contraseña de aplicación esté correctamente ingresada
- Verificar que el email sea una cuenta de Gmail válida
- Revisar logs del servidor para errores específicos

### El logo no aparece en el PDF
- Verificar que la URL del logo sea accesible públicamente
- Verificar que la URL apunte directamente a una imagen (JPG, PNG)
- Revisar logs para errores de descarga

### Los colores no se aplican
- Verificar que estén en formato hexadecimal (#RRGGBB)
- Probar con colores por defecto primero
