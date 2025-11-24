// lib/services/map_service.dart
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';

class MapService {
  /// Abre la dirección en la aplicación de mapas externa (Google Maps, Waze, Apple Maps)
  static Future<void> openMap(String address) async {
    final query = Uri.encodeComponent(address);
    Uri googleMapsUrl;
    Uri appleMapsUrl;
    Uri wazeUrl;

    if (Platform.isAndroid) {
      googleMapsUrl = Uri.parse("geo:0,0?q=$query");
      wazeUrl = Uri.parse("waze://?q=$query");
    } else {
      googleMapsUrl = Uri.parse("comgooglemaps://?q=$query");
      appleMapsUrl = Uri.parse("https://maps.apple.com/?q=$query");
      wazeUrl = Uri.parse("waze://?q=$query");
    }

    // Intentar abrir Google Maps primero (es el estándar)
    if (await canLaunchUrl(googleMapsUrl)) {
      await launchUrl(googleMapsUrl);
      return;
    }

    // Si es iOS, intentar Apple Maps
    if (Platform.isIOS) {
       // ignore: dead_code
       if (await canLaunchUrl(appleMapsUrl!)) {
        await launchUrl(appleMapsUrl);
        return;
      }
    }

    // Intentar Waze
    if (await canLaunchUrl(wazeUrl)) {
      await launchUrl(wazeUrl);
      return;
    }

    // Fallback: Abrir en navegador web
    final webUrl = Uri.parse("https://www.google.com/maps/search/?api=1&query=$query");
    if (await canLaunchUrl(webUrl)) {
      await launchUrl(webUrl, mode: LaunchMode.externalApplication);
    } else {
      throw 'No se pudo abrir ninguna aplicación de mapas';
    }
  }
}
