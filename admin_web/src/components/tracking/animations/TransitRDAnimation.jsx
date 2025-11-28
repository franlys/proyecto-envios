import React from 'react';
import { motion } from 'framer-motion';

const TransitRDAnimation = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-transparent overflow-hidden">
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cielo/Fondo */}
                <rect width="240" height="240" fill="transparent" />

                {/* Nubes */}
                <motion.g
                    animate={{ x: [-20, -100] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                    <path d="M180 60C180 50 190 40 200 40C210 40 220 50 220 60H180Z" fill="#ECF0F1" />
                    <path d="M40 50C40 40 50 30 60 30C70 30 80 40 80 50H40Z" fill="#ECF0F1" />
                </motion.g>

                {/* Barco */}
                <motion.g
                    animate={{ y: [0, 5, 0], rotate: [0, 1, 0, -1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                    {/* Casco */}
                    <path d="M60 140L80 180H200L220 140H60Z" fill="#34495E" />

                    {/* Contenedores */}
                    <rect x="90" y="110" width="40" height="30" fill="#2196F3" />
                    <rect x="140" y="110" width="40" height="30" fill="#D2691E" />
                    <rect x="115" y="80" width="40" height="30" fill="#2C5F8D" />
                </motion.g>

                {/* Olas */}
                <motion.path
                    d="M0 180Q30 170 60 180T120 180T180 180T240 180V240H0V180Z"
                    fill="#3498DB"
                    animate={{
                        d: [
                            "M0 180Q30 170 60 180T120 180T180 180T240 180V240H0V180Z",
                            "M0 180Q30 190 60 180T120 180T180 180T240 180V240H0V180Z",
                            "M0 180Q30 170 60 180T120 180T180 180T240 180V240H0V180Z"
                        ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
            </svg>
        </div>
    );
};

export default TransitRDAnimation;
