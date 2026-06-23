import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarData(data: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data));
}

export function obterMeiaNoiteBR(data?: Date | string | number): Date {
  const d = data ? new Date(data) : new Date();
  if (isNaN(d.getTime())) return obterMeiaNoiteBR();
  
  const stringLocal = d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const dLocal = new Date(stringLocal);
  
  return new Date(dLocal.getFullYear(), dLocal.getMonth(), dLocal.getDate());
}

