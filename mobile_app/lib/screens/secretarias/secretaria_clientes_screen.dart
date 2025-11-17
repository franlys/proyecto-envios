// lib/screens/secretarias/secretaria_clientes_screen.dart
/// 👥 PANTALLA DE GESTIÓN DE CLIENTES
/// CRUD completo de clientes
library;


import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/secretaria_service.dart';
import '../../models/secretaria_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class SecretariaClientesScreen extends StatefulWidget {
  const SecretariaClientesScreen({super.key});

  @override
  State<SecretariaClientesScreen> createState() => _SecretariaClientesScreenState();
}

class _SecretariaClientesScreenState extends State<SecretariaClientesScreen> {
  final SecretariaService _secretariaService = SecretariaService();
  final TextEditingController _searchController = TextEditingController();
  String _filtroEstado = 'todos';

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Clientes'),
            automaticallyImplyLeading: false,
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) => setState(() => _filtroEstado = value),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'todos', child: Text('Todos')),
                  PopupMenuItem(value: 'activo', child: Text('Activos')),
                  PopupMenuItem(value: 'inactivo', child: Text('Inactivos')),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              _buildSearchBar(helper),
              Expanded(child: _buildClientesList(helper)),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _mostrarFormularioCliente(null),
            icon: const Icon(Icons.add),
            label: const Text('Nuevo Cliente'),
            backgroundColor: AppTheme.secretariaColor,
          ),
        );
      },
    );
  }

  Widget _buildSearchBar(ResponsiveHelper helper) {
    return Container(
      padding: helper.screenPadding,
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Buscar por nombre...',
          prefixIcon: const Icon(Icons.search),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        onSubmitted: (value) async {
          if (value.isNotEmpty) {
            final resultados = await _secretariaService.buscarClientes(value);
            // Mostrar resultados...
          }
        },
      ),
    );
  }

  Widget _buildClientesList(ResponsiveHelper helper) {
    return StreamBuilder<List<Cliente>>(
      stream: _secretariaService.getClientesStream(
        filtroEstado: _filtroEstado == 'todos' ? null : _filtroEstado,
      ),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final clientes = snapshot.data ?? [];

        if (clientes.isEmpty) {
          return Center(
            child: Text('No hay clientes', style: TextStyle(
              fontSize: helper.getFontSize(16), color: Colors.grey[600])),
          );
        }

        return ListView.builder(
          padding: helper.screenPadding,
          itemCount: clientes.length,
          itemBuilder: (context, index) => _buildClienteCard(clientes[index], helper),
        );
      },
    );
  }

  Widget _buildClienteCard(Cliente cliente, ResponsiveHelper helper) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.secretariaColor.withValues(alpha: 0.2),
          child: Text(cliente.nombre[0].toUpperCase()),
        ),
        title: Text(cliente.nombre, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tel: ${cliente.telefono}'),
            Text('Saldo: \$${cliente.saldoPendiente.toStringAsFixed(2)}'),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _getEstadoColor(cliente.estado).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(cliente.getEstadoTexto(),
            style: TextStyle(fontSize: 11, color: _getEstadoColor(cliente.estado))),
        ),
        onTap: () => _verDetalleCliente(cliente),
      ),
    );
  }

  Future<void> _mostrarFormularioCliente(Cliente? cliente) async {
    final formKey = GlobalKey<FormState>();
    final nombreController = TextEditingController(text: cliente?.nombre);
    final emailController = TextEditingController(text: cliente?.email);
    final telefonoController = TextEditingController(text: cliente?.telefono);
    final direccionUSAController = TextEditingController(text: cliente?.direccionUSA);
    final direccionRDController = TextEditingController(text: cliente?.direccionRD);

    final resultado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(cliente == null ? 'Nuevo Cliente' : 'Editar Cliente'),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nombreController,
                  decoration: const InputDecoration(labelText: 'Nombre *'),
                  validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                ),
                TextFormField(
                  controller: emailController,
                  decoration: const InputDecoration(labelText: 'Email *'),
                  validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                ),
                TextFormField(
                  controller: telefonoController,
                  decoration: const InputDecoration(labelText: 'Teléfono *'),
                  validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                ),
                TextFormField(
                  controller: direccionUSAController,
                  decoration: const InputDecoration(labelText: 'Dirección USA *'),
                  validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
                ),
                TextFormField(
                  controller: direccionRDController,
                  decoration: const InputDecoration(labelText: 'Dirección RD *'),
                  validator: (v) => v?.isEmpty ?? true ? 'Requerido' : null,
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
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (resultado == true) {
      final nuevoCliente = Cliente(
        id: cliente?.id ?? '',
        nombre: nombreController.text,
        email: emailController.text,
        telefono: telefonoController.text,
        direccionUSA: direccionUSAController.text,
        direccionRD: direccionRDController.text,
        tipoCliente: 'individual',
        estado: 'activo',
        fechaRegistro: cliente?.fechaRegistro ?? DateTime.now(),
      );

      if (cliente == null) {
        await _secretariaService.crearCliente(nuevoCliente, nombre: '', telefono: '', email: '', direccion: '', cedula: '');
      } else {
        await _secretariaService.actualizarCliente(cliente.id, nuevoCliente);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(cliente == null ? '✅ Cliente creado' : '✅ Cliente actualizado'),
            backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  void _verDetalleCliente(Cliente cliente) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(cliente.nombre),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoRow('Email:', cliente.email),
              _buildInfoRow('Teléfono:', cliente.telefono),
              _buildInfoRow('Dirección USA:', cliente.getDireccionCompletaUSA()),
              _buildInfoRow('Dirección RD:', cliente.getDireccionCompletaRD()),
              _buildInfoRow('Saldo:', '\$${cliente.saldoPendiente.toStringAsFixed(2)}'),
              _buildInfoRow('Total Envíos:', cliente.totalEnvios.toString()),
              _buildInfoRow('Estado:', cliente.getEstadoTexto()),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _mostrarFormularioCliente(cliente);
            },
            child: const Text('Editar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

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

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'activo': return AppTheme.successColor;
      case 'inactivo': return AppTheme.warningColor;
      default: return AppTheme.errorColor;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}