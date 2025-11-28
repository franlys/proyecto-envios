// Animación: Pendiente de Recolección
import { motion } from 'framer-motion';

const PendingPickupAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Caja animada (flotando) */}
      <motion.g
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Sombra de la caja */}
        <motion.ellipse
          cx="100"
          cy="160"
          rx="40"
          ry="8"
          fill="#000"
          opacity="0.1"
          animate={{
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Caja 3D */}
        <rect x="70" y="80" width="60" height="60" fill="#FFA500" rx="4" />
        <path d="M 70 80 L 85 65 L 145 65 L 130 80 Z" fill="#FFB833" />
        <path d="M 130 80 L 145 65 L 145 125 L 130 140 Z" fill="#FF8C00" />

        {/* Cinta de embalaje */}
        <rect x="70" y="105" width="60" height="8" fill="#FFD700" opacity="0.6" />
        <rect x="95" y="80" width="10" height="60" fill="#FFD700" opacity="0.6" />
      </motion.g>

      {/* Reloj de espera (girando) */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <circle cx="150" cy="50" r="15" fill="#fff" stroke="#FFA500" strokeWidth="2" />
        <line x1="150" y1="50" x2="150" y2="42" stroke="#FFA500" strokeWidth="2" strokeLinecap="round" />
        <line x1="150" y1="50" x2="155" y2="50" stroke="#FFA500" strokeWidth="2" strokeLinecap="round" />
      </motion.g>

      {/* Puntos de espera */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={40 + i * 15}
          cy="180"
          r="4"
          fill="#FFA500"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </svg>
  );
};

export default PendingPickupAnimation;
