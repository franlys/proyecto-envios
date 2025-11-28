// Animación: Incompleta USA
import { motion } from 'framer-motion';

const IncompleteUSAAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <motion.g
        animate={{
          rotate: [0, -2, 2, -2, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <rect x="70" y="100" width="60" height="40" fill="#FF9800" rx="4" />

        <motion.path
          d="M 70 100 L 60 85 L 120 85 L 110 100"
          fill="#FFB74D"
          animate={{
            y: [-5, 0, -5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        />
        <motion.path
          d="M 130 100 L 140 85 L 120 85 L 110 100"
          fill="#FFA726"
          animate={{
            y: [-3, 2, -3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.2,
          }}
        />
      </motion.g>

      <motion.g
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
        }}
      >
        <path
          d="M 150 50 L 170 80 L 130 80 Z"
          fill="#FFC107"
          stroke="#F57C00"
          strokeWidth="2"
        />
        <line x1="150" y1="60" x2="150" y2="70" stroke="#F57C00" strokeWidth="3" strokeLinecap="round" />
        <circle cx="150" cy="75" r="2" fill="#F57C00" />
      </motion.g>

      {[0, 1].map((i) => (
        <motion.rect
          key={i}
          x={40 + i * 25}
          y={135}
          width="18"
          height="18"
          fill="none"
          stroke="#FF9800"
          strokeWidth="2"
          strokeDasharray="3 3"
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
          rx="2"
        />
      ))}
    </svg>
  );
};

export default IncompleteUSAAnimation;
