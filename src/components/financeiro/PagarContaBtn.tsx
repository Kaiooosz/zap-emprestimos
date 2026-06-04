"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export function PagarContaBtn({ contaId }: { contaId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function pagar() {
    setLoading(true);
    await fetch(`/api/financeiro/${contaId}/pagar`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={pagar}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-600 hover:bg-blue-700 hover:text-white disabled:opacity-50 transition-all"
    >
      <CheckCircle size={12} />
      {loading ? "Pagando..." : "Marcar Pago"}
    </button>
  );
}
