// lib/screens/secretaria/secretaria_operaciones_screen.dart
/// 💰 PANTALLA DE OPERACIONES (PAGOS Y TICKETS)
/// Gestión de pagos y tickets de soporte
library;


import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/secretaria_service.dart';
import '../../models/secretaria_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class SecretariaOperacionesScreen extends StatefulWidget {
  const SecretariaOperacionesScreen({super.key});

  @override
  State<SecretariaOperacionesScreen> createState() => _SecretariaOperacionesScreenState();
}

class _SecretariaOperacionesScreenState extends State<SecretariaOperacionesScreen>
    with SingleTickerProviderStateMixin {
  final SecretariaService _secretariaService = SecretariaService();
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Operaciones'),
            automaticallyImplyLeading: false,
            bottom: TabBar(
              controller: _tabController,
              tabs: const [
                Tab(icon: Icon(Icons.payment), text: 'Pagos'),
                Tab(icon: Icon(Icons.support_agent), text: 'Tickets'),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildPagosTab(helper),
              _buildTicketsTab(helper),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () {
              if (_tabController.index == 0) {
                _registrarPago();
              } else {
                _crearTicket();
              }
            },
            icon: const Icon(Icons.add),
            label: Text(_tabController.index == 0 ? 'Registrar Pago' : 'Nuevo Ticket'),
            backgroundColor: AppTheme.secretariaColor,
          ),
        );
      },
    );
  }

  // ==================== TAB DE PAGOS ====================
  Widget _buildPagosTab(ResponsiveHelper helper) {
    return StreamBuilder<List<Pago>>(
      stream: _secretariaService.getPagosStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final pagos = snapshot.data ?? [];

        if (pagos.isEmpty) {
          return const Center(child: Text('No hay pagos registrados'));
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: pagos.length,
          itemBuilder: (context, index) => _buildPagoCard(pagos[index]),
        );
      },
    );
  }

  Widget _buildPagoCard(Pago pago) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getPagoColor(pago.estado).withOpacity(0.2),
          child: Icon(Icons.payment, color: _getPagoColor(pago.estado)),
        ),
        title: Text(pago.clienteNombre, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Monto: \$${pago.monto.toStringAsFixed(2)}'),
            Text('Método: ${pago.metodoPago}'),
            Text(_formatFecha(pago.fechaPago)),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _getPagoColor(pago.estado).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(pago.estado, style: TextStyle(
            fontSize: 11, color: _getPagoColor(pago.estado))),
        ),
        onTap: () => _verDetallePago(pago),
      ),
    );
  }

  // ==================== TAB DE TICKETS ====================
  Widget _buildTicketsTab(ResponsiveHelper helper) {
    return StreamBuilder<List<TicketSoporte>>(
      stream: _secretariaService.getTicketsStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final tickets = snapshot.data ?? [];

        if (tickets.isEmpty) {
          return const Center(child: Text('No hay tickets'));
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: tickets.length,
          itemBuilder: (context, index) => _buildTicketCard(tickets[index]),
        );
      },
    );
  }

  Widget _buildTicketCard(TicketSoporte ticket) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getTicketColor(ticket.estado).withOpacity(0.2),
          child: Icon(Icons.support_agent, color: _getTicketColor(ticket.estado)),
        ),
        title: Text(ticket.asunto, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ticket.clienteNombre),
            Text(ticket.categoria),
            Text(_formatFecha(ticket.fechaCreacion)),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _getTicketColor(ticket.estado).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(ticket.estado, style: TextStyle(
            fontSize: 11, color: _getTicketColor(ticket.estado))),
        ),
        onTap: () => _verDetalleTicket(ticket),
      ),
    );
  }

  // ==================== ACCIONES DE PAGOS ====================
  Future<void> _registrarPago() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final empleadoNombre = authService.getEmpleadoNombre() ?? 'Secretaria';

    final formKey = GlobalKey<FormState>();
    final montoController = TextEditingController();
    String metodoPago = 'efectivo';
    String clienteId = '';
    String clienteNombre = '';

    final resultado = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Registrar Pago'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    decoration: const InputDecoration(labelText: 'Cliente'),
                    onTap: () async {
                      // Implementar selector de cliente
                      clienteId = 'cliente_id';
                      clienteNombre = 'Cliente Ejemplo';
                    },
                    readOnly: true,
                  ),
                  TextFormField(
                    controller: montoController,
                    decoration: const InputDecoration(labelText: 'Monto *'),
                    keyboardType: TextInputType.number,
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: metodoPago,
                    decoration: const InputDecoration(labelText: 'Método de Pago'),
                    items: const [
                      DropdownMenuItem(value: 'efectivo', child: Text('Efectivo')),
                      DropdownMenuItem(value: 'transferencia', child: Text('Transferencia')),
                      DropdownMenuItem(value: 'tarjeta', child: Text('Tarjeta')),
                      DropdownMenuItem(value: 'zelle', child: Text('Zelle')),
                    ],
                    onChanged: (value) => setState(() => metodoPago = value!),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState!.validate()) {
                  Navigator.pop(context, true);
                }
              },
              child: const Text('Registrar'),
            ),
          ],
        ),
      ),
    );

    if (resultado == true && clienteId.isNotEmpty) {
      final pago = Pago(
        id: '',
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        monto: double.parse(montoController.text),
        metodoPago: metodoPago,
        fechaPago: DateTime.now(),
        estado: 'confirmado',
        registradoPor: empleadoNombre,
      );

      await _secretariaService.registrarPago(pago, clienteId: '', monto: 0, metodoPago: '', concepto: '', registradoPor: '');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Pago registrado'),
            backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  void _verDetallePago(Pago pago) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Detalle de Pago'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoRow('Cliente:', pago.clienteNombre),
            _buildInfoRow('Monto:', '\$${pago.monto.toStringAsFixed(2)}'),
            _buildInfoRow('Método:', pago.metodoPago),
            _buildInfoRow('Fecha:', _formatFecha(pago.fechaPago)),
            _buildInfoRow('Estado:', pago.estado),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  // ==================== ACCIONES DE TICKETS ====================
  Future<void> _crearTicket() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final empleadoNombre = authService.getEmpleadoNombre() ?? 'Secretaria';

    final formKey = GlobalKey<FormState>();
    final asuntoController = TextEditingController();
    final descripcionController = TextEditingController();
    String categoria = 'consulta';
    String prioridad = 'media';

    final resultado = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Nuevo Ticket'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: asuntoController,
                    decoration: const InputDecoration(labelText: 'Asunto *'),
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  TextFormField(
                    controller: descripcionController,
                    decoration: const InputDecoration(labelText: 'Descripción *'),
                    maxLines: 3,
                    validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: categoria,
                    decoration: const InputDecoration(labelText: 'Categoría'),
                    items: const [
                      DropdownMenuItem(value: 'consulta', child: Text('Consulta')),
                      DropdownMenuItem(value: 'reclamo', child: Text('Reclamo')),
                      DropdownMenuItem(value: 'seguimiento', child: Text('Seguimiento')),
                    ],
                    onChanged: (value) => setState(() => categoria = value!),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState!.validate()) {
                  Navigator.pop(context, true);
                }
              },
              child: const Text('Crear'),
            ),
          ],
        ),
      ),
    );

    if (resultado == true) {
      final ticket = TicketSoporte(
        id: '',
        clienteId: 'cliente_id',
        clienteNombre: 'Cliente Ejemplo',
        asunto: asuntoController.text,
        descripcion: descripcionController.text,
        categoria: categoria,
        prioridad: prioridad,
        estado: 'abierto',
        fechaCreacion: DateTime.now(),
        creadoPor: empleadoNombre,
      );

      await _secretariaService.crearTicket(ticket);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Ticket creado'),
            backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  void _verDetalleTicket(TicketSoporte ticket) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(ticket.asunto),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoRow('Cliente:', ticket.clienteNombre),
              _buildInfoRow('Descripción:', ticket.descripcion),
              _buildInfoRow('Categoría:', ticket.categoria),
              _buildInfoRow('Estado:', ticket.estado),
              if (ticket.respuesta != null)
                _buildInfoRow('Respuesta:', ticket.respuesta!),
            ],
          ),
        ),
        actions: [
          if (ticket.estado != 'resuelto')
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                await _resolverTicket(ticket);
              },
              child: const Text('Resolver'),
            ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Future<void> _resolverTicket(TicketSoporte ticket) async {
    final controller = TextEditingController();

    final respuesta = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Resolver Ticket'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Respuesta',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Resolver'),
          ),
        ],
      ),
    );

    if (respuesta != null && respuesta.isNotEmpty) {
      await _secretariaService.resolverTicket(ticket.id, respuesta);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Ticket resuelto'),
            backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  // ==================== HELPERS ====================
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Color _getPagoColor(String estado) {
    return estado == 'confirmado' ? AppTheme.successColor : AppTheme.warningColor;
  }

  Color _getTicketColor(String estado) {
    switch (estado) {
      case 'resuelto': return AppTheme.successColor;
      case 'en_proceso': return AppTheme.warningColor;
      default: return AppTheme.errorColor;
    }
  }

  String _formatFecha(DateTime fecha) {
    return '${fecha.day}/${fecha.month}/${fecha.year}';
  }
}