// ==============================================================================
// 🎨 BADGE COMPONENT - Enterprise Design System
// ==============================================================================

/**
 * Badge Component - Badge empresarial reutilizable
 *
 * @param {Object} props
 * @param {'success'|'warning'|'danger'|'info'|'neutral'} props.variant - Variante del badge
 * @param {'sm'|'md'|'lg'} props.size - Tamaño del badge
 * @param {boolean} props.dot - Mostrar punto indicador
 * @param {string} props.className - Clases adicionales
 * @param {React.ReactNode} props.children - Contenido del badge
 */
const Badge = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}) => {

  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    danger: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
    info: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
    neutral: 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-indigo-500',
    neutral: 'bg-slate-500'
  };

  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`${dotSizes[size]} ${dotColors[variant]} rounded-full`} />}
      {children}
    </span>
  );
};

export default Badge;
