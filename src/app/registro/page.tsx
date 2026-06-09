"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nombre: "", email: "", password: "", codigoInvitacion: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al registrarse.");
        setLoading(false);
        return;
      }

      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      router.push("/fixture");
      router.refresh();
    } catch {
      setError("Error de conexión.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-800 to-primary-700 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="text-white/70 hover:text-white hover:bg-white/10 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800" />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/logo-light.png"
            alt="Comtec"
            className="h-12 w-auto mx-auto mb-4 brightness-0 invert"
          />
          <h1 className="text-2xl font-black text-white">Polla Mundialera</h1>
          <p className="text-primary-200 dark:text-gray-400 text-sm mt-1">Crea tu cuenta con el código de invitación</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="nombre">Tu nombre</label>
              <input id="nombre" name="nombre" type="text" className="input" placeholder="Ej: Juan Pérez"
                value={form.nombre} onChange={handleChange} required minLength={2} />
            </div>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="input" placeholder="tu@email.com"
                value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input id="password" name="password" type={showPass ? "text" : "password"}
                  className="input pr-10" placeholder="Mínimo 6 caracteres"
                  value={form.password} onChange={handleChange} required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="codigoInvitacion">Código de invitación</label>
              <input id="codigoInvitacion" name="codigoInvitacion" type="text"
                className="input uppercase tracking-widest font-mono" placeholder="XXXXXXXX"
                value={form.codigoInvitacion}
                onChange={(e) => setForm({ ...form, codigoInvitacion: e.target.value.toUpperCase() })}
                required />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Pídelo a quien organizó la polla.</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl p-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Crear cuenta"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary-600 dark:text-primary-400 font-semibold">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
