// lib/screens/common/help_screen.dart
import 'package:flutter/material.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ayuda'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          ListTile(
            leading: Icon(Icons.help_outline),
            title: Text('¿Cómo usar el sistema?'),
            subtitle: Text('Guía básica de uso'),
          ),
          Divider(),
          ListTile(
            leading: Icon(Icons.phone),
            title: Text('Soporte'),
            subtitle: Text('Contactar al equipo de soporte'),
          ),
          Divider(),
          ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Acerca de'),
            subtitle: Text('Versión 1.0.0'),
          ),
        ],
      ),
    );
  }
}