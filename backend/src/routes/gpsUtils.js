// backend/src/utils/gpsUtils.js

/**
 * Calcula distancia entre dos puntos GPS (en km)
 * Usa fórmula de Haversine
 */
export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c;
  
  return distancia;
}

function toRad(grados) {
  return grados * (Math.PI / 180);
}

/**
 * Valida coordenadas GPS
 */
export function validarCoordenadas(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Optimiza ruta usando Google Maps API
 * (Implementación básica - se mejorará con la API key)
 */
export async function optimizarRuta(puntos) {
  // Por ahora retorna los puntos en el mismo orden
  // Cuando agregues Google Maps API, aquí irá la optimización
  
  // TODO: Implementar con Google Maps Directions API
  // - Usar waypoint optimization
  // - Considerar tráfico en tiempo real
  // - Retornar ruta optimizada
  
  return puntos;
}

/**
 * Geocodifica una dirección (convierte dirección en coordenadas)
 * Requiere Google Maps Geocoding API
 */
export async function geocodificar(direccion) {
  // TODO: Implementar con Google Maps Geocoding API
  // const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  // const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccion)}&key=${apiKey}`;
  
  // Por ahora retorna null
  return null;
}

/**
 * Obtiene dirección desde coordenadas (reverse geocoding)
 */
export async function obtenerDireccion(lat, lng) {
  // TODO: Implementar con Google Maps Geocoding API (reverse)
  return null;
}