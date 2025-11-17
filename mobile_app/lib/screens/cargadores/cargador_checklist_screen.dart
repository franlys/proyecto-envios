import 'package:flutter/material.dart';
import '../../core/responsive/responsive_helper.dart';

class CargadorChecklistScreen extends StatefulWidget {
  const CargadorChecklistScreen({super.key});

  @override
  State<CargadorChecklistScreen> createState() => _CargadorChecklistScreenState();
}

class _CargadorChecklistScreenState extends State<CargadorChecklistScreen> {
  final Map<String, bool> _checklist = {
    'Revisar estado del vehículo': false,
    'Verificar nivel de combustible': false,
    'Comprobar presión de neumáticos': false,
    'Revisar luces y señales': false,
    'Verificar sistema de frenos': false,
    'Comprobar documentos del vehículo': false,
    'Revisar carga asignada en sistema': false,
    'Verificar herramientas de trabajo': false,
    'Comprobar espacio disponible': false,
    'Revisar equipo de seguridad': false,
  };

  bool get _allChecked => _checklist.values.every((checked) => checked);
  int get _checkedCount => _checklist.values.where((v) => v).length;
  double get _progress => _checkedCount / _checklist.length;

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checklist Pre-Carga'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Indicador de progreso
          Container(
            padding: responsive.screenPadding,
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Progreso del Checklist',
                      style: TextStyle(
                        fontSize: responsive.getFontSize(18),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _allChecked ? Colors.green : Colors.orange,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${(_progress * 100).toInt()}%',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: responsive.getFontSize(14),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: _progress,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _allChecked ? Colors.green : Colors.blue,
                    ),
                    minHeight: 10,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$_checkedCount de ${_checklist.length} verificaciones completadas',
                  style: TextStyle(
                    fontSize: responsive.getFontSize(14),
                    color: Colors.grey[700],
                  ),
                ),
              ],
            ),
          ),
          
          // Lista de checklist
          Expanded(
            child: ListView(
              padding: responsive.screenPadding,
              children: _checklist.entries.map((entry) {
                final index = _checklist.keys.toList().indexOf(entry.key);
                
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  elevation: responsive.cardElevation,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(responsive.borderRadius),
                    side: entry.value
                        ? const BorderSide(color: Colors.green, width: 2)
                        : BorderSide.none,
                  ),
                  child: CheckboxListTile(
                    title: Text(
                      entry.key,
                      style: TextStyle(
                        fontSize: responsive.getFontSize(16),
                        decoration: entry.value 
                            ? TextDecoration.lineThrough 
                            : null,
                        color: entry.value ? Colors.grey : Colors.black,
                      ),
                    ),
                    subtitle: Text(
                      'Paso ${index + 1} de ${_checklist.length}',
                      style: TextStyle(
                        fontSize: responsive.getFontSize(12),
                        color: Colors.grey[600],
                      ),
                    ),
                    value: entry.value,
                    activeColor: Colors.green,
                    onChanged: (bool? value) {
                      setState(() {
                        _checklist[entry.key] = value ?? false;
                      });
                    },
                    secondary: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: entry.value 
                            ? Colors.green.withValues(alpha: 0.2)
                            : Colors.grey.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        entry.value ? Icons.check_circle : Icons.circle_outlined,
                        color: entry.value ? Colors.green : Colors.grey,
                        size: responsive.iconSize,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          
          // Botón de confirmar
          Container(
            padding: responsive.screenPadding,
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!_allChecked)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.info_outline,
                            size: 20,
                            color: Colors.orange,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Completa todas las verificaciones para continuar',
                              style: TextStyle(
                                fontSize: responsive.getFontSize(14),
                                color: Colors.orange[700],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  SizedBox(
                    width: double.infinity,
                    height: responsive.buttonHeight,
                    child: ElevatedButton(
                      onPressed: _allChecked ? _completarChecklist : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        disabledBackgroundColor: Colors.grey[300],
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(responsive.borderRadius),
                        ),
                        elevation: _allChecked ? 4 : 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _allChecked ? Icons.check_circle : Icons.lock,
                            size: responsive.iconSize,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _allChecked 
                                ? 'Completar Checklist' 
                                : 'Completa todas las verificaciones',
                            style: TextStyle(
                              fontSize: responsive.getFontSize(16),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _completarChecklist() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 32),
            SizedBox(width: 12),
            Text('Checklist Completado'),
          ],
        ),
        content: const Text(
          'Has completado todas las verificaciones pre-carga exitosamente. Ahora puedes iniciar el proceso de carga.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop(true); // Volver con resultado exitoso
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
            ),
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
  }
}