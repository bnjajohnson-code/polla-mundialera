export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/fixture/:path*",
    "/tabla/:path*",
    "/chat/:path*",
    "/partido/:path*",
    "/jugador/:path*",
    "/perfil/:path*",
    "/admin/:path*",
  ],
};
