// Animación: Entregada
import { motion } from 'framer-motion';

const DeliveredAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Caja abierta */}
      <motion.g
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          repeat: Infinity,
          repeatDelay: 4
        }}
      >
        <rect x="70" y="110" width="60" height="40" fill="#4CAF50" rx="4" />
        
        {/* Tapas abiertas */}
        <motion.path
          d="M 70 110 L 60 95 L 120 95 L 110 110"
          fill="#66BB6A"
          animate={{
            y: [-10, -15, -10],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
        <motion.path
          d="M 130 110 L 140 95 L 120 95 L 110 110"
          fill="#81C784"
          animate={{
            y: [-10, -15, -10],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0.2,
          }}
        />
      </motion.g>

      {/* Checkmark gigante */}
      <motion.g
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.5,
          type: "spring",
          stiffness: 200,
          damping: 10,
          repeat: Infinity,
          repeatDelay: 3.5
        }}
      >
        <circle cx="100" cy="70" r="35" fill="#4CAF50" />
        <motion.path
          d="M 82 70 L 95 83 L 118 57"
          stroke="#fff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.7,
            repeat: Infinity,
            repeatDelay: 3.5
          }}
        />
      </motion.g>

      {/* Confetti celebration */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 360) / 12;
        const distance = 60 + (i % 3) * 10;
        const x = 100 + Math.cos((angle * Math.PI) / 180) * distance;
        const y = 70 + Math.sin((angle * Math.PI) / 180) * distance;
        const colors = ['#FFC107', '#FF5722', '#2196F3', '#4CAF50', '#E91E63'];

        return (
          <motion.rect
            key={i}
            width="4"
            height="8"
            rx="1"
            fill={colors[i % colors.length]}
            initial={{ x: 100, y: 70, opacity: 0, rotate: 0 }}
            animate={{
              x,
              y,
              opacity: [0, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 2.5,
              delay: i * 0.05,
            }}
          />
        );
      })}

      {/* Texto "ENTREGADO" */}
      <motion.text
        x="100"
        y="180"
        fontSize="16"
        fontWeight="bold"
        fill="#4CAF50"
        textAnchor="middle"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        ¡ENTREGADO!
      </motion.text>
    </svg>
  );
};

export default DeliveredAnimation;
