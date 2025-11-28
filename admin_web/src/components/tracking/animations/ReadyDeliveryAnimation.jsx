import React from 'react';
import { motion } from 'framer-motion';

const ReadyDeliveryAnimation = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-transparent">
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Casa Fondo */}
                <motion.g animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity }}>
                    <path d="M180 80L210 110H150L180 80Z" fill="#E74C3C" />
                    <rect x="160" y="110" width="40" height="40" fill="#34495E" />
                </motion.g>

                {/* Paquete */}
                <motion.g
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <rect x="60" y="100" width="100" height="80" rx="4" fill="#D2691E" stroke="#FFD700" strokeWidth="2" />
                    <rect x="105" y="100" width="10" height="80" fill="#4CAF50" />
                </motion.g>

                {/* Clipboard */}
                <rect x="130" y="60" width="60" height="80" rx="2" fill="white" stroke="#BDC3C7" strokeWidth="2" />
                <rect x="145" y="55" width="30" height="10" rx="2" fill="#BDC3C7" />

                {/* Checks */}
                <motion.path d="M140 80L145 85L155 75" stroke="#4CAF50" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.5 }} />
                <motion.path d="M140 100L145 105L155 95" stroke="#4CAF50" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 0.5 }} />
                <motion.path d="M140 120L145 125L155 115" stroke="#4CAF50" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.5, duration: 0.5 }} />
            </svg>
        </div>
    );
};

export default ReadyDeliveryAnimation;
