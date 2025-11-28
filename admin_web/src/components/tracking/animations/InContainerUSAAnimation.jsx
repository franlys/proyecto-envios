// Animación: En Contenedor USA
import { motion } from 'framer-motion';

const InContainerUSAAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Contenedor grande */}
      <motion.g
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Contenedor */}
        <rect x="30" y="60" width="140" height="100" fill="#2196F3" rx="4" stroke="#1976D2" strokeWidth="3" />

        {/* Puertas del contenedor */}
        <line x1="100" y1="60" x2="100" y2="160" stroke="#1976D2" strokeWidth="2" />

        {/* Manijas */}
        <rect x="95" y="105" width="10" height="15" fill="#1565C0" rx="2" />
      </motion.g>

      {/* Bandera USA animada */}
      <motion.g
        animate={{
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <rect x="150" y="40" width="30" height="20" fill="#fff" stroke="#333" strokeWidth="1" />
        <rect x="150" y="40" width="12" height="8" fill="#1E3A8A" />
        <line x1="150" y1="48" x2="180" y2="48" stroke="#DC2626" strokeWidth="2" />
        <line x1="150" y1="52" x2="180" y2="52" stroke="#DC2626" strokeWidth="2" />
        <line x1="150" y1="56" x2="180" y2="56" stroke="#DC2626" strokeWidth="2" />

        {/* Asta de bandera */}
        <line x1="150" y1="40" x2="150" y2="20" stroke="#666" strokeWidth="2" />
      </motion.g>

      {/* Cajas dentro del contenedor (múltiples) */}
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          <rect
            x={45 + i * 35}
            y={120 - i * 10}
            width="25"
            height="25"
            fill="#FFB74D"
            stroke="#F57C00"
            strokeWidth="1"
            rx="2"
          />
        </motion.g>
      ))}

      {/* Texto "USA" */}
      <text x="100" y="180" fontSize="16" fontWeight="bold" fill="#2196F3" textAnchor="middle">
        USA
      </text>
    </svg>
  );
};

export default InContainerUSAAnimation;
