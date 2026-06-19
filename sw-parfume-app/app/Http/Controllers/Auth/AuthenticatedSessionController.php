<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthenticatedSessionController extends Controller
{

    /**
     * Display the login view.
     */
    public function create()
    {
        return Inertia::render('public/Login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request)
    {
        $input = $request->validate([
            'login' => ['required'], // bisa email atau no_hp
            'password' => ['required'],
        ]);

        $loginValue = $input['login'];
        $password = $input['password'];


        // Cek login: email, no_hp, atau username
        if (filter_var($loginValue, FILTER_VALIDATE_EMAIL)) {
            $credentials = [
                'email' => $this->encrypt->doEncrypt($loginValue),
                'password' => $password,
            ];
        } elseif (preg_match('/^08[0-9]{8,}$/', $loginValue)) { // simple no_hp pattern
            $credentials = [
                'no_hp' => $this->encrypt->doEncrypt($loginValue),
                'password' => $password,
            ];
        } else {
            $credentials = [
                'username' => $loginValue,
                'password' => $password,
            ];
        }

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            // Ambil user yang login
            $user = Auth::user();
            // Simpan role dan no_hp ke session jika perlu
            session([
                'role' => $user->role,
                'no_hp' => $user->no_hp,
            ]);

            return redirect()->intended('/admin/dashboard');
        }

        throw ValidationException::withMessages([
            'login' => 'Email/no HP atau password yang Anda masukkan salah.',
        ]);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
