"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, HelpCircle, Check } from "lucide-react";

interface Step {
  title: string;
  description: string;
  highlight?: string;
}

const STEPS: Step[] = [
  {
    title: "Bem-vindo ao Zap Empréstimos",
    description: "Esta plataforma foi desenvolvida para facilitar a gestão de seus contratos de crédito, controle de taxas, equipe e cobrança automatizada via WhatsApp.",
  },
  {
    title: "Dashboard e Indicadores Principais",
    description: "No painel geral você acompanha métricas cruciais em tempo real. 'Na Rua' exibe o capital total ativo emprestado. 'Recebido' e 'Lucro' mostram o faturamento e os juros coletados de acordo com o período selecionado.",
  },
  {
    title: "Duas Modalidades Financeiras",
    description: "Configure contratos no modo Mensal Rolável (onde juros de 30% são cobrados mensalmente com opção de amortização parcial) ou no modo Parcelado (parcelas fixas baseadas em uma tabela de juros pré-configurada).",
  },
  {
    title: "Central de Cobranças Inteligente",
    description: "Na aba Cobranças, você realiza disparos manuais em massa no WhatsApp com juros de atraso diários já embutidos no valor principal, configura templates de mensagens dinâmicas e ativa notificações automáticas agendadas.",
  },
  {
    title: "Relatórios de Análise (Estilo Power BI)",
    description: "Filtre transações históricas por operador de equipe, cliente, modalidade de contrato e intervalo de datas. Monitore gráficos interativos e exporte os dados para planilhas CSV com um clique.",
  },
];

interface Props {
  startAutomatically?: boolean;
}

export function OnboardingTour({ startAutomatically = false }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Inicia se query string ?new=true estiver ativa ou se for o primeiro login
    const isNew = searchParams.get("new") === "true";
    const hasSeenTour = localStorage.getItem("zap_seen_onboarding");

    if (startAutomatically || isNew || !hasSeenTour) {
      setIsOpen(true);
      // Limpa o parâmetro da URL de forma discreta para evitar loops
      if (isNew) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("new");
        router.replace(`/dashboard?${params.toString()}`);
      }
    }
  }, [searchParams, router, startAutomatically]);

  function closeTour() {
    localStorage.setItem("zap_seen_onboarding", "true");
    setIsOpen(false);
  }

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTour();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  if (!isOpen) {
    // Botão flutuante discreto de ajuda para reabrir o guia de uso
    return (
      <button
        onClick={() => {
          setCurrentStep(0);
          setIsOpen(true);
        }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-lg hover:bg-slate-50 transition-colors"
      >
        <HelpCircle size={14} />
        Guia do Sistema
      </button>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Botão Fechar */}
        <button
          onClick={closeTour}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Cabeçalho */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5">
            Guia de Uso · Passo {currentStep + 1} de {STEPS.length}
          </p>
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            {step.title}
          </h2>
        </div>

        {/* Descrição */}
        <p className="text-xs text-slate-500 leading-relaxed min-h-[70px] mb-6">
          {step.description}
        </p>

        {/* Rodapé e Controles */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          {/* Pontinhos Indicadores */}
          <div className="flex gap-1">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? "w-4 bg-blue-700" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                <ChevronLeft size={13} />
                Voltar
              </button>
            )}
            
            <button
              onClick={nextStep}
              className="flex items-center gap-1 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  Concluir
                  <Check size={12} className="ml-0.5" />
                </>
              ) : (
                <>
                  Avançar
                  <ChevronRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
