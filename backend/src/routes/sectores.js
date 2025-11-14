// backend/src/routes/sectores.js
/**
 * SISTEMA DE SECTORES Y OPTIMIZACIÓN DE RUTAS
 * Adaptado para Firebase con ES Modules
 * Cobertura completa de República Dominicana
 */

import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// ========================================
// CATÁLOGO COMPLETO DE SECTORES POR ZONA
// ========================================
const SECTORES_CATALOGO = {
  'Local': [
    // Baní y alrededores (hasta Cruce de Ocoa)
    'Baní Centro', 'Sabana Buey', 'Matanzas', 'Sombrero',
    'Villa Fundación', 'Paya', 'Los Almácigos', 'El Cañafistol',
    'Catalina', 'El Limonal', 'Las Barías', 'Sabana Grande de Boyá',
    'Villa Sombrero Centro', 'Pizarrete', 'Santana',
    'Cruce de Ocoa', 'Sabana del Puerto', 'Las Barias', 'Bocacanasta', 'El llano', 'Pueblo Nuevo', 'Villa Majega',
    'Peravia', 'El 30 De Mayo', 'La Monteria', 'Calderas', 'Santa Rosa',
  ],
  
  'Capital': [
    // Desde Yaguate hacia Santo Domingo
    'Yaguate Centro', 'Yaguate Norte', 'Yaguate Sur',
    
    // San Cristóbal
    'San Cristóbal Centro', 'Villa Altagracia', 'Cambita Garabitos',
    'Bajos de Haina', 'Haina Centro', 'Haina Industrial',
    'Najayo', 'Palenque', 'San Gregorio de Nigua',
    
    // Santo Domingo Oeste
    'Los Alcarrizos', 'Pantoja', 'Pedro Brand', 'Pueblo Nuevo',
    'Hato Nuevo', 'La Agustina', 'Palmarejo', 'Villa Mella',
    
    // Santo Domingo Norte
    'Villa Mella Centro', 'Los Mina Norte', 'Los Mina Sur',
    'Sabana Perdida', 'La Victoria', 'Villa Consuelo',
    'Ensanche Espaillat', 'Cristo Rey', 'Villa Francisca',
    'Los Tres Brazos', 'La Zurza', 'Gualey', 'María Auxiliadora',
    'Los Guaricanos', 'Guachupita', 'La Ciénaga', '24 de Abril',
    
    // Santo Domingo Este
    'Los Mameyes', 'Mendoza', 'San Isidro', 'Las Américas',
    'Alma Rosa', 'Lucerna', 'Invivienda', 'Los Frailes',
    'San Carlos', 'San Luis', 'Isabelita', 'Ozama',
    'Ensanche Ozama', 'Los Tres Ojos',
    
    // Distrito Nacional (Centro)
    'Zona Colonial', 'Ciudad Nueva', 'San Carlos', 'Centro de los Héroes',
    'Gazcue', 'Mirador Norte', 'Mirador Sur',
    
    // Ensanches Este
    'Naco', 'Piantini', 'La Julia', 'Evaristo Morales',
    'Paraíso', 'La Esperilla', 'Bella Vista', 'Serrallés',
    
    // Ensanches Norte
    'Los Prados', 'Arroyo Hondo', 'El Millón', 'La Castellana',
    'Los Jardines', 'Los Jardines Metropolitanos',
    
    // Zona Oriental DN
    'San Carlos', 'Villa Duarte', 'Ensanche Luperón',
    'Los Ríos', 'Ensanche Quisqueya',
    
    // Santo Domingo Norte Extension
    'Boca Chica', 'Andrés Boca Chica', 'Guayacanes',
    'Juan Dolio', 'Caribe'
  ],
  
  'Este': [
    // San Pedro de Macorís y alrededores
    'San Pedro de Macorís Centro', 'Los Mameyes (SPM)', 'Puerto Rico',
    'Quisqueya', 'Consuelo', 'Ingenio Angelina', 'Gautier',
    'Ramón Santana', 'Los Llanos',
    
    // La Romana
    'La Romana Centro', 'La Romana Este', 'La Romana Oeste',
    'Villa Hermosa', 'Caleta', 'Cumayasa', 'Guaymate',
    
    // Zona turística Este
    'Higüey Centro', 'Higüey Norte', 'Higüey Sur',
    'Bávaro', 'Punta Cana', 'Uvero Alto', 'Macao',
    'Arena Gorda', 'Cabeza de Toro', 'El Cortecito',
    'Los Corales', 'Cap Cana',
    
    // La Altagracia
    'San Rafael del Yuma', 'Boca de Yuma', 'Bayahibe',
    'Nisibón', 'La Otra Banda',
    
    // El Seibo
    'El Seibo Centro', 'Miches', 'Santa Cruz del Seibo',
    'Pedro Sánchez', 'El Valle',
    
    // Hato Mayor
    'Hato Mayor del Rey', 'Sabana de la Mar', 'El Puerto',
    'Yerba Buena', 'Guayabo Dulce', 'Elupina Cordero',
    
    // Monte Plata
    'Monte Plata Centro', 'Yamasá', 'Bayaguana',
    'Peralvillo', 'Don Juan', 'Sabana Grande de Boyá'
  ],
  
  'Cibao': [
    // Santiago y alrededores
    'Santiago Centro', 'Los Jardines Metropolitanos', 'Bella Vista (STI)',
    'Gurabo', 'Cienfuegos', 'La Joya', 'Los Pepines',
    'Villa Olga', 'Hoya del Caimito', 'Pueblo Nuevo (STI)',
    'Reparto Peralta', 'Ensanche Bermúdez', 'Los Salados',
    'Tamboril', 'Villa Bisonó', 'Licey al Medio',
    
    // Puerto Plata
    'Puerto Plata Centro', 'Playa Dorada', 'Cofresí',
    'Sosúa Centro', 'Sosúa Beach', 'Cabarete', 'Río San Juan',
    'Luperón', 'Imbert', 'Villa Isabela', 'Montellano',
    
    // La Vega
    'La Vega Centro', 'Jarabacoa', 'Constanza', 'Jima Abajo',
    'Rincón', 'Río Verde Arriba', 'Tireo',
    
    // Moca
    'Moca Centro', 'Cayetano Germosén', 'José Contreras',
    'Las Lagunas de Nisibón', 'San Víctor',
    
    // San Francisco de Macorís
    'San Francisco Centro', 'Pimentel', 'Villa Riva',
    'Las Guaranas', 'Cenovi', 'Hostos',
    
    // Espaillat
    'Moca Centro', 'Cayetano Germosén', 'Gaspar Hernández',
    'Jamao al Norte', 'Villa Trina',
    
    // Duarte
    'San Francisco de Macorís', 'Arenoso', 'Castillo',
    'Eugenio María de Hostos', 'Las Guaranas', 'Pimentel',
    'Villa Riva',
    
    // Salcedo
    'Salcedo Centro', 'Tenares', 'Villa Tapia',
    
    // Monseñor Nouel
    'Bonao Centro', 'Maimón', 'Piedra Blanca', 'Villa Sonador',
    
    // Sánchez Ramírez
    'Cotuí Centro', 'Cevicos', 'Fantino', 'La Mata',
    
    // María Trinidad Sánchez
    'Nagua Centro', 'Cabrera', 'El Factor', 'Las Gordas',
    'San José de Matanzas', 'Río San Juan',
    
    // Hermanas Mirabal
    'Salcedo Centro', 'Tenares', 'Villa Tapia',
    
    // Samaná
    'Samaná Centro', 'Las Terrenas', 'Sánchez', 'Las Galeras',
    
    // Santiago Rodríguez
    'San Ignacio de Sabaneta', 'Monción', 'Villa Los Almácigos',
    
    // Valverde
    'Mao Centro', 'Esperanza', 'Laguna Salada', 'Cruce de Guayacanes',
    
    // Monte Cristi
    'Monte Cristi Centro', 'Castañuelas', 'Guayubín', 'Villa Vásquez',
    'Pepillo Salcedo', 'Las Matas de Santa Cruz',
    
    // Dajabón
    'Dajabón Centro', 'Loma de Cabrera', 'Partido', 'Restauración',
    'El Pino'
  ],
  
  'Sur': [
    // Desde Ocoa hacia el Sur
    'Ocoa Centro', 'Ocoa Norte', 'Ocoa Sur', 'Nizao',
    
    // Azua
    'Azua Centro', 'Estebanía', 'Padre Las Casas', 'Peralta',
    'Sabana Yegua', 'Pueblo Viejo', 'Las Charcas',
    'Palmar de Ocoa', 'Tabara Arriba', 'Las Yayas de Viajama',
    'Villarpando', 'Proyecto 4',
    
    // San Juan de la Maguana
    'San Juan Centro', 'Las Matas de Farfán', 'Vallejuelo',
    'El Cercado', 'Juan de Herrera', 'Bohechío', 'Pedro Corto',
    
    // Elías Piña
    'Comendador', 'Bánica', 'El Llano', 'Hondo Valle',
    'Pedro Santana',
    
    // Barahona
    'Barahona Centro', 'Cabral', 'Enriquillo', 'Paraíso',
    'Vicente Noble', 'El Peñón', 'Fundación', 'Jaquimeyes',
    'La Ciénaga', 'Las Salinas', 'Polo',
    
    // Baoruco
    'Neiba Centro', 'Galván', 'Tamayo', 'Villa Jaragua',
    'Los Ríos',
    
    // Independencia
    'Jimaní Centro', 'Duvergé', 'La Descubierta', 'Cristóbal',
    'Postrer Río', 'Mella',
    
    // Pedernales
    'Pedernales Centro', 'Oviedo', 'Juancho', 'José Francisco Peña Gómez'
  ]
};

// ========================================
// 📋 OBTENER CATÁLOGO COMPLETO
// ========================================
router.get('/catalogo', verifyToken, async (req, res) => {
  try {
    // Contar total de sectores
    const totalSectores = Object.values(SECTORES_CATALOGO)
      .reduce((sum, sectores) => sum + sectores.length, 0);
    
    res.json({
      success: true,
      data: SECTORES_CATALOGO,
      estadisticas: {
        totalZonas: Object.keys(SECTORES_CATALOGO).length,
        totalSectores,
        sectoresPorZona: Object.entries(SECTORES_CATALOGO).map(([zona, sectores]) => ({
          zona,
          cantidad: sectores.length
        }))
      },
      mensaje: `Catálogo completo: ${totalSectores} sectores en ${Object.keys(SECTORES_CATALOGO).length} zonas`
    });
  } catch (error) {
    console.error('❌ Error obteniendo catálogo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener catálogo de sectores'
    });
  }
});

// ========================================
// 🗺️ OBTENER SECTORES POR ZONA
// ========================================
router.get('/por-zona/:zona', verifyToken, async (req, res) => {
  const { zona } = req.params;
  
  try {
    const sectores = SECTORES_CATALOGO[zona] || [];
    
    if (sectores.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se encontraron sectores para la zona: ${zona}`,
        zonasDisponibles: Object.keys(SECTORES_CATALOGO)
      });
    }
    
    res.json({
      success: true,
      data: sectores.sort(),
      zona,
      cantidad: sectores.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo sectores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sectores'
    });
  }
});

// ========================================
// 🔍 BUSCAR SECTOR
// ========================================
router.get('/buscar', verifyToken, async (req, res) => {
  const { termino } = req.query;
  
  if (!termino || termino.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Proporciona un término de búsqueda (mínimo 2 caracteres)'
    });
  }
  
  try {
    const resultados = [];
    const terminoLower = termino.toLowerCase();
    
    Object.entries(SECTORES_CATALOGO).forEach(([zona, sectores]) => {
      sectores.forEach(sector => {
        if (sector.toLowerCase().includes(terminoLower)) {
          resultados.push({ zona, sector });
        }
      });
    });
    
    res.json({
      success: true,
      data: resultados,
      cantidad: resultados.length,
      termino
    });
  } catch (error) {
    console.error('❌ Error buscando sector:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar sector'
    });
  }
});

// ========================================
// 📊 ESTADÍSTICAS POR SECTOR
// ========================================
router.get('/estadisticas', verifyToken, checkRole('almacen_rd', 'admin_general', 'super_admin'), async (req, res) => {
  const { zona } = req.query;
  
  try {
    let query = db.collection('recolecciones');
    
    // Filtrar por zona si se especifica
    if (zona) {
      query = query.where('zona', '==', zona);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        data: [],
        mensaje: zona ? `No hay recolecciones en la zona ${zona}` : 'No hay recolecciones registradas'
      });
    }
    
    // Agrupar por zona y sector
    const estadisticas = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const sector = data.sector || 'Sin Sector';
      const key = `${data.zona}-${sector}`;
      
      if (!estadisticas[key]) {
        estadisticas[key] = {
          zona: data.zona,
          sector,
          total_recolecciones: 0,
          pendientes: 0,
          confirmadas: 0,
          en_ruta: 0,
          entregadas: 0,
          valor_total: 0
        };
      }
      
      estadisticas[key].total_recolecciones++;
      
      // Contar por estado
      switch (data.estadoGeneral) {
        case 'pendiente_confirmacion':
          estadisticas[key].pendientes++;
          break;
        case 'confirmada':
          estadisticas[key].confirmadas++;
          break;
        case 'en_ruta':
          estadisticas[key].en_ruta++;
          break;
        case 'entregada':
          estadisticas[key].entregadas++;
          break;
      }
      
      estadisticas[key].valor_total += (data.facturacion_total || 0);
    });
    
    // Convertir a array y ordenar
    const resultado = Object.values(estadisticas)
      .sort((a, b) => b.total_recolecciones - a.total_recolecciones);
    
    res.json({
      success: true,
      data: resultado,
      total_sectores: resultado.length,
      total_recolecciones: snapshot.size
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

// ========================================
// 🚀 OPTIMIZAR RUTA POR SECTORES
// ========================================
router.post('/optimizar-ruta', verifyToken, checkRole('almacen_rd', 'admin_general', 'super_admin'), async (req, res) => {
  const { zona, facturasIds } = req.body;
  
  // Validaciones
  if (!zona) {
    return res.status(400).json({
      success: false,
      error: 'La zona es obligatoria'
    });
  }
  
  if (!facturasIds || !Array.isArray(facturasIds) || facturasIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Debe proporcionar al menos una factura'
    });
  }
  
  try {
    console.log(`🚀 Optimizando ruta para zona: ${zona} con ${facturasIds.length} facturas`);
    
    // Obtener facturas desde Firestore
    const facturasPromises = facturasIds.map(id => 
      db.collection('recolecciones').doc(id).get()
    );
    
    const facturasSnap = await Promise.all(facturasPromises);
    
    // Filtrar solo las que existen y pertenecen a la zona
    const facturas = facturasSnap
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(f => f.zona === zona);
    
    if (facturas.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se encontraron facturas válidas para la zona ${zona}`
      });
    }
    
    // ✅ ALGORITMO DE OPTIMIZACIÓN POR SECTORES
    const facturasPorSector = {};
    
    facturas.forEach(factura => {
      const sector = factura.sector || 'Sin Sector';
      
      if (!facturasPorSector[sector]) {
        facturasPorSector[sector] = [];
      }
      
      facturasPorSector[sector].push(factura);
    });
    
    // Ordenar sectores por cantidad de facturas (mayor a menor)
    const sectoresOrdenados = Object.keys(facturasPorSector)
      .sort((a, b) => facturasPorSector[b].length - facturasPorSector[a].length);
    
    // Construir ruta optimizada: primero sectores con más facturas
    const rutaOptimizada = [];
    sectoresOrdenados.forEach(sector => {
      const facturasDelSector = facturasPorSector[sector];
      rutaOptimizada.push(...facturasDelSector.map(f => f.id));
    });
    
    // Calcular estadísticas
    const estadisticas = {
      totalFacturas: facturas.length,
      sectoresUnicos: sectoresOrdenados.length,
      distribucionPorSector: sectoresOrdenados.map(sector => ({
        sector,
        cantidad: facturasPorSector[sector].length,
        porcentaje: ((facturasPorSector[sector].length / facturas.length) * 100).toFixed(1) + '%',
        facturas: facturasPorSector[sector].map(f => ({
          id: f.id,
          codigo: f.codigoTracking,
          destinatario: f.destinatario_nombre
        }))
      })),
      distanciaEstimada: calcularDistanciaEstimada(sectoresOrdenados, zona),
      tiempoEstimado: calcularTiempoEstimado(facturas.length, sectoresOrdenados.length, zona),
      eficiencia: calcularEficiencia(sectoresOrdenados.length, facturas.length)
    };
    
    console.log(`✅ Ruta optimizada: ${facturas.length} facturas en ${sectoresOrdenados.length} sectores`);
    
    res.json({
      success: true,
      data: {
        rutaOptimizada,
        estadisticas,
        zona,
        sectoresIncluidos: sectoresOrdenados
      },
      mensaje: `✅ Ruta optimizada con ${facturas.length} facturas distribuidas en ${sectoresOrdenados.length} sectores`
    });
  } catch (error) {
    console.error('❌ Error optimizando ruta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al optimizar ruta',
      detalles: error.message
    });
  }
});

// ========================================
// 💡 SUGERIR SECTORES PARA NUEVA RUTA
// ========================================
router.get('/sugerir', verifyToken, checkRole('almacen_rd', 'admin_general', 'super_admin'), async (req, res) => {
  const { zona } = req.query;
  
  if (!zona) {
    return res.status(400).json({
      success: false,
      error: 'La zona es obligatoria'
    });
  }
  
  try {
    console.log(`💡 Buscando sugerencias de sectores para zona: ${zona}`);
    
    // Obtener facturas confirmadas de la zona
    const snapshot = await db.collection('recolecciones')
      .where('zona', '==', zona)
      .where('estadoGeneral', '==', 'confirmada')
      .get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        data: {
          zona,
          sectoresSugeridos: [],
          mensaje: `⚠️ No hay facturas confirmadas en la zona ${zona}`
        }
      });
    }
    
    // Agrupar por sector
    const sectoresData = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const sector = data.sector || 'Sin Sector';
      
      if (!sectoresData[sector]) {
        sectoresData[sector] = {
          sector,
          facturas_pendientes: 0,
          valor_total: 0,
          facturas: []
        };
      }
      
      sectoresData[sector].facturas_pendientes++;
      sectoresData[sector].valor_total += (data.facturacion_total || 0);
      sectoresData[sector].facturas.push({
        id: doc.id,
        codigo: data.codigoTracking,
        destinatario: data.destinatario_nombre
      });
    });
    
    // Filtrar sectores con al menos 3 facturas y ordenar
    const sectoresSugeridos = Object.values(sectoresData)
      .filter(s => s.facturas_pendientes >= 3)
      .sort((a, b) => b.facturas_pendientes - a.facturas_pendientes)
      .slice(0, 5)
      .map(s => ({
        ...s,
        eficiencia: calcularEficiencia(1, s.facturas_pendientes),
        recomendacion: s.facturas_pendientes >= 10 ? '🔥 Altamente recomendado' :
                      s.facturas_pendientes >= 5 ? '✅ Recomendado' :
                      '💡 Viable'
      }));
    
    res.json({
      success: true,
      data: {
        zona,
        sectoresSugeridos,
        totalFacturasPendientes: snapshot.size,
        mensaje: sectoresSugeridos.length > 0 
          ? `🎯 Se encontraron ${sectoresSugeridos.length} sectores óptimos para crear rutas eficientes`
          : '⚠️ No hay suficientes facturas agrupadas por sector (mínimo 3 por sector)'
      }
    });
  } catch (error) {
    console.error('❌ Error sugiriendo sectores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al sugerir sectores',
      detalles: error.message
    });
  }
});

// ========================================
// 🛠️ FUNCIONES AUXILIARES
// ========================================

/**
 * Calcula distancia estimada en KM basada en sectores
 */
function calcularDistanciaEstimada(sectores, zona) {
  const distanciasPorZona = {
    'Capital': 5,    // 5 km promedio entre sectores en SD
    'Cibao': 15,     // 15 km promedio en Santiago/La Vega
    'Este': 20,      // 20 km promedio en Este
    'Sur': 25,       // 25 km promedio en Sur
    'Local': 8       // 8 km promedio en Baní y alrededores
  };
  
  const distanciaPromedio = distanciasPorZona[zona] || 10;
  const sectoresUnicos = new Set(sectores).size;
  
  // Si todos los sectores son el mismo, distancia mínima
  if (sectoresUnicos === 1) {
    return distanciaPromedio * 0.5;
  }
  
  // Distancia estimada = (sectores únicos - 1) * distancia promedio
  return Math.round((sectoresUnicos - 1) * distanciaPromedio);
}

/**
 * Calcula tiempo estimado en minutos
 */
function calcularTiempoEstimado(totalFacturas, sectoresUnicos, zona) {
  const distancia = calcularDistanciaEstimada(Array(sectoresUnicos).fill(''), zona);
  const velocidadPromedio = 30; // km/h en tráfico urbano
  const tiempoEntregaPorPaquete = 5; // minutos por entrega
  const tiempoSetupPorSector = 2; // minutos adicionales por cambio de sector
  
  const tiempoViaje = (distancia / velocidadPromedio) * 60;
  const tiempoEntregas = totalFacturas * tiempoEntregaPorPaquete;
  const tiempoTransicion = sectoresUnicos * tiempoSetupPorSector;
  
  return Math.round(tiempoViaje + tiempoEntregas + tiempoTransicion);
}

/**
 * Calcula porcentaje de eficiencia (más facturas por sector = más eficiente)
 */
function calcularEficiencia(sectores, facturas) {
  if (sectores === 0 || facturas === 0) return 0;
  
  const facturasPromedioPorSector = facturas / sectores;
  
  // Escala: 1-3 facturas = baja, 4-7 = media, 8+ = alta
  if (facturasPromedioPorSector >= 8) return '🔥 Alta';
  if (facturasPromedioPorSector >= 4) return '✅ Media';
  return '⚠️ Baja';
}

export default router;