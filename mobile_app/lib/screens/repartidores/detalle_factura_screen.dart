// lib/screens/repartidores/detalle_factura_screen.dart
import 'package:flutter/material.dart';
import 'dart:io';
import '../../models/factura.dart';
import '../../services/api_service.dart';
import '../../services/photo_service.dart';

class DetalleFacturaScreen extends StatefulWidget {
  final Factura factura;
  final String rutaId;
  final bool readOnly;

  const DetalleFacturaScreen({
    Key? key,
    required this.factura,
    required this.rutaId,
    this.readOnly = false,
  }) : super(key: key);

  @override
  State<DetalleFacturaScreen> createState() => _DetalleFacturaScreenState();
}

class _DetalleFacturaScreenState extends State<DetalleFacturaScreen> {
  final ApiService _apiService = ApiService();
  final PhotoService _photoService = PhotoService();

  late Factura _factura;
  bool _cargando = false;
  List<String> _fotosLocales = [];
  List<String> _fotosSubidas = [];

  // Controladores para pago
  final TextEditingController _montoPagadoController = TextEditingController();
  final TextEditingController _referenciaPagoController = TextEditingController();
  String _metodoPagoSeleccionado = 'efectivo';

  @override
  void initState() {
    super.initState();
    _factura = widget.factura;
    _fotosSubidas = List.from(_factura.fotosEntrega);
  }

  @override
  void dispose() {
    _montoPagadoController.dispose();
    _referenciaPagoController.dispose();
    super.dispose();
  }

  // ==================== ACCIONES PRINCIPALES ====================

  Future<void> _toggleItemEntregado(int itemIndex) async {
    final item = _factura.items[itemIndex];

    if (item.entregado) {
      _mostrarSnackBar('Este item ya fue marcado como entregado', esError: true);
      return;
    }

    setState(() => _cargando = true);

    try {
      final success = await _apiService.entregarItem(_factura.id, itemIndex);

      if (success) {
        // Actualizar estado local
        setState(() {
          final items = List<FacturaItem>.from(_factura.items);
          items[itemIndex] = FacturaItem(
            index: item.index,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            entregado: true,
            danado: item.danado,
            descripcionDano: item.descripcionDano,
          );

          _factura = Factura(
            id: _factura.id,
            codigoTracking: _factura.codigoTracking,
            estado: _factura.estado,
            rutaId: _factura.rutaId,
            destinatario: _factura.destinatario,
            items: items,
            itemsTotal: _factura.itemsTotal,
            itemsEntregados: _factura.itemsEntregados + 1,
            pago: _factura.pago,
            fotosEntrega: _factura.fotosEntrega,
            observaciones: _factura.observaciones,
            fechaEntrega: _factura.fechaEntrega,
            ordenCarga: _factura.ordenCarga,
            ordenEntrega: _factura.ordenEntrega,
          );
        });

        _mostrarSnackBar('Item marcado como entregado');
      } else {
        _mostrarSnackBar('Error al marcar item', esError: true);
      }
    } catch (e) {
      _mostrarSnackBar('Error: $e', esError: true);
    } finally {
      setState(() => _cargando = false);
    }
  }

  Future<void> _tomarFotoEvidencia() async {
    try {
      final foto = await _photoService.showImageSourceDialog(context);

      if (foto != null) {
        setState(() {
          _fotosLocales.add(foto.path);
        });

        _mostrarSnackBar('Foto agregada. Recuerda subirlas antes de finalizar.');
      }
    } catch (e) {
      _mostrarSnackBar('Error al tomar foto: $e', esError: true);
    }
  }

  Future<void> _subirFotosEvidencia() async {
    if (_fotosLocales.isEmpty) {
      _mostrarSnackBar('No hay fotos pendientes por subir', esError: true);
      return;
    }

    setState(() => _cargando = true);

    try {
      // Subir fotos a Firebase Storage
      final urls = await _photoService.uploadMultiplePhotos(
        files: _fotosLocales.map((path) => File(path)).toList(),
        folder: 'evidencias/${_factura.id}',
      );

      if (urls.isNotEmpty) {
        // Enviar URLs al backend
        final success = await _apiService.subirFotosEvidencia(_factura.id, urls);

        if (success) {
          setState(() {
            _fotosSubidas.addAll(urls);
            _fotosLocales.clear();
          });

          _mostrarSnackBar('${urls.length} foto(s) subida(s) correctamente');
        } else {
          _mostrarSnackBar('Error al registrar fotos en el servidor', esError: true);
        }
      }
    } catch (e) {
      _mostrarSnackBar('Error al subir fotos: $e', esError: true);
    } finally {
      setState(() => _cargando = false);
    }
  }

  Future<void> _mostrarDialogoPago() async {
    if (_factura.pago == null || _factura.pago!.total <= 0) {
      _mostrarSnackBar('Esta factura no requiere pago contraentrega', esError: true);
      return;
    }

    if (_factura.pago!.estado == 'pagada') {
      _mostrarSnackBar('El pago ya fue registrado', esError: true);
      return;
    }

    _montoPagadoController.text = _factura.pago!.total.toStringAsFixed(2);

    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.attach_money, color: Colors.green),
              SizedBox(width: 8),
              Text('Confirmar Pago'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Monto a cobrar: \$${_factura.pago!.total.toStringAsFixed(2)} USD',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                SizedBox(height: 16),
                TextField(
                  controller: _montoPagadoController,
                  keyboardType: TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Monto Pagado (USD)',
                    border: OutlineInputBorder(),
                    prefixText: '\$ ',
                  ),
                ),
                SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _metodoPagoSeleccionado,
                  decoration: InputDecoration(
                    labelText: 'Método de Pago',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    DropdownMenuItem(value: 'efectivo', child: Text('Efectivo')),
                    DropdownMenuItem(value: 'transferencia', child: Text('Transferencia')),
                    DropdownMenuItem(value: 'tarjeta', child: Text('Tarjeta')),
                  ],
                  onChanged: (value) {
                    setDialogState(() {
                      _metodoPagoSeleccionado = value!;
                    });
                  },
                ),
                if (_metodoPagoSeleccionado != 'efectivo') ...[
                  SizedBox(height: 16),
                  TextField(
                    controller: _referenciaPagoController,
                    decoration: InputDecoration(
                      labelText: 'Referencia/Número',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('Cancelar'),
            ),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context, true),
              icon: Icon(Icons.check),
              label: Text('Confirmar Pago'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            ),
          ],
        ),
      ),
    );

    if (confirmar == true) {
      await _confirmarPago();
    }
  }

  Future<void> _confirmarPago() async {
    final montoPagado = double.tryParse(_montoPagadoController.text);

    if (montoPagado == null || montoPagado <= 0) {
      _mostrarSnackBar('Ingresa un monto válido', esError: true);
      return;
    }

    setState(() => _cargando = true);

    try {
      final success = await _apiService.confirmarPago(
        facturaId: _factura.id,
        montoPagado: montoPagado,
        metodoPago: _metodoPagoSeleccionado,
        referenciaPago: _referenciaPagoController.text.isNotEmpty
            ? _referenciaPagoController.text
            : null,
      );

      if (success) {
        setState(() {
          _factura = Factura(
            id: _factura.id,
            codigoTracking: _factura.codigoTracking,
            estado: _factura.estado,
            rutaId: _factura.rutaId,
            destinatario: _factura.destinatario,
            items: _factura.items,
            itemsTotal: _factura.itemsTotal,
            itemsEntregados: _factura.itemsEntregados,
            pago: FacturaPago(
              total: _factura.pago!.total,
              estado: 'pagada',
              montoPagado: montoPagado,
              metodoPago: _metodoPagoSeleccionado,
              referenciaPago: _referenciaPagoController.text,
            ),
            fotosEntrega: _factura.fotosEntrega,
            observaciones: _factura.observaciones,
            fechaEntrega: _factura.fechaEntrega,
            ordenCarga: _factura.ordenCarga,
            ordenEntrega: _factura.ordenEntrega,
          );
        });

        _mostrarSnackBar('Pago registrado correctamente');
      } else {
        _mostrarSnackBar('Error al registrar pago', esError: true);
      }
    } catch (e) {
      _mostrarSnackBar('Error: $e', esError: true);
    } finally {
      setState(() => _cargando = false);
    }
  }

  Future<void> _mostrarDialogoItemDanado(int itemIndex) async {
    final item = _factura.items[itemIndex];
    final TextEditingController descripcionController = TextEditingController();
    String? fotoUrl;

    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.warning, color: Colors.orange),
              SizedBox(width: 8),
              Text('Reportar Daño'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Item: ${item.descripcion}',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 16),
                TextField(
                  controller: descripcionController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Descripción del daño',
                    border: OutlineInputBorder(),
                    hintText: 'Describe el problema...',
                  ),
                ),
                SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () async {
                    final foto = await _photoService.showImageSourceDialog(context);
                    if (foto != null) {
                      final url = await _photoService.uploadPhoto(
                        file: foto,
                        folder: 'danos/${_factura.id}',
                      );
                      setDialogState(() {
                        fotoUrl = url;
                      });
                    }
                  },
                  icon: Icon(Icons.camera_alt),
                  label: Text(fotoUrl == null ? 'Tomar Foto' : 'Foto Capturada'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: fotoUrl == null ? Colors.blue : Colors.green,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('Reportar'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            ),
          ],
        ),
      ),
    );

    if (confirmar == true && descripcionController.text.isNotEmpty) {
      await _reportarItemDanado(itemIndex, descripcionController.text, fotoUrl);
    }
  }

  Future<void> _reportarItemDanado(int itemIndex, String descripcion, String? fotoUrl) async {
    setState(() => _cargando = true);

    try {
      final success = await _apiService.reportarItemDanado(
        facturaId: _factura.id,
        itemIndex: itemIndex,
        descripcion: descripcion,
        fotosUrls: fotoUrl != null ? [fotoUrl] : [],
      );

      if (success) {
        _mostrarSnackBar('Daño reportado correctamente');
        Navigator.pop(context, true); // Cerrar y actualizar
      } else {
        _mostrarSnackBar('Error al reportar daño', esError: true);
      }
    } catch (e) {
      _mostrarSnackBar('Error: $e', esError: true);
    } finally {
      setState(() => _cargando = false);
    }
  }

  Future<void> _mostrarDialogoNoEntrega() async {
    final TextEditingController motivoController = TextEditingController();
    String? fotoUrl;

    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.cancel, color: Colors.red),
              SizedBox(width: 8),
              Text('Reportar No Entrega'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Indica el motivo por el cual no se pudo entregar esta factura:',
                ),
                SizedBox(height: 16),
                TextField(
                  controller: motivoController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    labelText: 'Motivo',
                    border: OutlineInputBorder(),
                    hintText: 'Cliente ausente, dirección incorrecta, rechazó paquete...',
                  ),
                ),
                SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () async {
                    final foto = await _photoService.showImageSourceDialog(context);
                    if (foto != null) {
                      final url = await _photoService.uploadPhoto(
                        file: foto,
                        folder: 'no_entregas/${_factura.id}',
                      );
                      setDialogState(() {
                        fotoUrl = url;
                      });
                    }
                  },
                  icon: Icon(Icons.camera_alt),
                  label: Text(fotoUrl == null ? 'Foto (Opcional)' : 'Foto Capturada'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: fotoUrl == null ? Colors.grey : Colors.green,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('Confirmar No Entrega'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            ),
          ],
        ),
      ),
    );

    if (confirmar == true && motivoController.text.isNotEmpty) {
      await _reportarNoEntrega(motivoController.text, fotoUrl);
    }
  }

  Future<void> _reportarNoEntrega(String motivo, String? fotoUrl) async {
    setState(() => _cargando = true);

    try {
      final success = await _apiService.reportarNoEntrega(
        facturaId: _factura.id,
        motivo: motivo,
        descripcion: motivo, // Usamos el motivo como descripción
        fotosUrls: fotoUrl != null ? [fotoUrl] : [],
      );

      if (success) {
        _mostrarSnackBar('No entrega reportada');
        Navigator.pop(context, true); // Cerrar y actualizar
      } else {
        _mostrarSnackBar('Error al reportar no entrega', esError: true);
      }
    } catch (e) {
      _mostrarSnackBar('Error: $e', esError: true);
    } finally {
      setState(() => _cargando = false);
    }
  }

  Future<void> _confirmarEntregaCompleta() async {
    if (!_factura.todosItemsEntregados()) {
      _mostrarSnackBar('Debes entregar todos los items primero', esError: true);
      return;
    }

    if (_factura.necesitaPago()) {
      _mostrarSnackBar('Debes confirmar el pago primero', esError: true);
      return;
    }

    if (_fotosLocales.isNotEmpty) {
      _mostrarSnackBar('Tienes fotos sin subir. Súbelas primero.', esError: true);
      return;
    }

    if (_fotosSubidas.isEmpty) {
      final confirmar = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.warning, color: Colors.orange),
              SizedBox(width: 8),
              Text('Sin Fotos'),
            ],
          ),
          content: Text('No has subido fotos de evidencia. ¿Deseas continuar sin fotos?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('Sí, Continuar'),
            ),
          ],
        ),
      );

      if (confirmar != true) return;
    }

    final nombreReceptorController = TextEditingController();
    
    final confirmarFinal = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Confirmar Entrega'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('¿Confirmar que esta factura fue entregada completamente?'),
            SizedBox(height: 16),
            TextField(
              controller: nombreReceptorController,
              decoration: InputDecoration(
                labelText: 'Nombre de quien recibe',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 16),
            Text('Items entregados: ${_factura.itemsEntregados}/${_factura.itemsTotal}'),
            Text('Fotos: ${_fotosSubidas.length}'),
            if (_factura.pago != null)
              Text('Pago: ${_factura.pago!.estado == "pagada" ? "Confirmado" : "Pendiente"}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancelar'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              if (nombreReceptorController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Debes ingresar el nombre de quien recibe')),
                );
                return;
              }
              Navigator.pop(context, true);
            },
            icon: Icon(Icons.check),
            label: Text('Confirmar Entrega'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
          ),
        ],
      ),
    );

    if (confirmarFinal == true) {
      await _marcarFacturaEntregada(nombreReceptorController.text);
    }
  }

  Future<void> _marcarFacturaEntregada(String nombreReceptor) async {
    setState(() => _cargando = true);

    try {
      final success = await _apiService.marcarFacturaEntregada(
        facturaId: _factura.id,
        nombreReceptor: nombreReceptor,
      );

      if (success) {
        _mostrarSnackBar('Factura marcada como entregada');
        Navigator.pop(context, true); // Cerrar y actualizar
      } else {
        _mostrarSnackBar('Error al marcar factura entregada', esError: true);
      }
    } catch (e) {
      _mostrarSnackBar('Error: $e', esError: true);
    } finally {
      setState(() => _cargando = false);
    }
  }

  // ==================== UI HELPERS ====================

  void _mostrarSnackBar(String mensaje, {bool esError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(mensaje),
        backgroundColor: esError ? Colors.red : Colors.green,
        duration: Duration(seconds: 3),
      ),
    );
  }

  Color _getEstadoColor() {
    switch (_factura.getEstadoColor()) {
      case 'green':
        return Colors.green;
      case 'blue':
        return Colors.blue;
      case 'red':
        return Colors.red;
      case 'indigo':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }

  // ==================== UI BUILD ====================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Factura ${_factura.numeroFactura}'),
        backgroundColor: Colors.indigo,
      ),
      body: _cargando
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeaderCard(),
                  SizedBox(height: 16),
                  _buildDestinatarioCard(),
                  SizedBox(height: 16),
                  _buildItemsList(),
                  SizedBox(height: 16),
                  _buildFotosSection(),
                  if (_factura.pago != null && _factura.pago!.total > 0) ...[
                    SizedBox(height: 16),
                    _buildPagoCard(),
                  ],
                  SizedBox(height: 24),
                  _buildBotonesAccion(),
                ],
              ),
            ),
    );
  }

  Widget _buildHeaderCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Código: ${_factura.codigoTracking}',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Chip(
                  label: Text(
                    _factura.getEstadoTexto(),
                    style: TextStyle(color: Colors.white),
                  ),
                  backgroundColor: _getEstadoColor(),
                ),
              ],
            ),
            if (_factura.ordenEntrega != null) ...[
              SizedBox(height: 8),
              Text(
                'Orden de Entrega: #${_factura.ordenEntrega}',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDestinatarioCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.person, color: Colors.indigo),
                SizedBox(width: 8),
                Text(
                  'Información del Cliente',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Divider(),
            _buildInfoRow(Icons.person, 'Nombre', _factura.destinatario.nombre),
            _buildInfoRow(Icons.location_on, 'Dirección', _factura.destinatario.direccion),
            if (_factura.destinatario.telefono != null)
              _buildInfoRow(Icons.phone, 'Teléfono', _factura.destinatario.telefono!),
            if (_factura.destinatario.sector != null)
              _buildInfoRow(Icons.map, 'Sector', _factura.destinatario.sector!),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[700]),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.inventory_2, color: Colors.indigo),
                    SizedBox(width: 8),
                    Text(
                      'Items',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Text(
                  '${_factura.itemsEntregados}/${_factura.itemsTotal}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _factura.todosItemsEntregados() ? Colors.green : Colors.orange,
                  ),
                ),
              ],
            ),
            if (_factura.itemsTotal > 0) ...[
              SizedBox(height: 8),
              LinearProgressIndicator(
                value: _factura.getProgreso() / 100,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(
                  _factura.todosItemsEntregados() ? Colors.green : Colors.blue,
                ),
              ),
            ],
            Divider(),
            if (_factura.items.isEmpty)
              Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No hay items individuales registrados',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
                itemCount: _factura.items.length,
                itemBuilder: (context, index) {
                  final item = _factura.items[index];
                  return _buildItemCard(item, index);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildItemCard(FacturaItem item, int index) {
    return Card(
      margin: EdgeInsets.symmetric(vertical: 4),
      color: item.entregado ? Colors.green[50] : Colors.white,
      child: ListTile(
        leading: Checkbox(
          value: item.entregado,
          onChanged: (item.entregado || widget.readOnly)
              ? null
              : (value) {
                  if (value == true) {
                    _toggleItemEntregado(index);
                  }
                },
        ),
        title: Text(
          item.descripcion,
          style: TextStyle(
            decoration: item.entregado ? TextDecoration.lineThrough : null,
            fontWeight: item.entregado ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cantidad: ${item.cantidad}'),
            if (item.danado == true)
              Text(
                'DAÑADO: ${item.descripcionDano ?? "Sin descripción"}',
                style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
              ),
          ],
        ),
        trailing: !item.entregado && item.danado != true && !widget.readOnly
            ? PopupMenuButton<String>(
                icon: Icon(Icons.more_vert),
                onSelected: (value) {
                  if (value == 'danado') {
                    _mostrarDialogoItemDanado(index);
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'danado',
                    child: Row(
                      children: [
                        Icon(Icons.warning, color: Colors.orange),
                        SizedBox(width: 8),
                        Text('Reportar Daño'),
                      ],
                    ),
                  ),
                ],
              )
            : null,
      ),
    );
  }

  Widget _buildFotosSection() {
    final totalFotos = _fotosSubidas.length + _fotosLocales.length;

    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.photo_camera, color: Colors.indigo),
                    SizedBox(width: 8),
                    Text(
                      'Fotos de Evidencia',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Text(
                  '$totalFotos foto${totalFotos != 1 ? "s" : ""}',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
            SizedBox(height: 12),
            if (!widget.readOnly)
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _tomarFotoEvidencia,
                      icon: Icon(Icons.camera_alt),
                      label: Text('Tomar Foto'),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                    ),
                  ),
                  if (_fotosLocales.isNotEmpty) ...[
                    SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _subirFotosEvidencia,
                        icon: Icon(Icons.cloud_upload),
                        label: Text('Subir (${_fotosLocales.length})'),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                      ),
                    ),
                  ],
                ],
              ),
            if (totalFotos > 0) ...[
              SizedBox(height: 12),
              SizedBox(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: totalFotos,
                  itemBuilder: (context, index) {
                    final esLocal = index < _fotosLocales.length;
                    final path = esLocal
                        ? _fotosLocales[index]
                        : _fotosSubidas[index - _fotosLocales.length];

                    return Container(
                      margin: EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: esLocal
                                ? Image.file(
                                    File(path),
                                    width: 100,
                                    height: 100,
                                    fit: BoxFit.cover,
                                  )
                                : Image.network(
                                    path,
                                    width: 100,
                                    height: 100,
                                    fit: BoxFit.cover,
                                  ),
                          ),
                          if (esLocal)
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Container(
                                padding: EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: Colors.orange,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Pendiente',
                                  style: TextStyle(color: Colors.white, fontSize: 10),
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPagoCard() {
    final pago = _factura.pago!;

    return Card(
      elevation: 2,
      color: pago.estado == 'pagada' ? Colors.green[50] : Colors.orange[50],
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      pago.estado == 'pagada' ? Icons.check_circle : Icons.attach_money,
                      color: pago.estado == 'pagada' ? Colors.green : Colors.orange,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Pago Contraentrega',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Chip(
                  label: Text(
                    pago.estado == 'pagada' ? 'PAGADA' : 'PENDIENTE',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  backgroundColor: pago.estado == 'pagada' ? Colors.green : Colors.orange,
                ),
              ],
            ),
            Divider(),
            Text(
              'Monto: \$${pago.total.toStringAsFixed(2)} USD',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            if (pago.estado == 'pagada') ...[
              SizedBox(height: 8),
              Text('Pagado: \$${pago.montoPagado?.toStringAsFixed(2) ?? "0.00"} USD'),
              Text('Método: ${pago.metodoPago ?? "N/A"}'),
              if (pago.referenciaPago != null)
                Text('Referencia: ${pago.referenciaPago}'),
            ],
            if (pago.estado != 'pagada' && !widget.readOnly) ...[
              SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _mostrarDialogoPago,
                  icon: Icon(Icons.attach_money),
                  label: Text('Confirmar Pago'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBotonesAccion() {
    if (widget.readOnly) return SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_factura.isEntregada()) ...[
          ElevatedButton.icon(
            onPressed: _factura.puedeMarcarEntregada() ? _confirmarEntregaCompleta : null,
            icon: Icon(Icons.check_circle),
            label: Text('MARCAR COMO ENTREGADA'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              padding: EdgeInsets.symmetric(vertical: 16),
              textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _mostrarDialogoNoEntrega,
            icon: Icon(Icons.cancel, color: Colors.red),
            label: Text(
              'Reportar No Entrega',
              style: TextStyle(color: Colors.red),
            ),
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.symmetric(vertical: 16),
              side: BorderSide(color: Colors.red),
            ),
          ),
        ] else
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 32),
                SizedBox(width: 12),
                Text(
                  'FACTURA ENTREGADA',
                  style: TextStyle(
                    color: Colors.green,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
