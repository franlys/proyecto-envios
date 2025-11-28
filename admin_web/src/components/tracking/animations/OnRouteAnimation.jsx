// Animación: En Ruta
import { motion } from 'framer-motion';

const OnRouteAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Camión en movimiento */}
      <motion.g
        animate={{
          x: [0, 20, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Cabina */}
        <rect x="70" y="90" width="30" height="30" fill="#2196F3" rx="3" />
        <rect x="75" y="95" width="10" height="10" fill="#64B5F6" rx="1" />
        
        {/* Contenedor */}
        <rect x="100" y="85" width="45" height="35" fill="#1976D2" rx="3" />
        
        {/* Ruedas animadas */}
        <motion.circle
          cx="85"
          cy="125"
          r="8"
          fill="#333"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <circle cx="85" cy="125" r="3" fill="#666" />
        
        <motion.circle
          cx="130"
          cy="125"
          r="8"
          fill="#333"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <circle cx="130" cy="125" r="3" fill="#666" />
      </motion.g>

      {/* Carretera */}
      <line x1="20" y1="135" x2="180" y2="135" stroke="#999" strokeWidth="3" />
      
      {/* Líneas de la carretera (movimiento) */}
      {[0, 1, 2, 3].map((i) => (
        <motion.line
          key={i}
          x1={40 + i * 40}
          y1="135"
          x2={55 + i * 40}
          y2="135"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{
            x: [-20, 20],
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Nubes de velocidad */}
      {[0, 1].map((i) => (
        <motion.ellipse
          key={i}
          cx={55 - i * 10}
          cy={95 + i * 10}
          rx="12"
          ry="6"
          fill="#E3F2FD"
          animate={{
            x: [-20, -40],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Pin de destino */}
      <motion.g
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        <path
          d="M 165 50 C 165 40 155 40 155 50 C 155 55 165 65 165 65 C 165 65 175 55 175 50 C 175 40 165 40 165 50 Z"
          fill="#F44336"
          stroke="#C62828"
          strokeWidth="1"
        />
        <circle cx="165" cy="50" r="3" fill="#fff" />
      </motion.g>
    </svg>
  );
};

export default OnRouteAnimation;
