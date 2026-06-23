"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { formatarMoeda } from "@/lib/utils";

type Tab = "leads" | "emprestimos";

export default function ImportarPlanilhaPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("leads");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const templates = {
    leads: {
      cols: ["nome", "phone", "cpf", "email", "endereco", "cidade", "estado", "profissao", "rendaMensal", "perfilTaxa", "taxaPadrao"],
      sample: "nome,phone,cpf,email,endereco,cidade,estado,profissao,rendaMensal,perfilTaxa,taxaPadrao\nJoão Silva,(11) 99999-1111,123.456.789-00,joao@email.com,Rua A 123,São Paulo,SP,Autônomo,2500,20,20.0\nMaria Santos,(11) 98888-2222,987.654.321-11,maria@email.com,Rua B 456,Rio de Janeiro,RJ,Vendedora,1800,10,10.0",
      filename: "modelo_importacao_leads.csv"
    },
    emprestimos: {
      cols: ["identificadorCliente", "tipoOp", "valorPrincipal", "taxaJuros", "nParcelas", "periodo", "dataInicio", "regraAtraso", "taxaAtraso", "observacoes"],
      sample: "identificadorCliente,tipoOp,valorPrincipal,taxaJuros,nParcelas,periodo,dataInicio,regraAtraso,taxaAtraso,observacoes\n(11) 99999-1111,EMPRESTIMO,2000,10,6,MENSAL,2026-06-15,PARCELA,1.0,Contrato importado de planilha\n123.456.789-00,VENDA,5000,5,10,MENSAL,2026-06-10,SALDO,1.5,Venda de produto parcelado",
      filename: "modelo_importacao_contratos.csv"
    }
  };

  function downloadTemplate() {
    const t = templates[tab];
    const blob = new Blob(["\uFEFF" + t.sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", t.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCSVText(text: string) {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        setErrorMsg("O arquivo CSV está vazio ou contém apenas o cabeçalho.");
        return;
      }

      const firstLine = lines[0];
      const separator = firstLine.includes(";") ? ";" : ",";
      const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ""));
      
      const required = tab === "leads" ? ["nome", "phone"] : ["identificadorCliente", "valorPrincipal", "taxaJuros", "nParcelas", "dataInicio"];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length > 0) {
        setErrorMsg(`Colunas obrigatórias ausentes no cabeçalho: ${missing.join(", ")}`);
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values: string[] = [];
        let currentVal = "";
        let insideQuotes = false;

        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === separator && !insideQuotes) {
            values.push(currentVal.trim().replace(/^"|"$/g, ""));
            currentVal = "";
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim().replace(/^"|"$/g, ""));

        const obj: any = {};
        headers.forEach((header, idx) => {
          obj[header] = values[idx] || "";
        });
        rows.push(obj);
      }

      if (rows.length === 0) {
        setErrorMsg("Nenhuma linha de dados válida encontrada no CSV.");
      } else {
        setParsedData(rows);
        setErrorMsg("");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Erro ao processar arquivo. Verifique a formatação.");
    }
  }

  function handleFile(file: File) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("Por favor, selecione apenas arquivos do tipo CSV.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleCSVText(text);
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  async function submit() {
    if (parsedData.length === 0) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tab, data: parsedData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na importação.");
      setSuccessMsg(`Importação concluída com sucesso! ${data.count} registros importados.`);
      setParsedData([]);
      setFileName("");
    } catch (e: any) {
      setErrorMsg(e.message || "Erro de conexão ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFileName("");
    setParsedData([]);
    setErrorMsg("");
    setSuccessMsg("");
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Importação de Dados</h1>
          <p className="text-xs text-slate-500 mt-0.5">Importar leads ou empréstimos em massa através de tabelas CSV</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setTab("leads"); reset(); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${tab === "leads" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Importar Leads (Clientes)
        </button>
        <button
          onClick={() => { setTab("emprestimos"); reset(); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${tab === "emprestimos" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Importar Empréstimos / Contratos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Lado Esquerdo - Instruções */}
        <div className="space-y-4 md:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Instruções</h2>
            <div className="text-xs text-slate-500 space-y-2 leading-relaxed font-normal">
              {tab === "leads" ? (
                <>
                  <p>1. Baixe a planilha modelo de leads.</p>
                  <p>2. Insira os dados dos clientes respeitando os cabeçalhos exatos.</p>
                  <p>3. Os campos <strong className="text-slate-800 font-semibold">nome</strong> e <strong className="text-slate-800 font-semibold">phone</strong> são obrigatórios.</p>
                  <p>4. Em <strong className="text-slate-800 font-semibold">perfilTaxa</strong> utilize: 10, 20, 30 ou CUSTOM.</p>
                </>
              ) : (
                <>
                  <p>1. Certifique-se de que os clientes correspondentes já estejam cadastrados no sistema.</p>
                  <p>2. Em <strong className="text-slate-800 font-semibold">identificadorCliente</strong>, preencha o CPF ou o número de Telefone do cliente cadastrado para o sistema associar automaticamente.</p>
                  <p>3. Os valores de juros e parcelas serão recalculados a partir dos dados importados.</p>
                </>
              )}
            </div>
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2 text-xs font-semibold text-slate-700 transition-colors"
            >
              <Download size={13} />
              Baixar Modelo CSV
            </button>
          </div>
        </div>

        {/* Lado Direito - Upload e Preview */}
        <div className="md:col-span-2 space-y-4">
          {successMsg && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex gap-3 text-emerald-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold">Importação concluída!</p>
                <p className="text-[11px] mt-0.5 font-normal">{successMsg}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 flex gap-3 text-red-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold">Erro Encontrado</p>
                <p className="text-[11px] mt-0.5 font-normal">{errorMsg}</p>
              </div>
            </div>
          )}

          {parsedData.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors flex flex-col items-center justify-center ${dragging ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
            >
              <Upload size={32} className="text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-800">Arraste e solte o arquivo CSV aqui</p>
              <p className="text-xs text-slate-400 mt-1">ou clique para selecionar do computador</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet size={13} />
                Selecionar Arquivo
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-800 truncate max-w-xs">{fileName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{parsedData.length} registros prontos para importar</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={submit}
                    disabled={loading}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Importando...
                      </>
                    ) : (
                      "Confirmar Importação"
                    )}
                  </button>
                </div>
              </div>

              {/* Tabela de Preview */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto overflow-y-auto shadow-sm max-h-96">
                <table className="w-full text-[11px] text-left text-slate-700 min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0 bg-white">
                    <tr>
                      {Object.keys(parsedData[0] || {}).map((col) => (
                        <th key={col} className="px-4 py-2">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {Object.values(row).map((val: any, vIdx) => (
                          <td key={vIdx} className="px-4 py-2 truncate max-w-[150px]">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="p-3 text-center border-t border-slate-100 text-[10px] text-slate-400 bg-slate-50/50 font-normal">
                    Exibindo as primeiras 10 linhas do arquivo.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
