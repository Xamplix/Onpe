import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Diferencia 2° vs 3° – Presidencial Perú 2026",
  description:
    "Compara en tiempo real la diferencia de votos entre el segundo y tercer lugar de la elección presidencial, usando los resultados publicados por la ONPE.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
          background: "#0b1020",
          color: "#f5f7ff",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
