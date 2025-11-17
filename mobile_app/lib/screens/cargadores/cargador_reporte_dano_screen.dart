// lib/screens/cargadores/cargador_reporte_dano_screen.dart
/// 📸 PANTALLA DE REPORTE DE DAÑOS
/// Formulario completo con cámara para reportar ítems dañados
library;


import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/cargador_service.dart';
import '../../models/cargador_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/responsive/responsive.dart';

class CargadorReporteDanoScreen extends StatefulWidget {
  final String rutaId;
  final ItemCarga item;

  const CargadorReporteDanoScreen({
    super.key,
    required this.rutaId,
    required this.item,
  });

  @override
  State<CargadorReporteDanoScreen> createState() => _CargadorReporteDanoScreenState();
}

class _CargadorReporteDanoScreenState extends State<CargadorReporteDanoScreen> {
  final _formKey = GlobalKey<FormState>();
  final CargadorService _cargadorService = CargadorService();
  final TextEditingController _descripcionController = TextEditingController();
  
  String _tipoDano = 'rotura';
  String _severidad = 'leve';
  final List<String> _fotosUrls = []; // En una app real, aquí irían las URLs de Storage
  bool _isSubmitting = false;

  @override
  void dispose() {
    _descripcionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, helper) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Reportar Daño'),
          ),
          body: SingleChildScrollView(
            padding: helper.screenPadding,
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Info del item
                  _buildItemInfo(helper),

                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 24),

                  // Tipo de daño
                  _buildTipoDanoSection(helper),

                  const SizedBox(height: 24),

                  // Severidad
                  _buildSeveridadSection(helper),

                  const SizedBox(height: 24),

                  // Descripción
                  _buildDescripcionSection(helper),

                  const SizedBox(height: 24),

                  // Fotos
                  _buildFotosSection(helper),

                  const SizedBox(height: 32),

                  // Botón de enviar
                  _buildSubmitButton(helper),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ==================== INFO DEL ITEM ====================
  Widget _buildItemInfo(ResponsiveHelper helper) {
    return Card(
      color: AppTheme.warningColor.withOpacity(0.1),
      child: Padding(
        padding: EdgeInsets.all(helper.responsiveValue(
          phone: 16,
          tablet: 20,
          desktop: 24,
        )),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.inventory,
                  size: helper.responsiveValue(
                    phone: 24,
                    tablet: 28,
                    desktop: 32,
                  ),
                  color: AppTheme.warningColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ítem a Reportar',
                        style: TextStyle(
                          fontSize: helper.getFontSize(12),
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.item.descripcion,
                        style: TextStyle(
                          fontSize: helper.getFontSize(16),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (widget.item.barcode != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.qr_code,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 8),
                  Text(
                    widget.item.barcode!,
                    style: TextStyle(
                      fontSize: helper.getFontSize(14),
                      color: Colors.grey[700],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ==================== TIPO DE DAÑO ====================
  Widget _buildTipoDanoSection(ResponsiveHelper helper) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tipo de Daño *',
          style: TextStyle(
            fontSize: helper.getFontSize(16),
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _buildTipoDanoChip('rotura', 'Rotura', Icons.broken_image, helper),
            _buildTipoDanoChip('mojado', 'Mojado', Icons.water_drop, helper),
            _buildTipoDanoChip('aplastado', 'Aplastado', Icons.compress, helper),
            _buildTipoDanoChip('otro', 'Otro', Icons.more_horiz, helper),
          ],
        ),
      ],
    );
  }

  Widget _buildTipoDanoChip(
    String value,
    String label,
    IconData icon,
    ResponsiveHelper helper,
  ) {
    final isSelected = _tipoDano == value;
    
    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: helper.responsiveValue(phone: 16, tablet: 18, desktop: 20),
          ),
          const SizedBox(width: 8),
          Text(label),
        ],
      ),
      onSelected: (selected) {
        setState(() {
          _tipoDano = value;
        });
      },
      selectedColor: AppTheme.errorColor.withOpacity(0.2),
      checkmarkColor: AppTheme.errorColor,
      labelStyle: TextStyle(
        fontSize: helper.getFontSize(14),
        color: isSelected ? AppTheme.errorColor : Colors.grey[700],
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  // ==================== SEVERIDAD ====================
  Widget _buildSeveridadSection(ResponsiveHelper helper) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Severidad del Daño *',
          style: TextStyle(
            fontSize: helper.getFontSize(16),
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Column(
          children: [
            _buildSeveridadOption(
              'leve',
              'Leve',
              'Daño menor, no afecta la funcionalidad',
              AppTheme.infoColor,
              helper,
            ),
            const SizedBox(height: 8),
            _buildSeveridadOption(
              'moderado',
              'Moderado',
              'Daño visible, puede afectar presentación',
              AppTheme.warningColor,
              helper,
            ),
            const SizedBox(height: 8),
            _buildSeveridadOption(
              'grave',
              'Grave',
              'Daño severo, afecta funcionalidad del ítem',
              AppTheme.errorColor,
              helper,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSeveridadOption(
    String value,
    String title,
    String subtitle,
    Color color,
    ResponsiveHelper helper,
  ) {
    final isSelected = _severidad == value;

    return InkWell(
      onTap: () {
        setState(() {
          _severidad = value;
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: EdgeInsets.all(helper.responsiveValue(
          phone: 12,
          tablet: 16,
          desktop: 20,
        )),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.grey[100],
          border: Border.all(
            color: isSelected ? color : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Radio<String>(
              value: value,
              groupValue: _severidad,
              onChanged: (newValue) {
                setState(() {
                  _severidad = newValue!;
                });
              },
              activeColor: color,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: helper.getFontSize(14),
                      fontWeight: FontWeight.bold,
                      color: isSelected ? color : Colors.grey[800],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: helper.getFontSize(12),
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==================== DESCRIPCIÓN ====================
  Widget _buildDescripcionSection(ResponsiveHelper helper) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Descripción del Daño *',
          style: TextStyle(
            fontSize: helper.getFontSize(16),
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _descripcionController,
          maxLines: 5,
          decoration: InputDecoration(
            hintText: 'Describe detalladamente el daño encontrado...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Por favor describe el daño';
            }
            if (value.trim().length < 10) {
              return 'La descripción debe tener al menos 10 caracteres';
            }
            return null;
          },
        ),
      ],
    );
  }

  // ==================== FOTOS ====================
  Widget _buildFotosSection(ResponsiveHelper helper) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Fotos del Daño',
              style: TextStyle(
                fontSize: helper.getFontSize(16),
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.infoColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Opcional',
                style: TextStyle(
                  fontSize: helper.getFontSize(11),
                  color: AppTheme.infoColor,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // Grid de fotos
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: helper.isPhone ? 3 : 4,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: _fotosUrls.length + 1,
          itemBuilder: (context, index) {
            if (index == _fotosUrls.length) {
              // Botón para agregar foto
              return _buildAddPhotoButton(helper);
            } else {
              // Foto existente
              return _buildPhotoThumbnail(_fotosUrls[index], index, helper);
            }
          },
        ),
      ],
    );
  }

  Widget _buildAddPhotoButton(ResponsiveHelper helper) {
    return InkWell(
      onTap: _agregarFoto,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: Colors.grey[400]!,
            style: BorderStyle.solid,
            width: 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.add_a_photo,
              size: helper.responsiveValue(
                phone: 32,
                tablet: 40,
                desktop: 48,
              ),
              color: Colors.grey[600],
            ),
            const SizedBox(height: 8),
            Text(
              'Agregar',
              style: TextStyle(
                fontSize: helper.getFontSize(12),
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoThumbnail(String url, int index, ResponsiveHelper helper) {
    return Stack(
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.grey[300],
            borderRadius: BorderRadius.circular(8),
            image: DecorationImage(
              image: NetworkImage(url),
              fit: BoxFit.cover,
            ),
          ),
          child: Center(
            child: Icon(
              Icons.image,
              size: 40,
              color: Colors.grey[400],
            ),
          ),
        ),
        // Botón de eliminar
        Positioned(
          top: 4,
          right: 4,
          child: InkWell(
            onTap: () => _eliminarFoto(index),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close,
                size: 16,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ==================== BOTÓN DE SUBMIT ====================
  Widget _buildSubmitButton(ResponsiveHelper helper) {
    return SizedBox(
      width: double.infinity,
      height: helper.responsiveValue(
        phone: 50,
        tablet: 56,
        desktop: 60,
      ),
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _enviarReporte,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.errorColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: _isSubmitting
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send),
                  const SizedBox(width: 12),
                  Text(
                    'Enviar Reporte',
                    style: TextStyle(
                      fontSize: helper.getFontSize(16),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  // ==================== ACCIONES ====================
  
  Future<void> _agregarFoto() async {
    // TODO: Implementar captura de foto con image_picker
    // y subida a Firebase Storage
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Agregar Foto'),
        content: const Text(
          'Función de cámara:\n\n'
          '1. Instala el paquete image_picker\n'
          '2. Configura permisos de cámara\n'
          '3. Sube la foto a Firebase Storage\n'
          '4. Guarda la URL en _fotosUrls',
        ),
        actions: [
          TextButton(
            onPressed: () {
              // Simulación: agregar URL de prueba
              setState(() {
                _fotosUrls.add('https://via.placeholder.com/300');
              });
              Navigator.pop(context);
            },
            child: const Text('Simular Foto'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _eliminarFoto(int index) {
    setState(() {
      _fotosUrls.removeAt(index);
    });
  }

  Future<void> _enviarReporte() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final reportadoPor = authService.getEmpleadoNombre() ?? 'Desconocido';

      // Crear reporte
      final reporte = ReporteDano(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        itemId: widget.item.itemId,
        tipoDano: _tipoDano,
        descripcion: _descripcionController.text.trim(),
        severidad: _severidad,
        fotoUrls: _fotosUrls,
        fechaReporte: DateTime.now(),
        reportadoPor: reportadoPor,
      );

      // Enviar a Firestore
      bool success = await _cargadorService.reportarDano(
        widget.rutaId,
        widget.item.itemId,
        reporte,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Daño reportado exitosamente'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        Navigator.pop(context, true); // Volver con resultado exitoso
      } else if (mounted) {
        throw Exception('Error al guardar el reporte');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}