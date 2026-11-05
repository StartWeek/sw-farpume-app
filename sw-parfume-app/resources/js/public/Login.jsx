import { Head, useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { IconArrowRight, IconDroplet, IconEye, IconEyeOff } from "@tabler/icons-react";
import Button from "@/components/common/Button";
import { useThemeStore } from "@/store/themeStore";
import releaseVersion from "../../../version.json";
import "./Login.css";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const { appSettings, appVersion } = usePage().props;
    const primaryColor = useThemeStore((state) => state.primaryColor);
    const buttonTextColor = primaryTextColor(primaryColor);
    const appName = appSettings?.app_name || "Manajemen Parfum";
    const loginLogoSrc = appSettings?.login_logo_path || appSettings?.logo_path || "/favicon.svg?v=studio-blue-1";

    useEffect(() => {
        if (appSettings) useThemeStore.getState().init(appSettings);
    }, [appSettings]);

    const { data, setData, post, processing, errors } = useForm({
        login: "",
        password: "",
        remember: false,
    });

    const handleSubmit = (event) => {
        event.preventDefault();
        if (processing) return;
        post("/login", { onFinish: () => setData("password", "") });
    };

    return (
        <>
            <Head title="Masuk">
                <meta name="theme-color" content={primaryColor} />
                <meta name="application-name" content={appName} />
            </Head>
            <main className="studio-login">
                <div className="studio-login__art" aria-hidden="true">
                    <div className="studio-login__ring studio-login__ring--outer" />
                    <div className="studio-login__ring" />
                    <div className="studio-login__shadow" />
                    <div className="studio-login__bottle">
                        <div className="studio-login__cap" />
                        <div className="studio-login__neck" />
                        <div className="studio-login__glass">
                            <div className="studio-login__liquid" />
                            <div className="studio-login__label"><IconDroplet size={25} stroke={1.25} /></div>
                        </div>
                    </div>
                </div>

                <section className="studio-login__panel" aria-labelledby="login-heading">
                    <div className="studio-login__form">
                        <div className="studio-login__mark">
                            <img src={loginLogoSrc} alt="" />
                        </div>
                        <h1 id="login-heading">Masuk ke akun</h1>
                        <p className="studio-login__intro">Silakan gunakan akun yang telah terdaftar.</p>

                        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={processing}>
                            <LoginField
                                id="login-username"
                                name="login"
                                label="Username"
                                type="text"
                                value={data.login}
                                onChange={(event) => setData("login", event.target.value)}
                                error={errors.login}
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                disabled={processing}
                            />
                            <LoginField
                                id="login-password"
                                name="password"
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                value={data.password}
                                onChange={(event) => setData("password", event.target.value)}
                                error={errors.password}
                                autoComplete="current-password"
                                rightIcon={showPassword ? IconEyeOff : IconEye}
                                rightIconLabel={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                rightIconPressed={showPassword}
                                onRightIconClick={() => setShowPassword((value) => !value)}
                                disabled={processing}
                            />
                            <label className="flex min-h-10 w-fit cursor-pointer items-center gap-2.5 text-sm text-muted">
                                <input type="checkbox" name="remember" checked={data.remember} disabled={processing} onChange={(event) => setData("remember", event.target.checked)} className="size-4 rounded border-stroke accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
                                Ingat saya
                            </label>
                            <Button type="submit" loading={processing} fullWidth icon={IconArrowRight} iconPosition="right" className="studio-login__submit" style={{ color: buttonTextColor, "--studio-button-shade": buttonTextColor === "#000000" ? "#ffffff" : "#000000" }}>
                                Masuk
                            </Button>
                        </form>
                        {/* <p className="studio-login__help">Butuh akses? Hubungi administrator.</p> */}
                        <p className="studio-login__version">
                            Backend v{appVersion?.backend || "—"} · Frontend v{releaseVersion.frontend}
                        </p>
                    </div>
                </section>
            </main>
        </>
    );
}

function primaryTextColor(color) {
    const hex = /^#[0-9a-f]{6}$/i.test(color) ? color : "#2563EB";
    const rgb = hex.slice(1).match(/.{2}/g).map((channel) => {
        const value = parseInt(channel, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? "#000000" : "#ffffff";
}

function LoginField({ id, label, rightIcon: RightIcon, rightIconLabel, rightIconPressed, onRightIconClick, error, ...props }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-main">{label}</label>
            <div className="group relative">
                <input
                    {...props}
                    id={id}
                    required
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    placeholder={label === "Username" ? "Masukkan username" : "Masukkan password"}
                    className={`studio-login__input w-full rounded-[9px] border bg-card pl-3.5 text-main outline-none transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-muted focus:ring-4 ${RightIcon ? "pr-12" : "pr-3.5"} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/15" : "border-stroke focus:border-primary focus:ring-primary/15"}`}
                />
                {RightIcon && <button type="button" onClick={onRightIconClick} disabled={props.disabled} aria-label={rightIconLabel} aria-pressed={rightIconPressed} aria-controls={id} className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card hover:text-main focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed"><RightIcon size={18} stroke={1.8} aria-hidden="true" /></button>}
            </div>
            {error ? <p id={`${id}-error`} role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
    );
}
