// lib/screens/cargadores/checklist_carga_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../models/ruta.dart';
import '../../models/factura.dart';

class ChecklistCargaScreen extends StatefulWidget {
  final String rutaId;

  const ChecklistCargaScreen({Key? key, required this.rutaId}) : super(key: key);

  @override
  State<ChecklistCargaScreen> createState() => _ChecklistCargaScreenState();
}

class _ChecklistCargaScreenState extends State<ChecklistCargaScreen> {
  final ApiService _apiService = ApiService();

  Ruta? _ruta;
  bool _isLoading = true;
  String _vistaSeleccionada = 'lifo'; // 'lifo' o 'facturas'

  @override
  void initState() {
    super.initState();
    _cargarRuta();
  }

  Future<void> _cargarRuta() async {
    setState(() => _isLoading = true);

    try {
      final ruta = await _apiService.getRutaDetalle(widget.rutaId);

      if (ruta != null) {
        setState(() {
          _ruta = ruta;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error al cargar ruta: $e');
      setState(() => _isLoading = false);
      _mostrarSnackBar('Error al cargar ruta', esError: true);
    }
  }

  Future<void> _marcarItemCargado(String facturaId, int itemIndex) async {
    setState(() => _isLoading = true);

    try {
      final success = await _apiService.confirmarCargaItem(
        rutaId: widget.rutaId,
        facturaId: facturaId,
        itemIndex: itemIndex,
      );

      if (success) {
        _mostrarSnackBar('Item marcado como cargado');
        await _cargarRuta();
      } else {
        _mostrarSnackBar('Error al marcar item', esError: true);
        setState(() => _isLoading = false);
      }
    } catch (e) {
      print('Error: $e');
      _mostrarSnackBar('Error: $e', esError: true);
      setState(() => _isLoading = false);
    }
  }

  void _mostrarSnackBar(String mensaje, {bool esError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(mensaje),
        backgroundColor: esError ? Colors.red : Colors.green,
        duration: Duration(seconds: 2),
      ),
    );
  }

  // Obtener items en orden LIFO
  List<Map<String, dynamic>> _getItemsLIFO() {
    if (_ruta == null) return [];

    List<Map<String, dynamic>> todosLosItems = [];

    // Recorrer facturas ordenadas por ordenCarga (descendente = LIFO)
    final facturasOrdenadas = List<Factura>.from(_ruta!.facturas);
    facturasOrdenadas.sort((a, b) {
      final ordenA = a.ordenCarga ?? 0;
      final ordenB = b.ordenCarga ?? 0;
      return ordenB.compareTo(ordenA); // Descendente para LIFO
    });

    for (var factura in facturasOrdenadas) {
      for (var item in factura.items) {
        todosLosItems.add({
          'factura': factura,
          'item': item,
          'ordenCarga': factura.ordenCarga ?? 0,
        });
      }
    }

    return todosLosItems;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Checklist de Carga'),
        backgroundColor: Colors.teal,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _cargarRuta,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _ruta == null
              ? Center(child: Text('No se pudo cargar la ruta'))
              : Column(
                  children: [
                    _buildHeader(),
                    _buildVistaSelector(),
                    Expanded(
                      child: _vistaSeleccionada == 'lifo'
                          ? _buildVistaLIFO()
                          : _buildVistaFacturas(),
                    ),
                  ],
                ),
    );
  }

  Widget _buildHeader() {
    final totalItems = _ruta!.facturas.fold<int>(
      0,
      (sum, factura) => sum + factura.itemsTotal,
    );
    final itemsCargados = _ruta!.facturas.fold<int>(
      0,
      (sum, factura) => sum + factura.itemsEntregados,
    );
    final progreso = totalItems > 0 ? (itemsCargados / totalItems) * 100 : 0.0;

    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.teal, Colors.teal[700]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _ruta!.nombre,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildHeaderStat('Total', '$totalItems', Icons.inventory_2),
              Container(width: 1, height: 40, color: Colors.white30),
              _buildHeaderStat('Cargados', '$itemsCargados', Icons.check_circle),
              Container(width: 1, height: 40, color: Colors.white30),
              _buildHeaderStat('Pendientes', '${totalItems - itemsCargados}', Icons.pending),
            ],
          ),
          SizedBox(height: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Progreso',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  Text(
                    '${progreso.toStringAsFixed(1)}%',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: progreso / 100,
                  minHeight: 10,
                  backgroundColor: Colors.white30,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    progreso >= 100 ? Colors.greenAccent : Colors.amber,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderStat(String label, String valor, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 24),
        SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.white70),
        ),
        SizedBox(height: 2),
        Text(
          valor,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildVistaSelector() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _vistaSeleccionada = 'lifo';
                });
              },
              icon: Icon(Icons.layers),
              label: Text('Vista LIFO'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _vistaSeleccionada == 'lifo'
                    ? Colors.teal
                    : Colors.grey[300],
                foregroundColor: _vistaSeleccionada == 'lifo'
                    ? Colors.white
                    : Colors.black,
              ),
            ),
          ),
          SizedBox(width: 8),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _vistaSeleccionada = 'facturas';
                });
              },
              icon: Icon(Icons.description),
              label: Text('Por Factura'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _vistaSeleccionada == 'facturas'
                    ? Colors.teal
                    : Colors.grey[300],
                foregroundColor: _vistaSeleccionada == 'facturas'
                    ? Colors.white
                    : Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVistaLIFO() {
    final items = _getItemsLIFO();

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
            SizedBox(height: 16),
            Text(
              'No hay items para cargar',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final itemData = items[index];
        final factura = itemData['factura'] as Factura;
        final item = itemData['item'] as FacturaItem;
        final ordenCarga = itemData['ordenCarga'] as int;

        // Invertir el orden visual para LIFO (último en cargar, primero en mostrar)
        final posicionLIFO = items.length - index;

        return _buildItemCardLIFO(
          factura,
          item,
          ordenCarga,
          posicionLIFO,
        );
      },
    );
  }

  Widget _buildItemCardLIFO(
    Factura factura,
    FacturaItem item,
    int ordenCarga,
    int posicionLIFO,
  ) {
    final cargado = item.entregado; // Reutilizamos este campo para "cargado"

    return Card(
      margin: EdgeInsets.only(bottom: 12),
      color: cargado ? Colors.green[50] : Colors.white,
      elevation: cargado ? 1 : 2,
      child: ListTile(
        contentPadding: EdgeInsets.all(12),
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: cargado ? Colors.green : Colors.teal,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '#$posicionLIFO',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  'LIFO',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        ),
        title: Text(
          item.descripcion,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            decoration: cargado ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 4),
            Text('Factura: ${factura.numeroFactura}'),
            Text('Cliente: ${factura.destinatario.nombre}'),
            Text('Cantidad: ${item.cantidad}'),
            if (ordenCarga > 0)
              Container(
                margin: EdgeInsets.only(top: 4),
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.blue[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Orden de carga: $ordenCarga',
                  style: TextStyle(fontSize: 11, color: Colors.blue[900]),
                ),
              ),
          ],
        ),
        trailing: cargado
            ? Icon(Icons.check_circle, color: Colors.green, size: 32)
            : ElevatedButton(
                onPressed: () => _marcarItemCargado(factura.id, item.index),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                ),
                child: Text('Cargar'),
              ),
      ),
    );
  }

  Widget _buildVistaFacturas() {
    final facturasOrdenadas = List<Factura>.from(_ruta!.facturas);
    facturasOrdenadas.sort((a, b) {
      final ordenA = a.ordenCarga ?? 0;
      final ordenB = b.ordenCarga ?? 0;
      return ordenB.compareTo(ordenA);
    });

    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: facturasOrdenadas.length,
      itemBuilder: (context, index) {
        final factura = facturasOrdenadas[index];
        return _buildFacturaCard(factura);
      },
    );
  }

  Widget _buildFacturaCard(Factura factura) {
    final progreso = factura.getProgreso();
    final todosItemsCargados = factura.todosItemsEntregados();

    return Card(
      margin: EdgeInsets.only(bottom: 16),
      color: todosItemsCargados ? Colors.green[50] : Colors.white,
      child: ExpansionTile(
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: todosItemsCargados ? Colors.green : Colors.teal,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              '#${factura.ordenCarga ?? 0}',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
        ),
        title: Text(
          factura.numeroFactura,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cliente: ${factura.destinatario.nombre}'),
            SizedBox(height: 4),
            LinearProgressIndicator(
              value: progreso / 100,
              backgroundColor: Colors.grey[300],
              valueColor: AlwaysStoppedAnimation<Color>(
                todosItemsCargados ? Colors.green : Colors.teal,
              ),
            ),
            SizedBox(height: 2),
            Text(
              '${factura.itemsEntregados}/${factura.itemsTotal} items',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
        trailing: todosItemsCargados
            ? Icon(Icons.check_circle, color: Colors.green, size: 32)
            : null,
        children: factura.items.map((item) {
          return ListTile(
            leading: Checkbox(
              value: item.entregado,
              onChanged: item.entregado
                  ? null
                  : (value) {
                      if (value == true) {
                        _marcarItemCargado(factura.id, item.index);
                      }
                    },
            ),
            title: Text(
              item.descripcion,
              style: TextStyle(
                decoration: item.entregado ? TextDecoration.lineThrough : null,
              ),
            ),
            subtitle: Text('Cantidad: ${item.cantidad}'),
          );
        }).toList(),
      ),
    );
  }
}
