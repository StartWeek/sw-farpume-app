import { Head } from "@inertiajs/react";

export default function Welcome({ appName }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-6">
                <div className="max-w-4xl w-full">
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-12 border border-white/20">
                        <div className="text-center">
                            <h1 className="text-6xl font-bold text-white mb-4 animate-pulse">
                                Welcome to {appName}
                            </h1>
                            <p className="text-2xl text-white/90 mb-8">
                                Laravel + Inertia.js + React
                            </p>
                            <div className="flex gap-4 justify-center flex-wrap">
                                <a
                                    href="https://laravel.com/docs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    Laravel Docs
                                </a>
                                <a
                                    href="https://inertiajs.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg border-2 border-white/30"
                                >
                                    Inertia.js Docs
                                </a>
                                <a
                                    href="https://react.dev"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    React Docs
                                </a>
                            </div>
                        </div>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                                <div className="text-4xl mb-4">🚀</div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    Fast Development
                                </h3>
                                <p className="text-white/80">
                                    Build modern SPAs with the power of Laravel
                                    backend
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                                <div className="text-4xl mb-4">⚡</div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    No API Required
                                </h3>
                                <p className="text-white/80">
                                    Inertia.js bridges Laravel and React
                                    seamlessly
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                                <div className="text-4xl mb-4">💎</div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    Modern Stack
                                </h3>
                                <p className="text-white/80">
                                    Vite, React 18, and Tailwind CSS included
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
