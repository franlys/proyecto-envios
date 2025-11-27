# Análisis: Soporte Multi-Empresa (Multi-Tenant)

Este documento responde a tu consulta sobre cómo manejar múltiples empresas con configuraciones independientes de correo y diseño de facturas dentro del mismo sistema.

## 1. ¿Es posible?

**SÍ.** La arquitectura actual ya soporta la separación de usuarios por `companyId` (ID de Empresa). Solo necesitamos extender la funcionalidad para que la configuración de correos y facturas sea dinámica en lugar de global.

---

## 2. ¿Cómo funcionaría la Configuración?

Actualmente, el sistema lee el correo del archivo `.env` (una sola configuración para todos). Para soportar múltiples empresas, haremos lo siguiente:

### A. Nueva Colección: `empresas` (Companies)
Crearemos una colección en la base de datos donde cada documento represente una empresa y guarde su configuración específica:

```json
// Ejemplo de documento en Firestore: /empresas/empresa_A
{
  "id": "empresa_A",
  "nombre": "Embarques Ivan",
  "configuracion": {
    "email": {
      "servicio": "gmail",
      "usuario": "mayckol@embarquesivan.com",
      "password": "app_password_segura", // Encriptada
      "desde": "Embarques Ivan <mayckol@embarquesivan.com>"
    },
    "facturacion": {
      "logoUrl": "https://storage.../logo_ivan.png",
      "colorPrimario": "#003366",
      "pieDePagina": "Gracias por preferir Embarques Ivan - RNC: 123..."
    }
  }
}
```

### B. Panel de "Super Admin"
El Super Admin tendrá una vista para **Crear/Editar Empresa** donde podrá:
1.  Subir el **Logo** de la empresa.
2.  Ingresar las **Credenciales de Correo** (SMTP/Gmail) de esa empresa específica.
3.  Definir colores o textos para la factura.

---

## 3. ¿Cómo funcionaría el Envío de Correos?

Cuando un empleado (ej. `recolector@embarquesivan.com`) intenta enviar una factura:

1.  **Identificación**: El sistema detecta que el empleado pertenece a la empresa `empresa_A`.
2.  **Obtención de Credenciales**: El backend busca en la base de datos la configuración de `empresa_A`.
3.  **Envío Dinámico**: En lugar de usar el correo del `.env`, el sistema crea una conexión temporal usando `mayckol@embarquesivan.com` y envía el correo.

**Resultado**: El cliente recibe el correo desde la dirección correcta de la empresa, no desde una genérica.

---

## 4. ¿Cómo funcionaría la Generación de Facturas?

Similar al correo:

1.  Al generar el PDF, el sistema busca el perfil de la empresa del usuario.
2.  **Inyecta el Logo**: Pone el logo de "Embarques Ivan" en la cabecera.
3.  **Inyecta Datos Fiscales**: Pone el RNC, dirección y teléfono de esa empresa específica.

---

## Resumen de Cambios Necesarios (Solo Informativo)

Para lograr esto, se requeriría:
1.  **Base de Datos**: Crear la colección `empresas` con los campos de configuración.
2.  **Backend**: Modificar `notificationService.js` para aceptar credenciales dinámicas en lugar de leer solo el `.env`.
3.  **Frontend**: Crear el formulario para que el Super Admin configure estos datos al crear una empresa.

**Conclusión**: Es totalmente viable y es la forma correcta de manejar un sistema SAAS (Software as a Service) para múltiples clientes.
