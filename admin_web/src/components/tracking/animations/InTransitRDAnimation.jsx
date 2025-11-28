// Animación: En Tránsito a RD
import { motion } from 'framer-motion';

const InTransitRDAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Olas del mar */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M ${20 + i * 60} 140 Q ${40 + i * 60} 135 ${60 + i * 60} 140 T ${100 + i * 60} 140`}
          stroke="#64B5F6"
          strokeWidth="3"
          fill="none"
          animate={{
            x: [-20, 20],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Barco/nave (contenedor marítimo) */}
      <motion.g
        animate={{
          y: [0, -8, 0],
          rotate: [-1, 1, -1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Casco del barco */}
        <path
          d="M 60 100 L 140 100 L 135 120 L 65 120 Z"
          fill="#1976D2"
          stroke="#0D47A1"
          strokeWidth="2"
        />

        {/* Contenedor en el barco */}
        <rect x="80" y="70" width="40" height="30" fill="#2196F3" stroke="#1565C0" strokeWidth="2" rx="2" />

        {/* Chimenea */}
        <rect x="130" y="85" width="8" height="15" fill="#F44336" rx="1" />
      </motion.g>

      {/* Flechas de dirección (USA → RD) */}
      <motion.g
        animate={{
          x: [0, 10, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        <path
          d="M 30 50 L 50 50 L 45 45 M 50 50 L 45 55"
          stroke="#2196F3"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.g>

      {/* Sol (día) */}
      <motion.circle
        cx="170"
        cy="30"
        r="15"
        fill="#FDD835"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />

      {/* Rayos del sol */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * 90);
        const x1 = 170 + Math.cos((angle * Math.PI) / 180) * 18;
        const y1 = 30 + Math.sin((angle * Math.PI) / 180) * 18;
        const x2 = 170 + Math.cos((angle * Math.PI) / 180) * 25;
        const y2 = 30 + Math.sin((angle * Math.PI) / 180) * 25;

        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#FDD835"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        );
      })}

      {/* Texto indicador */}
      <text x="100" y="180" fontSize="14" fontWeight="bold" fill="#2196F3" textAnchor="middle">
        USA → RD
      </text>
    </svg>
  );
};

export default InTransitRDAnimation;
