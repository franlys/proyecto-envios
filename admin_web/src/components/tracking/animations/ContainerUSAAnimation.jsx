import React from 'react';
import { motion } from 'framer-motion';

const ContainerUSAAnimation = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-transparent">
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Contenedor */}
                <rect x="40" y="60" width="160" height="120" rx="4" fill="#2C5F8D" />
                <path d="M40 60H200V180H40V60Z" stroke="#1A3A5A" strokeWidth="4" />

                {/* Puerta Contenedor */}
                <motion.rect
                    x="120" y="60" width="80" height="120" fill="#234B70" stroke="#1A3A5A" strokeWidth="2"
                    animate={{ scaleX: [1, 0.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                    style={{ originX: 1 }}
                />

                {/* Bandera USA */}
                <rect x="50" y="70" width="30" height="20" fill="white" />
                <rect x="50" y="70" width="30" height="20" fill="url(#us-flag)" opacity="0.8" />

                {/* Paquetes entrando */}
                <motion.rect
                    x="220" y="100" width="30" height="30" fill="#D2691E"
                    animate={{ x: [-20, -120], opacity: [1, 0], scale: [1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <motion.rect
                    x="220" y="140" width="30" height="30" fill="#D2691E"
                    animate={{ x: [-20, -120], opacity: [1, 0], scale: [1, 0.8] }}
                    transition={{ duration: 1.5, delay: 0.75, repeat: Infinity, ease: "linear" }}
                />
            </svg>
        </div>
    );
};

export default ContainerUSAAnimation;
