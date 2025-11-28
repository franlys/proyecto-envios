// Animación: Recolectada
import { motion } from 'framer-motion';

const CollectedAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <motion.g
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        <rect x="70" y="80" width="60" height="60" fill="#4CAF50" rx="4" />
        <path d="M 70 80 L 85 65 L 145 65 L 130 80 Z" fill="#66BB6A" />
        <path d="M 130 80 L 145 65 L 145 125 L 130 140 Z" fill="#388E3C" />
      </motion.g>

      <motion.g
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.3,
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        <motion.path
          d="M 85 110 L 95 120 L 115 95"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.g>

      {[...Array(8)].map((_, i) => {
        const angle = (i * 360) / 8;
        const x = 100 + Math.cos((angle * Math.PI) / 180) * 50;
        const y = 110 + Math.sin((angle * Math.PI) / 180) * 50;

        return (
          <motion.circle
            key={i}
            cx={100}
            cy={110}
            r="3"
            fill="#4CAF50"
            initial={{ cx: 100, cy: 110, opacity: 0 }}
            animate={{
              cx: x,
              cy: y,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 2,
              delay: i * 0.1,
            }}
          />
        );
      })}
    </svg>
  );
};

export default CollectedAnimation;
