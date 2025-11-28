// Animación: Pendiente de Confirmación
import { motion } from 'framer-motion';

const PendingConfirmationAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Documento/Factura */}
      <motion.g
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <rect x="60" y="60" width="80" height="100" fill="#fff" stroke="#FF9800" strokeWidth="3" rx="4" />
        {/* Líneas de texto */}
        <line x1="75" y1="80" x2="125" y2="80" stroke="#FF9800" strokeWidth="2" />
        <line x1="75" y1="95" x2="115" y2="95" stroke="#FFB74D" strokeWidth="2" />
        <line x1="75" y1="110" x2="120" y2="110" stroke="#FFB74D" strokeWidth="2" />
      </motion.g>

      {/* Reloj de arena animado */}
      <motion.g
        animate={{
          rotate: [0, 180, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <path
          d="M 145 40 L 165 40 L 155 55 L 165 70 L 145 70 L 155 55 Z"
          fill="#FFC107"
          stroke="#F57C00"
          strokeWidth="2"
        />
        <motion.rect
          x="150"
          y="42"
          width="10"
          height="8"
          fill="#F57C00"
          animate={{
            height: [8, 0],
            y: [42, 50],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />
      </motion.g>

      {/* Interrogación parpadeante */}
      <motion.text
        x="100"
        y="185"
        fontSize="24"
        fontWeight="bold"
        fill="#FF9800"
        textAnchor="middle"
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        ?
      </motion.text>
    </svg>
  );
};

export default PendingConfirmationAnimation;
