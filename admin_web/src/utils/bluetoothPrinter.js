// admin_web/src/utils/bluetoothPrinter.js
// ✅ UTILIDAD PARA IMPRESIÓN BLUETOOTH CON PHOMEMO M110

/**
 * Clase para manejar la impresión Bluetooth en dispositivos Android
 * Compatible con Phomemo M110, M02S, M220, etc.
 */
class BluetoothPrinter {
  constructor() {
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Verifica si el navegador soporta Web Bluetooth API
   */
  isSupported() {
    return 'bluetooth' in navigator;
  }

  /**
   * Solicita conectar a una impresora Bluetooth
   * Filtra dispositivos que contengan "Phomemo", "M110", "M02S", etc.
   */
  async connect() {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth API no soportada en este navegador');
    }

    try {
      console.log('🔵 Solicitando dispositivo Bluetooth...');

      // Solicitar dispositivo
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Phomemo' },
          { namePrefix: 'M110' },
          { namePrefix: 'M02S' },
          { namePrefix: 'M220' }
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Servicio genérico de impresora
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Servicio alternativo
        ]
      });

      console.log('✅ Dispositivo seleccionado:', this.device.name);

      // Conectar al dispositivo
      const server = await this.device.gatt.connect();
      console.log('✅ Conectado al servidor GATT');

      // Obtener el servicio
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      console.log('✅ Servicio obtenido');

      // Obtener la característica de escritura
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      console.log('✅ Característica de escritura obtenida');

      return true;
    } catch (error) {
      console.error('❌ Error conectando a impresora:', error);
      throw error;
    }
  }

  /**
   * Desconecta la impresora
   */
  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
      console.log('🔌 Impresora desconectada');
    }
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Envía datos RAW a la impresora
   * @param {ArrayBuffer|Uint8Array} data - Datos a enviar
   */
  async sendRaw(data) {
    if (!this.characteristic) {
      throw new Error('No hay conexión con la impresora. Conecta primero.');
    }

    try {
      const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);

      // Dividir en chunks de 20 bytes (límite BLE)
      const chunkSize = 20;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
        // Pequeño delay entre chunks
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log(`✅ ${buffer.length} bytes enviados a la impresora`);
      return true;
    } catch (error) {
      console.error('❌ Error enviando datos a la impresora:', error);
      throw error;
    }
  }

  /**
   * Imprime texto simple
   * @param {string} text - Texto a imprimir
   */
  async printText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + '\n\n\n');
    return await this.sendRaw(data);
  }

  /**
   * Comandos ESC/POS para Phomemo
   */
  commands = {
    INIT: new Uint8Array([0x1B, 0x40]),                    // Inicializar impresora
    LINE_FEED: new Uint8Array([0x0A]),                     // Salto de línea
    FEED_PAPER: new Uint8Array([0x1B, 0x64, 0x03]),       // Avanzar papel 3 líneas
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),       // Alinear izquierda
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),     // Alinear centro
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),      // Alinear derecha
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),          // Negrita ON
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),         // Negrita OFF
    FONT_SMALL: new Uint8Array([0x1B, 0x4D, 0x01]),       // Fuente pequeña
    FONT_NORMAL: new Uint8Array([0x1B, 0x4D, 0x00]),      // Fuente normal
    CUT_PAPER: new Uint8Array([0x1D, 0x56, 0x00])         // Cortar papel (si tiene autocutter)
  };

  /**
   * Imprime una etiqueta formateada
   * @param {Object} label - Objeto con datos de la etiqueta
   */
  async printLabel(label) {
    const encoder = new TextEncoder();

    // Construir comandos
    let commands = [
      ...this.commands.INIT,
      ...this.commands.ALIGN_CENTER,
      ...this.commands.BOLD_ON,
      ...encoder.encode('PROLOGIX\n'),
      ...this.commands.BOLD_OFF,
      ...this.commands.LINE_FEED,

      ...this.commands.ALIGN_LEFT,
      ...encoder.encode(`Destinatario: ${label.recipientName}\n`),
      ...encoder.encode(`Item: ${label.itemDesc}\n`),
      ...encoder.encode(`Unidad: ${label.unitIndex + 1}/${label.totalUnits}\n`),
      ...this.commands.LINE_FEED,

      ...this.commands.ALIGN_CENTER,
      ...this.commands.BOLD_ON,
      ...encoder.encode(`${label.uniqueCode}\n`),
      ...this.commands.BOLD_OFF,
      ...encoder.encode(`Tracking: ${label.tracking}\n`),
      ...encoder.encode(`Fecha: ${label.date}\n`),

      ...this.commands.FEED_PAPER,
      ...this.commands.FEED_PAPER
    ];

    await this.sendRaw(new Uint8Array(commands));
  }

  /**
   * Imprime múltiples etiquetas
   * @param {Array} labels - Array de objetos con datos de etiquetas
   */
  async printLabels(labels) {
    for (const label of labels) {
      await this.printLabel(label);
      // Delay entre etiquetas
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Instancia singleton
const bluetoothPrinter = new BluetoothPrinter();

export default bluetoothPrinter;
