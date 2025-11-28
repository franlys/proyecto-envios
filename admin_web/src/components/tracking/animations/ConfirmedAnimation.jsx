// Animación: Confirmada
import { motion } from 'framer-motion';

const ConfirmedAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Documento confirmado */}
      <motion.g
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        <rect x="60" y="60" width="80" height="100" fill="#fff" stroke="#4CAF50" strokeWidth="3" rx="4" />
        <line x1="75" y1="80" x2="125" y2="80" stroke="#66BB6A" strokeWidth="2" />
        <line x1="75" y1="95" x2="115" y2="95" stroke="#A5D6A7" strokeWidth="2" />
        <line x1="75" y1="110" x2="120" y2="110" stroke="#A5D6A7" strokeWidth="2" />
      </motion.g>

      {/* Sello de "Confirmado" */}
      <motion.g
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.3,
          type: "spring",
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        <circle cx="110" cy="120" r="25" fill="none" stroke="#4CAF50" strokeWidth="4" strokeDasharray="5 3" />
        <text x="110" y="125" fontSize="12" fontWeight="bold" fill="#4CAF50" textAnchor="middle">OK</text>
      </motion.g>

      {/* Checkmarks volando */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M 0 0 L 4 4 L 10 -2"
          stroke="#4CAF50"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ x: 100, y: 100, opacity: 0 }}
          animate={{
            x: [100, 120 + i * 15],
            y: [100, 40 - i * 10],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
          }}
        />
      ))}
    </svg>
  );
};

export default ConfirmedAnimation;
