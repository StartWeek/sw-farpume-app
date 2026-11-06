import { motion, useSpring } from 'framer-motion';
import { forwardRef, useEffect, useRef } from 'react';

const prefersReducedMotion =
    typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

/**
 * Luxury Architectural Perfume Flacon (B2B Production Grade).
 * Geometric crystal glass, liquid caustics, metallic atomiser, and interactive light sweep.
 * Accepts `phase`: 'idle' | 'usernameFocus' | 'passwordFocus' | 'loading' | 'success' | 'error'
 */
const PerfumeCharacter = forwardRef(function PerfumeCharacter({ phase = 'idle' }, ref) {
    const innerRef = useRef(null);
    const containerRef = ref || innerRef;

    // 3D Parallax Tilt springs
    const tiltX = useSpring(0, { stiffness: 120, damping: 25 });
    const tiltY = useSpring(0, { stiffness: 120, damping: 25 });
    const glintPos = useSpring(0, { stiffness: 80, damping: 20 });

    // Handle mouse tracking for realistic glass refraction and 3D tilt
    useEffect(() => {
        if (prefersReducedMotion) return;

        const onMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = clamp((e.clientX - cx) / 400, -1, 1);
            const dy = clamp((e.clientY - cy) / 400, -1, 1);

            // Subtle rotation in degrees
            tiltX.set(-dy * 10);
            tiltY.set(dx * 12);
            glintPos.set(dx * 35);
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        return () => window.removeEventListener('mousemove', onMove);
    }, [containerRef, glintPos, tiltX, tiltY]);

    const isLoading = phase === 'loading';
    const isSuccess = phase === 'success';
    const isError = phase === 'error';
    const isPassword = phase === 'passwordFocus';
    const isUsername = phase === 'usernameFocus';

    // Atomizer nozzle press animation during submit
    const nozzleAnimate = prefersReducedMotion
        ? { y: 0 }
        : isLoading || isSuccess
        ? { y: [0, 8, 2, 7, 0], transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } }
        : { y: 0, transition: { type: 'spring', stiffness: 220, damping: 20 } };

    // Floating idle breathing animation
    const floatAnimate = prefersReducedMotion ? {} : {
        y: isLoading ? [0, -4, 0] : [0, -8, 0],
        transition: {
            duration: isLoading ? 0.8 : 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'loop',
        },
    };

    // Micro shake on error
    const shakeAnimate = isError
        ? { x: [-6, 6, -5, 5, -2, 2, 0], transition: { duration: 0.45 } }
        : { x: 0 };

    return (
        <div ref={containerRef} className="pfc-wrap" aria-hidden="true">
            <motion.div
                animate={floatAnimate}
                style={{
                    perspective: 900,
                    transformStyle: 'preserve-3d',
                }}
            >
                <motion.div
                    animate={shakeAnimate}
                    style={{
                        rotateX: tiltX,
                        rotateY: tiltY,
                        transformOrigin: 'center bottom',
                    }}
                >
                    <svg
                        viewBox="0 0 160 320"
                        className="pfc-svg"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            {/* Crystal Glass Edge Gradient */}
                            <linearGradient id="lux-glass-rim" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
                                <stop offset="15%" stopColor="rgba(148,163,184,0.30)" />
                                <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                                <stop offset="85%" stopColor="rgba(148,163,184,0.30)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0.70)" />
                            </linearGradient>

                            {/* Internal Glass Body Gradient */}
                            <linearGradient id="lux-glass-body" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={isPassword ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.14)"} />
                                <stop offset="40%" stopColor={isPassword ? "rgba(30,41,59,0.55)" : "rgba(224,242,254,0.08)"} />
                                <stop offset="100%" stopColor={isPassword ? "rgba(15,23,42,0.80)" : "rgba(186,230,253,0.18)"} />
                            </linearGradient>

                            {/* Golden Luxury Fragrance Liquid */}
                            <linearGradient id="lux-liquid" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={isError ? "rgba(239,68,68,0.75)" : "rgba(245,158,11,0.78)"} />
                                <stop offset="45%" stopColor={isError ? "rgba(220,38,38,0.88)" : "rgba(217,119,6,0.88)"} />
                                <stop offset="100%" stopColor={isError ? "rgba(185,28,28,0.92)" : "rgba(180,83,9,0.92)"} />
                            </linearGradient>

                            {/* Liquid Surface Horizon Glow */}
                            <linearGradient id="lux-liquid-surface" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(254,243,199,0.9)" />
                                <stop offset="50%" stopColor="rgba(255,255,255,0.95)" />
                                <stop offset="100%" stopColor="rgba(254,243,199,0.85)" />
                            </linearGradient>

                            {/* Brushed Champagne Gold Metallic Cap */}
                            <linearGradient id="lux-cap" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#78603c" />
                                <stop offset="25%" stopColor="#d4af37" />
                                <stop offset="50%" stopColor="#fef3c7" />
                                <stop offset="75%" stopColor="#c59b27" />
                                <stop offset="100%" stopColor="#634f31" />
                            </linearGradient>

                            {/* Deep Flacon Shadow */}
                            <radialGradient id="lux-shadow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
                                <stop offset="60%" stopColor="rgba(0,0,0,0.18)" />
                                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                            </radialGradient>

                            {/* Clip path for the heavy flacon inner chamber */}
                            <clipPath id="lux-inner-chamber">
                                <rect x="26" y="96" width="108" height="152" rx="14" />
                            </clipPath>
                        </defs>

                        {/* Ambient Floor Shadow */}
                        <ellipse cx="80" cy="304" rx="58" ry="11" fill="url(#lux-shadow)" />

                        {/* ── ATOMIZER NOZZLE & COLLAR ── */}
                        <motion.g animate={nozzleAnimate}>
                            {/* Atomizer Inner Neck Stem */}
                            <rect x="74" y="24" width="12" height="20" rx="2" fill="#94a3b8" />

                            {/* Atomizer Actuator Cap (with spray opening at x=106, y=16) */}
                            <rect x="62" y="8" width="36" height="24" rx="5" fill="url(#lux-cap)" />
                            {/* Beveled Top Edge */}
                            <rect x="64" y="10" width="32" height="4" rx="2" fill="rgba(255,255,255,0.45)" />
                            {/* Spray Orifice Tip */}
                            <rect x="94" y="14" width="12" height="11" rx="3" fill="#634f31" />
                            <circle cx="106" cy="19.5" r="2.2" fill="#0f172a" />
                        </motion.g>

                        {/* Heavy Metallic Collar Ring */}
                        <rect x="48" y="44" width="64" height="16" rx="4" fill="url(#lux-cap)" />
                        <rect x="52" y="46" width="56" height="2.5" rx="1" fill="rgba(255,255,255,0.45)" />

                        {/* ── CRYSTAL GLASS FLACON BASE ── */}
                        {/* Outer Glass Bevel (Thick Solid Crystal Silhouette) */}
                        <rect
                            x="18"
                            y="70"
                            width="124"
                            height="198"
                            rx="18"
                            fill="url(#lux-glass-body)"
                            stroke="url(#lux-glass-rim)"
                            strokeWidth="2.5"
                        />

                        {/* Thick Solid Crystal Glass Base (Bottom Heavy Luxury Glass) */}
                        <path
                            d="M 20 236 L 140 236 C 140 254 132 266 118 266 L 42 266 C 28 266 20 254 20 236 Z"
                            fill="rgba(255,255,255,0.12)"
                        />
                        <line x1="26" y1="236" x2="134" y2="236" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />

                        {/* ── INNER LIQUID CHAMBER ── */}
                        <g clipPath="url(#lux-inner-chamber)">
                            {/* Translucent Dip Tube */}
                            <rect x="78" y="58" width="4" height="195" rx="2" fill="rgba(255,255,255,0.45)" />
                            <line x1="80" y1="58" x2="80" y2="250" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />

                            {/* Fragrance Liquid Fill */}
                            <motion.rect
                                x="24"
                                y="144"
                                width="112"
                                height="110"
                                fill="url(#lux-liquid)"
                                animate={{
                                    y: isUsername ? [142, 146, 143] : 144,
                                }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            />

                            {/* Liquid Meniscus Shimmer Line */}
                            <motion.ellipse
                                cx="80"
                                cy="144"
                                rx="54"
                                ry="4.5"
                                fill="url(#lux-liquid-surface)"
                                animate={{
                                    rx: isUsername ? [53, 55, 53] : 54,
                                }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            />

                            {/* Micro Liquid Bubbles / Sparkles inside */}
                            <circle cx="56" cy="180" r="2" fill="rgba(255,255,255,0.4)" />
                            <circle cx="104" cy="200" r="2.5" fill="rgba(255,255,255,0.3)" />
                            <circle cx="68" cy="220" r="1.5" fill="rgba(255,255,255,0.35)" />
                        </g>

                        {/* ── MINIMALIST LUXURY EMBOSSED LABEL ── */}
                        <g opacity="0.88">
                            {/* Outer Foil Border */}
                            <rect
                                x="38"
                                y="104"
                                width="84"
                                height="70"
                                rx="4"
                                fill="rgba(15,23,42,0.45)"
                                stroke="rgba(212,175,55,0.55)"
                                strokeWidth="1"
                            />
                            {/* Inner Geometric Hairline */}
                            <rect
                                x="42"
                                y="108"
                                width="76"
                                height="62"
                                rx="2"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="0.8"
                            />
                            {/* Luxury Abstract Insignia Monogram */}
                            <circle cx="80" cy="126" r="9" fill="none" stroke="rgba(212,175,55,0.85)" strokeWidth="1" />
                            <path d="M 76 126 L 84 126 M 80 122 L 80 130" stroke="rgba(212,175,55,0.85)" strokeWidth="1" />
                            {/* Geometric Clean Label Text Lines */}
                            <rect x="54" y="145" width="52" height="2" rx="1" fill="rgba(255,255,255,0.7)" />
                            <rect x="62" y="153" width="36" height="1.5" rx="0.75" fill="rgba(212,175,55,0.6)" />
                        </g>

                        {/* ── HIGH-END SPECULAR GLASS HIGHLIGHTS ── */}
                        {/* Left Vertical Crystal Reflection */}
                        <rect x="23" y="76" width="6" height="175" rx="3" fill="rgba(255,255,255,0.4)" />
                        <rect x="32" y="80" width="2" height="140" rx="1" fill="rgba(255,255,255,0.2)" />

                        {/* Interactive Dynamic Glint that moves with Mouse Tracking */}
                        <motion.rect
                            y="76"
                            width="8"
                            height="180"
                            rx="4"
                            fill="rgba(255,255,255,0.3)"
                            style={{ x: glintPos }}
                            initial={{ x: 60 }}
                        />

                        {/* Right Subtle Reflection */}
                        <rect x="131" y="82" width="4" height="165" rx="2" fill="rgba(255,255,255,0.18)" />
                    </svg>
                </motion.div>
            </motion.div>
        </div>
    );
});

export default PerfumeCharacter;
