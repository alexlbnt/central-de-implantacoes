import React from "react";
import { AlertCircle } from "lucide-react";

export function BannerDemo({ projectName }: { projectName?: string }) {
  return (
    <div
      role="banner"
      className="bg-amber-500 text-slate-950 px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm"
    >
      <div className="flex items-center gap-2 mx-auto">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-slate-950" />
        <span>
          MODO DE DEMONSTRAÇÃO — Este projeto utiliza dados e cenários fictícios de simulação. ({projectName || "Demonstração"})
        </span>
      </div>
    </div>
  );
}
