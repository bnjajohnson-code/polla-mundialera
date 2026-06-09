"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contraseÃ±a incorrectos.");
    } else {
      router.push("/fixture");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-800 to-primary-700 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-4">
      {/* Theme toggle top-right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle className="text-white/70 hover:text-white hover:bg-white/10 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo-light.png"
            alt="Comtec"
            className="h-12 w-auto mx-auto mb-4 brightness-0 invert"
          />
          <h1 className="text-2xl font-black text-white">Polla Mundialera</h1>
          <p className="text-primary-200 dark:text-gray-400 text-sm mt-1">Mundial 2026 Â· MÃ©xico Â· CanadÃ¡ Â· EEUU</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">Iniciar sesiÃ³n</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">ContraseÃ±a</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  className="input pr-10"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl p-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Â¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-primary-600 dark:text-primary-400 font-semibold">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

