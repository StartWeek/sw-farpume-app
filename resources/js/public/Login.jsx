import { Head, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
    IconArrowRight,
    IconEye,
    IconEyeOff,
} from '@tabler/icons-react';
import { useThemeStore } from '@/store/themeStore';
import ParticleCanvas from './ParticleCanvas';
import releaseVersion from '../../../version.json';
import './Login.css';

/** Determine readable text color (black or white) for a given hex background. */
function primaryTextColor(color) {
    const hex = /^#[0-9a-f]{6}$/i.test(color) ? color : '#2563EB';
    const rgb = hex.slice(1).match(/.{2}/g).map((c) => {
        const v = parseInt(c, 16) / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
        ? '#000000'
        : '#ffffff';
}

export default function Login() {
    const { appSettings, appVersion } = usePage().props;
    const primaryColor = useThemeStore((s) => s.primaryColor);
    const btnTextColor = primaryTextColor(primaryColor);
    const appName = appSettings?.app_name || 'ERP Parfum';
    const logoSrc = appSettings?.login_logo_path || appSettings?.logo_path || '/favicon.svg?v=studio-blue-1';

    useEffect(() => {
        if (appSettings) useThemeStore.getState().init(appSettings);
    }, [appSettings]);

    // ── Form State ────────────────────────────────────────────
    const [data, setData] = useState({
        login: '',
        password: '',
        remember: false,
    });
    const [processing, setProcessing] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [throttleMsg, setThrottleMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ── Particle Aerosol Mist State ───────────────────────────
    const [sprayActive, setSprayActive] = useState(false);
    const [sprayType, setSprayType] = useState('green'); // 'green' | 'red'
    const [sprayOrigin, setSprayOrigin] = useState({ x: 0, y: 0 });
    const tipRef = useRef(null);

    const triggerSpray = (type) => {
        if (tipRef.current) {
            const rect = tipRef.current.getBoundingClientRect();
            setSprayOrigin({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            });
        } else {
            setSprayOrigin({
                x: window.innerWidth / 2 + 50,
                y: 200,
            });
        }
        setSprayType(type);
        setSprayActive(true);
        setTimeout(() => {
            setSprayActive(false);
        }, 1800);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        setThrottleMsg('');
        setFormErrors({});

        try {
            // Get XSRF token from cookie if present
            const xsrfToken = document.cookie
                .split('; ')
                .find((row) => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1];

            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(xsrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfToken) } : {}),
                },
                body: JSON.stringify({
                    login: data.login,
                    password: data.password,
                    remember: data.remember,
                }),
                credentials: 'same-origin',
            });

            if (response.ok || response.redirected) {
                // SEMPROTAN HIJAU: Login Berhasil!
                triggerSpray('green');

                // Beri jeda 1.2 detik agar user dapat melihat semprotan kabut hijau sebelum pindah halaman
                setTimeout(() => {
                    window.location.href = '/admin/dashboard';
                }, 1200);
            } else if (response.status === 429) {
                // SEMPROTAN MERAH: Rate Limited
                triggerSpray('red');
                setThrottleMsg('Terlalu banyak percobaan. Harap tunggu 1 menit.');
                setProcessing(false);
            } else {
                // SEMPROTAN MERAH: Login Gagal
                triggerSpray('red');
                const resJson = await response.json().catch(() => ({}));
                const errMsg =
                    resJson?.errors?.login?.[0] ||
                    resJson?.message ||
                    'Username atau password yang Anda masukkan salah.';
                setFormErrors({ login: errMsg });
                setProcessing(false);
            }
        } catch (err) {
            triggerSpray('red');
            setFormErrors({ login: 'Terjadi gangguan koneksi. Silakan coba lagi.' });
            setProcessing(false);
        }
    };

    const displayError = throttleMsg || formErrors.login;

    return (
        <>
            <Head title="Masuk">
                <meta name="theme-color" content="#0f172a" />
                <meta name="application-name" content={appName} />
            </Head>

            <main className="p-bottle-root">
                {/* Particle Aerosol Mist Spray (Green on Success, Red on Error) */}
                <ParticleCanvas
                    active={sprayActive}
                    type={sprayType}
                    originX={sprayOrigin.x}
                    originY={sprayOrigin.y}
                />

                <div className="p-bottle-stage">

                    {/* ══════ SILUET BOTOL PARFUM SEBAGAI CONTAINER ══════ */}
                    <div className="p-bottle-container">
                        
                        {/* 1. Atomizer Cap / Tutup Botol Parfum */}
                        <motion.div 
                            className="p-bottle-cap"
                            animate={processing || sprayActive ? { y: [0, 5, 2, 5, 0] } : { y: 0 }}
                            transition={{ duration: 0.5, repeat: processing ? Infinity : 0 }}
                        >
                            <div className="p-bottle-spray-tip" ref={tipRef} />
                            <div className="p-bottle-cap-band" />
                        </motion.div>

                        {/* 2. Leher Botol (Neck Ring) */}
                        <div className="p-bottle-neck" />

                        {/* 3. Badan Botol Utama (Card Form Login) */}
                        <div className="p-bottle-body">
                            {/* Beveled Shoulder Accents */}
                            <div className="p-bottle-shoulder-left" />
                            <div className="p-bottle-shoulder-right" />

                            {/* Brand Header */}
                            <div className="p-bottle-brand">
                                <div className="p-bottle-logo">
                                    <img src={logoSrc} alt={appName} />
                                </div>
                                <h1 className="p-bottle-title">{appName}</h1>
                                <p className="p-bottle-subtitle">Sistem Manajemen & Operasional</p>
                            </div>

                            {/* Error Alert */}
                            <AnimatePresence>
                                {displayError && (
                                    <motion.div
                                        role="alert"
                                        className="p-bottle-error"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <span>{displayError}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="p-bottle-form" noValidate>
                                {/* Username Field */}
                                <div className="p-bottle-field">
                                    <label htmlFor="login" className="p-bottle-label">
                                        Username
                                    </label>
                                    <input
                                        id="login"
                                        type="text"
                                        name="login"
                                        value={data.login}
                                        onChange={(e) => setData((prev) => ({ ...prev, login: e.target.value }))}
                                        placeholder="Masukkan username"
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        disabled={processing}
                                        required
                                        autoFocus
                                        className={`p-bottle-input${displayError ? ' p-bottle-input--error' : ''}`}
                                    />
                                </div>

                                {/* Password Field */}
                                <div className="p-bottle-field">
                                    <label htmlFor="password" className="p-bottle-label">
                                        Password
                                    </label>
                                    <div className="p-bottle-pw-wrap">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={data.password}
                                            onChange={(e) => setData((prev) => ({ ...prev, password: e.target.value }))}
                                            placeholder="Masukkan password"
                                            autoComplete="current-password"
                                            disabled={processing}
                                            required
                                            className={`p-bottle-input${displayError ? ' p-bottle-input--error' : ''}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            disabled={processing}
                                            aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                                            className="p-bottle-eye"
                                        >
                                            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me */}
                                <label className="p-bottle-remember">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData((prev) => ({ ...prev, remember: e.target.checked }))}
                                        disabled={processing}
                                        className="p-bottle-checkbox"
                                    />
                                    <span>Ingat saya</span>
                                </label>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="p-bottle-submit"
                                    style={{
                                        backgroundColor: processing ? '#475569' : primaryColor,
                                        color: btnTextColor,
                                    }}
                                >
                                    {processing ? (
                                        <span className="p-bottle-btn-inner">
                                            <span className="p-bottle-spinner" />
                                            Memverifikasi...
                                        </span>
                                    ) : (
                                        <span className="p-bottle-btn-inner">
                                            Masuk
                                            <IconArrowRight size={18} />
                                        </span>
                                    )}
                                </button>
                            </form>

                            {/* Solid Crystal Bottom Base Rim */}
                            <div className="p-bottle-base-rim" />
                        </div>
                    </div>

                    {/* Version */}
                    <div className="p-bottle-footer">
                        <span>v{releaseVersion.frontend}</span>
                        <span>&bull;</span>
                        <span>Backend v{appVersion?.backend || '—'}</span>
                    </div>
                </div>
            </main>
        </>
    );
}
