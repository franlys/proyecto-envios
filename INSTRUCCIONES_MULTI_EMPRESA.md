# Instrucciones para Implementación Multi-Empresa (Email y Facturación)

Este documento detalla los pasos técnicos para permitir que cada compañía tenga su propia configuración de correo electrónico y diseño de facturas.

## 1. Base de Datos (Firestore)

Necesitamos expandir el esquema de la colección `companies` para incluir la configuración de correo y diseño.

### Nuevos Campos en `companies/{companyId}`

```javascript
{
  // ... campos existentes (nombre, plan, etc.) ...
  
  // Configuración de Correo (NUEVO)
  emailConfig: {
    service: 'gmail', // o 'smtp'
    user: 'empresa@gmail.com',
    pass: 'wimu etth qgnf qplx', // Contraseña de aplicación encriptada o texto plano (según seguridad deseada)
    from: 'Empresa <empresa@gmail.com>'
  },

  // Diseño de Facturas (NUEVO)
  invoiceDesign: {
    logoUrl: 'https://...', // URL del logo en Firebase Storage
    primaryColor: '#1976D2', // Color principal para bordes/títulos
    secondaryColor: '#f5f5f5', // Color secundario
    template: 'modern', // 'modern', 'classic', 'minimal'
    headerText: 'Gracias por su preferencia',
    footerText: 'Términos y condiciones...'
  }
}
```

## 2. Backend (`backend/src`)

### A. Actualizar `companyController.js`

Modificar `createCompany` y `updateCompany` para aceptar y guardar estos nuevos objetos.

**En `createCompany`:**
Asegurarse de recibir `emailConfig` y `invoiceDesign` del `req.body` y guardarlos en el documento.

**En `updateCompany`:**
Permitir la actualización parcial de estos objetos.

### B. Actualizar `notificationService.js`

Actualmente lee de `process.env`. Debemos refactorizarlo para aceptar la configuración dinámicamente.

**Cambio sugerido:**

```javascript
// Antes
const createTransporter = () => { ... process.env.EMAIL_USER ... }

// Después
const createTransporter = (config) => {
  // Si no hay config específica, usar variables de entorno como fallback (para super admin)
  const user = config?.user || process.env.EMAIL_USER;
  const pass = config?.pass || process.env.EMAIL_PASS;
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

// Al enviar correo
export const sendEmail = async (to, subject, html, companyConfig = null) => {
    const transporter = createTransporter(companyConfig?.emailConfig);
    // ...
}
```

### C. Actualizar Generación de Facturas (PDF)

El servicio que genera el PDF debe leer `company.invoiceDesign` para:
1.  Insertar el logo (`logoUrl`).
2.  Usar `primaryColor` en los encabezados.
3.  Poner el `footerText` al final.

## 3. Frontend (Panel Super Admin)

### A. Formulario de Compañía

En el modal o página donde se crea/edita una compañía:

1.  **Sección "Configuración de Correo"**:
    *   Inputs: Email, Contraseña de Aplicación (type="password").
    *   Botón "Probar Conexión" (opcional, llama a un endpoint de prueba).

2.  **Sección "Diseño de Factura"**:
    *   **Subida de Logo**: Input file que sube a Firebase Storage y guarda la URL.
    *   **Color Picker**: Para seleccionar el color de la marca.
    *   **Text Areas**: Para header y footer.

## 4. Seguridad

*   **Encriptación**: Idealmente, la contraseña del correo (`emailConfig.pass`) no debería guardarse en texto plano si es posible, aunque para un MVP interno puede ser aceptable si la base de datos está bien asegurada.
*   **Permisos**: Solo el `super_admin` o el `admin` de esa compañía específica deben poder ver/editar estos campos.

## Resumen de Tareas para el Desarrollador

1.  [ ] Modificar `companyController.js` para soportar los nuevos campos.
2.  [ ] Refactorizar `notificationService.js` para aceptar configuración dinámica.
3.  [ ] Actualizar el frontend para permitir editar estos campos.
4.  [ ] Probar el flujo completo: Crear compañía -> Configurar correo -> Enviar prueba.
