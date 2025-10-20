import 'package:flutter/material.dart';
import '../models/ruta.dart';
import '../models/gasto.dart';
import '../services/api_service.dart';

class GastosScreen extends StatefulWidget {
  final Ruta ruta;

  const GastosScreen({super.key, required this.ruta});

  @override
  State<GastosScreen> createState() => _GastosScreenState();
}

class _GastosScreenState extends State<GastosScreen> {
  final ApiService _apiService = ApiService();
  List<Gasto> _gastos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarGastos();
  }

  Future<void> _cargarGastos() async {
    setState(() => _isLoading = true);

    try {
      final gastos = await _apiService.getGastosRuta(widget.ruta.id);
      setState(() {
        _gastos = gastos;
        _isLoading = false;
      });
    } catch (e) {
      print('Error al cargar gastos: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _registrarGasto() async {
    await showDialog(
      context: context,
      builder: (context) => _FormularioGasto(
        rutaId: widget.ruta.id,
        onGastoRegistrado: () {
          _cargarGastos();
        },
      ),
    );
  }

  double _calcularTotal() {
    return _gastos.fold(0, (sum, gasto) => sum + gasto.monto);
  }

  @override
  Widget build(BuildContext context) {
    final total = _calcularTotal();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gastos de Ruta'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarGastos,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: Column(
        children: [
          // Total de gastos
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.blue[50],
            child: Column(
              children: [
                const Text(
                  'Total de Gastos',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
              ],
            ),
          ),

          // Lista de gastos
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _gastos.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.receipt_long_outlined,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No hay gastos registrados',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Presiona el botón + para agregar',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _gastos.length,
                        itemBuilder: (context, index) {
                          final gasto = _gastos[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.blue[50],
                                child: Text(
                                  gasto.getTipoIcono(),
                                  style: const TextStyle(fontSize: 24),
                                ),
                              ),
                              title: Text(
                                gasto.getTipoTexto(),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: gasto.descripcion != null
                                  ? Text(gasto.descripcion!)
                                  : null,
                              trailing: Text(
                                '\$${gasto.monto.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _registrarGasto,
        backgroundColor: Colors.blue,
        child: const Icon(Icons.add),
      ),
    );
  }
}

// Formulario para registrar gasto
class _FormularioGasto extends StatefulWidget {
  final String rutaId;
  final VoidCallback onGastoRegistrado;

  const _FormularioGasto({
    required this.rutaId,
    required this.onGastoRegistrado,
  });

  @override
  State<_FormularioGasto> createState() => _FormularioGastoState();
}

class _FormularioGastoState extends State<_FormularioGasto> {
  final _formKey = GlobalKey<FormState>();
  final _montoController = TextEditingController();
  final _descripcionController = TextEditingController();
  final ApiService _apiService = ApiService();

  String _tipoSeleccionado = 'combustible';
  bool _isLoading = false;

  @override
  void dispose() {
    _montoController.dispose();
    _descripcionController.dispose();
    super.dispose();
  }

  Future<void> _guardarGasto() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final gastoData = {
        'rutaId': widget.rutaId,
        'tipo': _tipoSeleccionado,
        'monto': double.parse(_montoController.text),
        'descripcion': _descripcionController.text.isEmpty
            ? null
            : _descripcionController.text,
      };

      final success = await _apiService.registrarGasto(gastoData);

      if (success && mounted) {
        widget.onGastoRegistrado();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gasto registrado exitosamente'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Registrar Gasto'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Tipo de gasto
              DropdownButtonFormField<String>(
                initialValue: _tipoSeleccionado,
                decoration: const InputDecoration(
                  labelText: 'Tipo de gasto',
                  border: OutlineInputBorder(),
                ),
                items: Gasto.getTiposDisponibles().map((tipo) {
                  return DropdownMenuItem(
                    value: tipo,
                    child: Text(Gasto.getTipoNombre(tipo)),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _tipoSeleccionado = value);
                  }
                },
              ),
              const SizedBox(height: 16),

              // Monto
              TextFormField(
                controller: _montoController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Monto',
                  prefixText: '\$',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Ingresa el monto';
                  }
                  if (double.tryParse(value) == null) {
                    return 'Ingresa un número válido';
                  }
                  if (double.parse(value) <= 0) {
                    return 'El monto debe ser mayor a 0';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Descripción
              TextFormField(
                controller: _descripcionController,
                decoration: const InputDecoration(
                  labelText: 'Descripción (opcional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _guardarGasto,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          child: _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Text('Guardar'),
        ),
      ],
    );
  }
}