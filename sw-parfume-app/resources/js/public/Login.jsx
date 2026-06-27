import { Head, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    IconArrowRight,
    IconEye,
    IconEyeOff,
    IconLock,
    IconUser,
} from "@tabler/icons-react";
import Button from "@/components/common/Button";
import PerfumeBottleImg from "@/assets/images/perfume-bottle.svg";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const { appSettings } = usePage().props;
    const loginLogoSrc =
        appSettings?.login_logo_path ||
        appSettings?.logo_path ||
        PerfumeBottleImg;

    const { data, setData, post, processing, errors } = useForm("Login", {
        login: "",
        password: "",
        remember: false,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await post("/login");
        } catch (err) {
            console.log("Login error:", err);
        }
    };

    return (
        <>
            <Head title="Login" />
            <main className="min-h-screen bg-[#edf2ef] text-slate-900">
                <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,#edf2ef_0%,#f8faf9_48%,#dce8e3_100%)]" />
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(16,45,43,0.08),transparent)]" />

                    <div className="relative grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_32px_90px_-42px_rgba(16,45,43,0.55)] lg:grid-cols-[0.92fr_1.08fr]">
                        <section className="relative hidden min-h-[560px] overflow-hidden bg-[#102d2b] lg:block">
                            <div className="absolute inset-0 opacity-25">
                                <div className="h-full w-full bg-[linear-gradient(135deg,#ffffff24_1px,transparent_1px),linear-gradient(45deg,#ffffff12_1px,transparent_1px)] bg-[size:36px_36px]" />
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,transparent,#071f1d)]" />

                            <div className="relative flex h-full items-center justify-center p-10">
                                <div className="w-full max-w-sm">
                                    <div className="mx-auto mb-10 flex h-64 w-64 items-center justify-center">
                                        <img
                                            src={loginLogoSrc}
                                            alt=""
                                            className="h-full w-full object-contain drop-shadow-[0_28px_42px_rgba(0,0,0,0.28)]"
                                        />
                                    </div>

                                </div>
                            </div>
                        </section>

                        <section className="flex min-h-[560px] items-center justify-center p-6 sm:p-10">
                            <div className="w-full max-w-sm">
                                <div className="mb-8 flex items-center justify-between">
                                    <h1 className="text-3xl font-black tracking-normal text-slate-950">
                                        Login
                                    </h1>
                                    <div className="flex size-12 items-center justify-center rounded-lg border border-emerald-900/10 bg-[#f8faf9] shadow-[0_14px_34px_-22px_rgba(16,45,43,0.55)]">
                                        <img
                                            src={loginLogoSrc}
                                            alt="Parfum"
                                            className="h-10 w-10 object-contain"
                                        />
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <LoginField
                                        label="Username"
                                        type="text"
                                        value={data.login}
                                        onChange={(e) => setData("login", e.target.value)}
                                        error={errors.login}
                                        icon={IconUser}
                                        autoComplete="username"
                                    />

                                    <LoginField
                                        label="Password"
                                        type={showPassword ? "text" : "password"}
                                        value={data.password}
                                        onChange={(e) => setData("password", e.target.value)}
                                        error={errors.password}
                                        icon={IconLock}
                                        autoComplete="current-password"
                                        rightIcon={showPassword ? IconEyeOff : IconEye}
                                        onRightIconClick={() => setShowPassword((v) => !v)}
                                    />

                                    <label className="flex w-fit cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(e) =>
                                                setData("remember", e.target.checked)
                                            }
                                            className="size-4 cursor-pointer rounded border-slate-300 text-emerald-800 focus:ring-2 focus:ring-emerald-700"
                                        />
                                        <span className="ml-2 text-sm font-medium text-slate-600">
                                            Ingat saya
                                        </span>
                                    </label>

                                    <Button
                                        type="submit"
                                        loading={processing}
                                        fullWidth
                                        icon={IconArrowRight}
                                        iconPosition="right"
                                        size="md"
                                        className="rounded-lg bg-[#102d2b] py-3.5 text-[15px] font-bold shadow-[0_18px_36px_-22px_rgba(16,45,43,0.95)] hover:bg-[#17413e]"
                                    >
                                        Masuk
                                    </Button>
                                </form>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </>
    );
}

function LoginField({ label, icon: Icon, rightIcon: RightIcon, onRightIconClick, error, ...props }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>
            <div className="relative">
                <Icon
                    size={18}
                    stroke={2}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    {...props}
                    required
                    placeholder={label}
                    className={`h-12 w-full rounded-lg border bg-[#f8faf9] pl-11 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                        RightIcon ? "pr-11" : "pr-4"
                    } ${
                        error
                            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                            : "border-slate-200 focus:border-emerald-800 focus:ring-emerald-900/10"
                    }`}
                />
                {RightIcon && (
                    <button
                        type="button"
                        onClick={onRightIconClick}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <RightIcon size={18} stroke={2} />
                    </button>
                )}
            </div>
            {error ? (
                <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>
            ) : null}
        </div>
    );
}
