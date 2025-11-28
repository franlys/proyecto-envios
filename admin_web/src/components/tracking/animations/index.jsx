// Selector de animaciones por estado
import PendingPickupAnimation from './PendingPickupAnimation';
import CollectedAnimation from './CollectedAnimation';
import InContainerUSAAnimation from './InContainerUSAAnimation';
import IncompleteUSAAnimation from './IncompleteUSAAnimation';
import InTransitRDAnimation from './InTransitRDAnimation';
import ReceivedRDAnimation from './ReceivedRDAnimation';
import PendingConfirmationAnimation from './PendingConfirmationAnimation';
import ConfirmedAnimation from './ConfirmedAnimation';
import OnRouteAnimation from './OnRouteAnimation';
import ReadyToDeliverAnimation from './ReadyToDeliverAnimation';
import DeliveredAnimation from './DeliveredAnimation';
import NotDeliveredAnimation from './NotDeliveredAnimation';

// Mapeo de estados a componentes de animación
const animationMap = {
  'pendiente_recoleccion': PendingPickupAnimation,
  'recolectada': CollectedAnimation,
  'en_contenedor_usa': InContainerUSAAnimation,
  'incompleta_usa': IncompleteUSAAnimation,
  'en_transito_rd': InTransitRDAnimation,
  'recibida_rd': ReceivedRDAnimation,
  'pendiente_confirmacion': PendingConfirmationAnimation,
  'confirmada': ConfirmedAnimation,
  'en_ruta': OnRouteAnimation,
  'lista_para_entregar': ReadyToDeliverAnimation,
  'entregada': DeliveredAnimation,
  'no_entregada': NotDeliveredAnimation,
};

/**
 * Componente que selecciona y renderiza la animación correcta según el estado
 * @param {string} estado - Código del estado (ej: 'en_ruta', 'entregada')
 * @param {number} size - Tamaño de la animación (default: 200)
 */
export const TrackingAnimation = ({ estado, size = 200 }) => {
  const AnimationComponent = animationMap[estado] || PendingPickupAnimation;
  
  return <AnimationComponent size={size} />;
};

export default TrackingAnimation;
