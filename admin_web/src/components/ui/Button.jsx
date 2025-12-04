// ==============================================================================
// 🎨 BUTTON COMPONENT - Enterprise Design System
// ==============================================================================
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button Component - Botón empresarial reutilizable
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'|'success'} props.variant - Variante del botón
 * @param {'sm'|'md'|'lg'} props.size - Tamaño del botón
 * @param {boolean} props.loading - Estado de carga
 * @param {boolean} props.disabled - Estado deshabilitado
 * @param {React.ReactNode} props.children - Contenido del botón
 * @param {React.ReactNode} props.leftIcon - Ícono izquierdo
 * @param {React.ReactNode} props.rightIcon - Ícono derecho
 * @param {string} props.className - Clases adicionales
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-500',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-sm',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className={`${iconSizes[size]} animate-spin`} />}
      {!loading && leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className={iconSizes[size]}>{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
