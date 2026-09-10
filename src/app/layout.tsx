import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Central de Implantações - Gestão de implantação ERP Centi",
  description: "Ferramenta de apoio à liderança de implantação de ERP para a gestão pública municipal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
