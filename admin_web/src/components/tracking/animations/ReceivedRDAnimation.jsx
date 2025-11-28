// Animación: Recibida en RD
import { motion } from 'framer-motion';

const ReceivedRDAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <motion.g
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 4
        }}
      >
        <rect x="50" y="80" width="100" height="80" fill="#4CAF50" stroke="#388E3C" strokeWidth="2" rx="4" />
        <path d="M 40 80 L 100 50 L 160 80 Z" fill="#66BB6A" stroke="#388E3C" strokeWidth="2" />
        <rect x="80" y="120" width="40" height="40" fill="#2E7D32" rx="2" />
        <rect x="60" y="95" width="15" height="15" fill="#A5D6A7" rx="1" />
        <rect x="125" y="95" width="15" height="15" fill="#A5D6A7" rx="1" />
      </motion.g>

      <motion.g
        animate={{
          rotate: [0, 3, 0, -3, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <rect x="150" y="30" width="30" height="20" fill="#fff" stroke="#333" strokeWidth="1" />
        <rect x="163" y="30" width="4" height="20" fill="#002D62" />
        <rect x="150" y="38" width="30" height="4" fill="#002D62" />
        <rect x="150" y="30" width="13" height="8" fill="#CE1126" />
        <rect x="167" y="30" width="13" height="8" fill="#002D62" />
        <rect x="150" y="42" width="13" height="8" fill="#002D62" />
        <rect x="167" y="42" width="13" height="8" fill="#CE1126" />
        <line x1="150" y1="30" x2="150" y2="15" stroke="#666" strokeWidth="2" />
      </motion.g>

      <motion.g
        animate={{
          x: [-30, 0],
          y: [0, 20],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        <rect x="60" y="100" width="25" height="25" fill="#FFB74D" stroke="#F57C00" strokeWidth="2" rx="2" />
      </motion.g>

      <motion.g
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 1.5,
          type: "spring",
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        <circle cx="30" cy="40" r="18" fill="#4CAF50" />
        <path
          d="M 22 40 L 28 46 L 38 34"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.g>
    </svg>
  );
};

export default ReceivedRDAnimation;
