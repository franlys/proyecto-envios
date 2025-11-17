library;

// lib/screens/admin/admin_usuarios_screen.dart
/// 👥 PANTALLA DE GESTIÓN DE USUARIOS
/// CRUD completo de usuarios del sistema

import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../models/admin_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class AdminUsuariosScreen extends StatefulWidget {
  const AdminUsuariosScreen({super.key});

  @override
  State<AdminUsuariosScreen> createState() => _AdminUsuariosScreenState();
}

class _AdminUsuariosScreenState extends State<AdminUsuariosScreen> {
  final AdminService _adminService = AdminService();
  String _filtroRol = 'todos';

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Gestión de Usuarios'),
            automaticallyImplyLeading: false,
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                onSelected: (value) => setState(() => _filtroRol = value),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'todos', child: Text('Todos')),
                  PopupMenuItem(value: 'secretaria', child: Text('Secretarias')),
                  PopupMenuItem(value: 'almacenUSA', child: Text('Almacén USA')),
                  PopupMenuItem(value: 'almacenRD', child: Text('Almacén RD')),
                  PopupMenuItem(value: 'cargador', child: Text('Cargadores')),
                  PopupMenuItem(value: 'recolector', child: Text('Recolectores')),
                  PopupMenuItem(value: 'repartidor', child: Text('Repartidores')),
                ],
              ),
            ],
          ),
          body: StreamBuilder<List<UsuarioSistema>>(
            stream: _adminService.getUsuariosStream(
              filtroRol: _filtroRol == 'todos' ? null : _filtroRol),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final usuarios = snapshot.data ?? [];

              if (usuarios.isEmpty) {
                return const Center(child: Text('No hay usuarios'));
              }

              return ListView.builder(
                padding: helper.screenPadding,
                itemCount: usuarios.length,
                itemBuilder: (context, index) => _buildUsuarioCard(usuarios[index]),
              );
            },
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _crearUsuario(),
            icon: const Icon(Icons.add),
            label: const Text('Nuevo Usuario'),
            backgroundColor: AppTheme.adminColor,
          ),
        );
      },
    );
  }

  Widget _buildUsuarioCard(UsuarioSistema usuario) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: usuario.activo 
            ? AppTheme.successColor.withValues(alpha: 0.2)
            : AppTheme.errorColor.withValues(alpha: 0.2),
          child: Icon(Icons.person, color: usuario.activo 
            ? AppTheme.successColor : AppTheme.errorColor),
        ),
        title: Text(usuario.nombre, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(usuario.email),
            Text(usuario.getRolNombre(), style: const TextStyle(
              color: AppTheme.adminColor, fontSize: 12)),
          ],
        ),
        trailing: Switch(
          value: usuario.activo,
          onChanged: (value) => _toggleUsuario(usuario.id, value),
        ),
        onTap: () => _verDetalleUsuario(usuario),
      ),
    );
  }

  Future<void> _crearUsuario() async {
    final formKey = GlobalKey<FormState>();
    final nombreController = TextEditingController();
    final emailController = TextEditingController();
    String rol = 'secretaria';

    final resultado = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Nuevo Usuario'),
          content: Form(
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
                DropdownButtonFormField<String>(
                  initialValue: rol,
                  decoration: const InputDecoration(labelText: 'Rol'),
                  items: const [
                    DropdownMenuItem(value: 'secretaria', child: Text('Secretaria')),
                    DropdownMenuItem(value: 'almacenUSA', child: Text('Almacén USA')),
                    DropdownMenuItem(value: 'almacenRD', child: Text('Almacén RD')),
                    DropdownMenuItem(value: 'cargador', child: Text('Cargador')),
                    DropdownMenuItem(value: 'recolector', child: Text('Recolector')),
                    DropdownMenuItem(value: 'repartidor', child: Text('Repartidor')),
                  ],
                  onChanged: (value) => setState(() => rol = value!),
                ),
              ],
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
      final usuario = UsuarioSistema(
        id: '',
        nombre: nombreController.text,
        email: emailController.text,
        rol: rol,
        activo: true,
        fechaCreacion: DateTime.now(),
      );

      await _adminService.crearUsuario(usuario);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Usuario creado'),
            backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  Future<void> _toggleUsuario(String usuarioId, bool activo) async {
    await _adminService.toggleUsuarioActivo(usuarioId, activo);
  }

  void _verDetalleUsuario(UsuarioSistema usuario) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(usuario.nombre),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoRow('Email:', usuario.email),
            _buildInfoRow('Rol:', usuario.getRolNombre()),
            _buildInfoRow('Estado:', usuario.activo ? 'Activo' : 'Inactivo'),
            if (usuario.telefono != null)
              _buildInfoRow('Teléfono:', usuario.telefono!),
            if (usuario.ultimoAcceso != null)
              _buildInfoRow('Último acceso:', 
                '${usuario.ultimoAcceso!.day}/${usuario.ultimoAcceso!.month}/${usuario.ultimoAcceso!.year}'),
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

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 100, child: Text(label, 
            style: const TextStyle(fontWeight: FontWeight.bold))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}