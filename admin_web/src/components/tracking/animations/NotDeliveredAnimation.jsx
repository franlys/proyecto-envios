// Animación: No Entregada
import { motion } from 'framer-motion';

const NotDeliveredAnimation = ({ size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <motion.g animate={{ rotate: [0, -5, 5, -5, 0], x: [0, -2, 2, -2, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        <rect x="70" y="90" width="60" height="60" fill="#F44336" rx="4" opacity="0.8" />
        <path d="M 70 90 L 85 75 L 145 75 L 130 90 Z" fill="#E57373" />
        <path d="M 130 90 L 145 75 L 145 135 L 130 150 Z" fill="#C62828" />
      </motion.g>
      <motion.g initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3, type: "spring", repeat: Infinity, repeatDelay: 3 }}>
        <circle cx="100" cy="50" r="30" fill="#F44336" />
        <line x1="85" y1="35" x2="115" y2="65" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <line x1="115" y1="35" x2="85" y2="65" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </motion.g>
      <text x="100" y="180" fontSize="14" fontWeight="bold" fill="#F44336" textAnchor="middle">NO ENTREGADO</text>
    </svg>
  );
};

export default NotDeliveredAnimation;
