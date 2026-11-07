import { useEffect, useRef } from 'react';

const PALETTES = {
    green: [
        'rgba(34,197,94,A)',   // Emerald 500
        'rgba(16,185,129,A)',  // Green 500
        'rgba(74,222,128,A)',  // Lime 400
        'rgba(52,211,153,A)',  // Emerald 400
        'rgba(167,243,208,A)', // Soft mint mist
        'rgba(240,253,244,A)', // Light vapor
        'rgba(255,255,255,A)', // Sparkling white
    ],
    red: [
        'rgba(239,68,68,A)',   // Red 500
        'rgba(220,38,38,A)',   // Red 600
        'rgba(248,113,113,A)', // Coral 400
        'rgba(244,63,94,A)',   // Rose 500
        'rgba(254,202,202,A)', // Soft crimson mist
        'rgba(255,241,242,A)', // Light vapor
        'rgba(255,255,255,A)', // Sparkling white
    ],
};

function mkColor(template, alpha) {
    return template.replace('A', Math.max(0, alpha).toFixed(3));
}

function spawnParticle(ox, oy, palette) {
    // Aerosol spray angles: mostly rightward and expanding upward/downward
    const angle = -Math.PI / 4 + (Math.random() - 0.45) * Math.PI * 0.75;
    const speed = 3.5 + Math.random() * 6.5;
    return {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2.5 + Math.random() * 5.5,
        life: 1.0,
        decay: 0.012 + Math.random() * 0.018,
        color: palette[Math.floor(Math.random() * palette.length)],
        isTrail: Math.random() < 0.4,
    };
}

/**
 * Canvas-based aerosol spray mist effect.
 * Covers the entire viewport with pointer-events: none.
 * Accepts:
 * - active: boolean
 * - type: 'green' | 'red'
 * - originX, originY: starting coordinates of spray nozzle
 */
export default function ParticleCanvas({ active, type = 'green', originX, originY }) {
    const canvasRef = useRef(null);
    const stateRef  = useRef({ particles: [], raf: null, burstTimers: [] });

    useEffect(() => {
        const state = stateRef.current;

        if (!active) {
            cancelAnimationFrame(state.raf);
            state.burstTimers.forEach(clearTimeout);
            state.particles = [];
            state.raf = null;
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const W   = window.innerWidth;
        const H   = window.innerHeight;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const ox = originX || W / 2 + 50;
        const oy = originY || 200;
        const palette = PALETTES[type] || PALETTES.green;

        // Big initial pressurized spray burst
        for (let i = 0; i < 48; i++) {
            state.particles.push(spawnParticle(ox, oy, palette));
        }

        // Secondary billowing mist waves
        state.burstTimers = [
            setTimeout(() => {
                for (let i = 0; i < 30; i++) state.particles.push(spawnParticle(ox, oy, palette));
            }, 120),
            setTimeout(() => {
                for (let i = 0; i < 24; i++) state.particles.push(spawnParticle(ox, oy, palette));
            }, 260),
            setTimeout(() => {
                for (let i = 0; i < 18; i++) state.particles.push(spawnParticle(ox, oy, palette));
            }, 420),
        ];

        const tick = () => {
            ctx.clearRect(0, 0, W, H);
            state.particles = state.particles.filter((p) => p.life > 0.02);

            for (const p of state.particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;   // Gentle gravity
                p.vx *= 0.982;  // Air friction deceleration
                p.life -= p.decay;

                const alpha = p.life;
                const r     = p.isTrail ? p.r * 1.5 : p.r;

                // Main mist particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * alpha, 0, Math.PI * 2);
                ctx.fillStyle = mkColor(p.color, alpha * (p.isTrail ? 0.35 : 0.85));
                ctx.fill();

                // Soft trailing plume
                if (!p.isTrail) {
                    ctx.beginPath();
                    ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, r * alpha * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = mkColor(p.color, alpha * 0.3);
                    ctx.fill();
                }
            }

            state.raf = requestAnimationFrame(tick);
        };

        tick();

        return () => {
            cancelAnimationFrame(state.raf);
            state.burstTimers.forEach(clearTimeout);
            state.particles = [];
        };
    }, [active, type, originX, originY]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 9999,
                display: active ? 'block' : 'none',
            }}
        />
    );
}
