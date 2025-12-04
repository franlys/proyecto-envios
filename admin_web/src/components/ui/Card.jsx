// ==============================================================================
// 🎨 CARD COMPONENT - Enterprise Design System
// ==============================================================================

/**
 * Card Component - Tarjeta empresarial reutilizable
 *
 * @param {Object} props
 * @param {'base'|'elevated'|'interactive'} props.variant - Variante de la tarjeta
 * @param {string} props.className - Clases adicionales
 * @param {React.ReactNode} props.children - Contenido de la tarjeta
 * @param {Function} props.onClick - Función al hacer click (solo con variant='interactive')
 */
const Card = ({
  variant = 'base',
  className = '',
  children,
  onClick,
  ...props
}) => {

  const variants = {
    base: 'bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200',
    elevated: 'bg-white rounded-xl shadow-lg border border-slate-200',
    interactive: 'bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer'
  };

  return (
    <div
      className={`${variants[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * CardHeader - Header de la tarjeta
 */
export const CardHeader = ({ className = '', children, ...props }) => (
  <div className={`px-6 py-4 border-b border-slate-200 ${className}`} {...props}>
    {children}
  </div>
);

/**
 * CardBody - Cuerpo de la tarjeta
 */
export const CardBody = ({ className = '', children, ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

/**
 * CardFooter - Footer de la tarjeta
 */
export const CardFooter = ({ className = '', children, ...props }) => (
  <div className={`px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
