// lib/services/photo_service.dart
/// 📸 SERVICIO DE FOTOS
/// Maneja captura, compresión y subida de fotos a Firebase Storage

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:path/path.dart' as path;

class PhotoService {
  final ImagePicker _picker = ImagePicker();
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // ==================== CAPTURAR FOTO CON CÁMARA ====================

  /// Captura una foto usando la cámara
  Future<File?> takePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (photo != null) {
        return File(photo.path);
      }
      return null;
    } catch (e) {
      print('Error capturando foto: $e');
      return null;
    }
  }

  // ==================== SELECCIONAR DESDE GALERÍA ====================

  /// Selecciona una foto de la galería
  Future<File?> pickFromGallery() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (photo != null) {
        return File(photo.path);
      }
      return null;
    } catch (e) {
      print('Error seleccionando foto: $e');
      return null;
    }
  }

  // ==================== SELECCIONAR MÚLTIPLES FOTOS ====================

  /// Selecciona múltiples fotos de la galería
  Future<List<File>> pickMultipleFromGallery() async {
    try {
      final List<XFile> photos = await _picker.pickMultiImage(
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      return photos.map((photo) => File(photo.path)).toList();
    } catch (e) {
      print('Error seleccionando fotos: $e');
      return [];
    }
  }

  // ==================== MOSTRAR OPCIONES ====================

  /// Muestra un diálogo para elegir entre cámara o galería
  Future<File?> showImageSourceDialog(BuildContext context) async {
    return showDialog<File?>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Seleccionar foto'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt, color: Colors.blue),
                title: const Text('Tomar foto'),
                onTap: () async {
                  Navigator.pop(context);
                  final photo = await takePhoto();
                  if (photo != null && context.mounted) {
                    Navigator.pop(context, photo);
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: Colors.green),
                title: const Text('Seleccionar de galería'),
                onTap: () async {
                  Navigator.pop(context);
                  final photo = await pickFromGallery();
                  if (photo != null && context.mounted) {
                    Navigator.pop(context, photo);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
          ],
        );
      },
    );
  }

  // ==================== SUBIR A FIREBASE STORAGE ====================

  /// Sube una foto a Firebase Storage
  ///
  /// [file] - Archivo de la foto
  /// [folder] - Carpeta en Storage (ej: 'entregas', 'gastos', 'danos')
  /// [userId] - ID del usuario (opcional)
  ///
  /// Retorna la URL de descarga o null si falla
  Future<String?> uploadPhoto({
    required File file,
    required String folder,
    String? userId,
  }) async {
    try {
      // Generar nombre único
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final extension = path.extension(file.path);
      final fileName = userId != null
          ? '${userId}_${timestamp}$extension'
          : '${timestamp}$extension';

      // Referencia en Storage
      final ref = _storage.ref().child('$folder/$fileName');

      // Metadata
      final metadata = SettableMetadata(
        contentType: 'image/jpeg',
        customMetadata: {
          'uploadedAt': DateTime.now().toIso8601String(),
          if (userId != null) 'userId': userId,
        },
      );

      // Subir archivo
      print('📤 Subiendo foto a: $folder/$fileName');
      final uploadTask = ref.putFile(file, metadata);

      // Esperar a que termine
      final snapshot = await uploadTask;

      // Obtener URL de descarga
      final downloadUrl = await snapshot.ref.getDownloadURL();

      print('✅ Foto subida exitosamente: $downloadUrl');
      return downloadUrl;

    } catch (e) {
      print('❌ Error subiendo foto: $e');
      return null;
    }
  }

  // ==================== SUBIR MÚLTIPLES FOTOS ====================

  /// Sube múltiples fotos a Firebase Storage
  ///
  /// Retorna una lista con las URLs de las fotos subidas exitosamente
  Future<List<String>> uploadMultiplePhotos({
    required List<File> files,
    required String folder,
    String? userId,
    Function(int current, int total)? onProgress,
  }) async {
    final urls = <String>[];

    for (int i = 0; i < files.length; i++) {
      // Notificar progreso
      onProgress?.call(i + 1, files.length);

      // Subir foto
      final url = await uploadPhoto(
        file: files[i],
        folder: folder,
        userId: userId,
      );

      if (url != null) {
        urls.add(url);
      }
    }

    return urls;
  }

  // ==================== ELIMINAR FOTO ====================

  /// Elimina una foto de Firebase Storage usando su URL
  Future<bool> deletePhoto(String photoUrl) async {
    try {
      final ref = _storage.refFromURL(photoUrl);
      await ref.delete();
      print('✅ Foto eliminada: $photoUrl');
      return true;
    } catch (e) {
      print('❌ Error eliminando foto: $e');
      return false;
    }
  }

  // ==================== HELPERS ====================

  /// Obtiene el tamaño del archivo en MB
  double getFileSizeInMB(File file) {
    final bytes = file.lengthSync();
    return bytes / (1024 * 1024);
  }

  /// Verifica si el archivo es muy grande (> 10MB)
  bool isFileTooLarge(File file, {double maxMB = 10.0}) {
    return getFileSizeInMB(file) > maxMB;
  }
}

// ==================== WIDGET HELPER PARA MOSTRAR FOTOS ====================

/// Widget para mostrar una foto con opción de eliminar
class PhotoPreview extends StatelessWidget {
  final String photoUrl;
  final VoidCallback? onDelete;
  final double size;

  const PhotoPreview({
    Key? key,
    required this.photoUrl,
    this.onDelete,
    this.size = 100,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Foto
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.network(
            photoUrl,
            width: size,
            height: size,
            fit: BoxFit.cover,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                width: size,
                height: size,
                color: Colors.grey[200],
                child: const Center(
                  child: CircularProgressIndicator(),
                ),
              );
            },
            errorBuilder: (context, error, stackTrace) {
              return Container(
                width: size,
                height: size,
                color: Colors.grey[300],
                child: const Icon(Icons.error, color: Colors.red),
              );
            },
          ),
        ),

        // Botón eliminar
        if (onDelete != null)
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: onDelete,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.close,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ==================== WIDGET PARA SELECCIONAR FOTO ====================

/// Widget botón para seleccionar/tomar foto
class PhotoPickerButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String label;
  final IconData icon;
  final Color? color;

  const PhotoPickerButton({
    Key? key,
    required this.onPressed,
    this.label = 'Agregar foto',
    this.icon = Icons.add_a_photo,
    this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color ?? Colors.blue,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
      ),
    );
  }
}
