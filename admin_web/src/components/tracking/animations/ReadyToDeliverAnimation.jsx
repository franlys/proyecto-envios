// Animación: Lista para Entregar
import { motion } from 'framer-motion';

const ReadyToDeliverAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Caja lista */}
      <motion.g
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <rect x="70" y="80" width="60" height="60" fill="#4CAF50" rx="4" />
        <path d="M 70 80 L 85 65 L 145 65 L 130 80 Z" fill="#66BB6A" />
        <path d="M 130 80 L 145 65 L 145 125 L 130 140 Z" fill="#388E3C" />
        
        {/* Lazo/ribbon */}
        <rect x="95" y="80" width="10" height="60" fill="#FFD700" opacity="0.8" />
        <rect x="70" y="105" width="60" height="10" fill="#FFD700" opacity="0.8" />
      </motion.g>

      {/* Casa de destino */}
      <g>
        <rect x="140" y="110" width="40" height="35" fill="#FFF59D" stroke="#F57C00" strokeWidth="2" rx="2" />
        <path d="M 135 110 L 160 90 L 185 110 Z" fill="#FF6F00" stroke="#E65100" strokeWidth="2" />
        <rect x="155" y="125" width="10" height="20" fill="#8D6E63" />
      </g>

      {/* Flecha apuntando a la casa */}
      <motion.g
        animate={{
          x: [0, 10, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        <path
          d="M 110 100 L 130 100 L 125 95 M 130 100 L 125 105"
          stroke="#4CAF50"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.g>

      {/* Estrellas de "listo" */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * 90);
        const x = 100 + Math.cos((angle * Math.PI) / 180) * 55;
        const y = 110 + Math.sin((angle * Math.PI) / 180) * 55;

        return (
          <motion.path
            key={i}
            d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z"
            fill="#FFC107"
            initial={{ x, y, scale: 0 }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        );
      })}
    </svg>
  );
};

export default ReadyToDeliverAnimation;
