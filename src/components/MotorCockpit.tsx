"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArtigoBlogAncora,
  BaseConhecimentoMarca,
  Demanda,
  FormatoCanal,
  InsumoRadarPesquisa,
  Marca,
  MetodoGeracaoPost,
  PesquisaMercado,
  ResultadoCicloEditorial,
  SlideCarrosselEloss,
  TarefaFluxo,
  TemaEditorial,
  TipoGatilhoPesquisa,
} from "@/lib/types";

interface ContextoPayload {
  clock_servidor: string;
  marcas: Marca[];
  marca_ativa: Marca;
  base_conhecimento_ao_vivo: BaseConhecimentoMarca;
  insumos_radar: InsumoRadarPesquisa[];
  pesquisas_mercado: PesquisaMercado[];
  temas_editoriais: TemaEditorial[];
  artigos_blog_ancora: ArtigoBlogAncora[];
  resultados_ciclo: ResultadoCicloEditorial[];
  demandas: Demanda[];
  tarefas_fluxo: TarefaFluxo[];
}

type NavSection =
  | "pesquisa"
  | "banco_temas"
  | "malhas"
  | "pecas"
  | "fila_validacao"
  | "base_marca";

const TODOS_CANAIS: {
  id: FormatoCanal;
  label: string;
  curto: string;
  corBg: string;
  corTexto: string;
  corBorda: string;
  proposito: string;
}[] = [
  {
    id: "blog",
    label: "Matéria de Blog (Âncora AEO)",
    curto: "Blog",
    corBg: "#EEF2FF",
    corTexto: "#4338CA",
    corBorda: "#C7D2FE",
    proposito:
      "Peça-mãe com definição direta na 1ª frase (Padrão AEO), dados WFDSA/ABEVD/Zuora e 6 FAQs estruturadas.",
  },
  {
    id: "carrossel",
    label: "Carrossel Instagram (8 Slides Dark Tech)",
    curto: "Carrossel",
    corBg: "#F3E8FF",
    corTexto: "#6D28D9",
    corBorda: "#DDD6FE",
    proposito:
      "8 lâminas em Modo Escuro (#0A0820 / #382060) com Poppins Bold, 1 trecho em gradiente (#5B1F8A → #F4834B) e legenda consultiva.",
  },
  {
    id: "post_simples",
    label: "Post Simples (Arte Única)",
    curto: "Post Simples",
    corBg: "#ECFDF5",
    corTexto: "#047857",
    corBorda: "#A7F3D0",
    proposito:
      "Declaração técnica em até 6 palavras com destaque em gradiente e barra lateral #F4834B.",
  },
  {
    id: "reels",
    label: "Reels (Vídeo Curto 60s)",
    curto: "Reels",
    corBg: "#FFF1F2",
    corTexto: "#BE123C",
    corBorda: "#FECDD3",
    proposito:
      "Roteiro em 4 cenas com 3 provas técnicas (respeitando o Critério de Formato por Tema da Eloss).",
  },
  {
    id: "story",
    label: "Story (Sequência 4 Telas B2B)",
    curto: "Story",
    corBg: "#FFFBEB",
    corTexto: "#B45309",
    corBorda: "#FDE68A",
    proposito:
      "4 telas sobrias com enquete de maturidade operacional para decisores e link para a matéria âncora.",
  },
];

/** Renderiza headline destacando o trecho selecionado com o gradiente oficial da Eloss */
function renderHeadlineComGradiente(headline: string, trechoDestaque?: string) {
  if (!trechoDestaque || !headline.toLowerCase().includes(trechoDestaque.toLowerCase())) {
    return <span>{headline}</span>;
  }
  const idx = headline.toLowerCase().indexOf(trechoDestaque.toLowerCase());
  const antes = headline.slice(0, idx);
  const meio = headline.slice(idx, idx + trechoDestaque.length);
  const depois = headline.slice(idx + trechoDestaque.length);
  return (
    <>
      {antes}
      <span
        style={{
          background: "linear-gradient(90deg, #C77DE0 0%, #F4834B 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontWeight: 800,
        }}
      >
        {meio}
      </span>
      {depois}
    </>
  );
}

/** Converte Markdown do Artigo da Eloss em visualização editorial limpa */
function ArtigoBlogRenderer({ markdown }: { markdown: string }) {
  const blocos = markdown.split("\n\n");
  return (
    <div className="space-y-4 text-slate-800 leading-relaxed">
      {blocos.map((bloco, i) => {
        const trim = bloco.trim();
        if (!trim) return null;
        if (trim === "---") {
          return <hr key={i} className="my-6 border-slate-200" />;
        }
        if (trim.startsWith("# ")) {
          return (
            <h1
              key={i}
              className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight leading-snug"
            >
              {trim.replace(/^#\s+/, "")}
            </h1>
          );
        }
        if (trim.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="text-lg sm:text-xl font-bold text-slate-900 pt-4 pb-1 border-b border-slate-100"
            >
              {trim.replace(/^##\s+/, "")}
            </h2>
          );
        }
        if (trim.startsWith("### ")) {
          return (
            <h3
              key={i}
              className="text-base font-bold text-indigo-950 pt-2 flex items-center gap-2"
            >
              <span className="w-1.5 h-4 rounded-full bg-[#F4834B] inline-block" />
              {trim.replace(/^###\s+/, "")}
            </h3>
          );
        }
        if (trim.startsWith("| ") && trim.includes("\n|")) {
          const linhasTabela = trim
            .split("\n")
            .filter((l) => !/^\|\s*[-:]+/.test(l.trim()));
          const cabecalho =
            linhasTabela[0]
              ?.split("|")
              .map((c) => c.trim())
              .filter(Boolean) || [];
          const corpo = linhasTabela.slice(1).map((linha) =>
            linha
              .split("|")
              .map((c) => c.trim())
              .filter(Boolean)
          );
          return (
            <div key={i} className="overflow-x-auto my-4 rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-800 font-bold">
                  <tr>
                    {cabecalho.map((col, cIdx) => (
                      <th key={cIdx} className="px-3.5 py-2.5 border-b border-slate-200">
                        {col.replace(/\*\*/g, "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {corpo.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/70">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-slate-700">
                          {cell.replace(/\*\*/g, "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (trim.startsWith("- ")) {
          const itens = trim.split("\n").map((l) => l.replace(/^-\s+/, ""));
          return (
            <ul key={i} className="space-y-2 pl-4 list-disc text-sm text-slate-700">
              {itens.map((it, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{
                  __html: it.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>')
                }} />
              ))}
            </ul>
          );
        }
        const html = trim
          .replace(
            /\*\*(.+?)\*\*/g,
            '<strong class="text-slate-900 font-semibold">$1</strong>'
          )
          .replace(/\*(.+?)\*/g, '<em class="text-slate-600">$1</em>')
          .replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noreferrer" class="text-indigo-600 underline font-medium hover:text-indigo-800">$1</a>'
          )
          .replace(/\n/g, "<br/>");

        return (
          <p
            key={i}
            className="text-[14.5px] text-slate-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
}

export default function MotorCockpit() {
  const [contexto, setContexto] = useState<ContextoPayload | null>(null);
  const [marcaSelecionadaId, setMarcaSelecionadaId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{
    texto: string;
    acaoLabel?: string;
    onAcao?: () => void;
  } | null>(null);

  // Menu Lateral
  const [activeSection, setActiveSection] = useState<NavSection>("banco_temas");
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(true);

  // Pesquisa
  const [assuntoPesquisa, setAssuntoPesquisa] = useState<string>("");
  const [gatilhoPesquisa, setGatilhoPesquisa] =
    useState<TipoGatilhoPesquisa>("base_conhecimento");

  // Modal "Demandar para Criação"
  const [temaParaDemandar, setTemaParaDemandar] =
    useState<TemaEditorial | null>(null);
  const [canaisParaDemandar, setCanaisParaDemandar] = useState<FormatoCanal[]>([
    "blog",
    "carrossel",
  ]);
  const [metodoGeracaoPost, setMetodoGeracaoPost] =
    useState<MetodoGeracaoPost>("gpt");

  // Tema selecionado na visão "Malhas"
  const [temaMalhaId, setTemaMalhaId] = useState<string>("");

  // Filtro de canal na visão "Peças (Kanban)"
  const [filtroCanalPecas, setFiltroCanalPecas] = useState<
    "todos" | FormatoCanal
  >("todos");

  // Modal Visualizador/Editor Rico de Peça (Blog, Carrossel, Post Simples, Reels, Story)
  const [modalDemandaId, setModalDemandaId] = useState<string | null>(null);
  const [slideAtivoIdx, setSlideAtivoIdx] = useState<number>(0);
  const [modoVisualizacaoSlide, setModoVisualizacaoSlide] = useState<
    "card_eloss" | "imagem_ia"
  >("card_eloss");
  const [abaModalBlog, setAbaModalBlog] = useState<"leitura" | "editar">(
    "leitura"
  );
  const [markdownBlogEditavel, setMarkdownBlogEditavel] = useState<string>("");
  const [slidesEditaveis, setSlidesEditaveis] = useState<SlideCarrosselEloss[]>(
    []
  );
  const [legendaEditavel, setLegendaEditavel] = useState<string>("");
  const [mostrarPonteChatGptMcp, setMostrarPonteChatGptMcp] =
    useState<boolean>(false);
  const [mostrarConfigMcp, setMostrarConfigMcp] = useState<boolean>(false);
  const [textoRetornoChatGpt, setTextoRetornoChatGpt] = useState<string>("");

  const carregarContexto = useCallback(async (marcaId?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = marcaId
        ? `/api/contexto?marca_id=${encodeURIComponent(marcaId)}`
        : `/api/contexto`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar motor.");
      setContexto(data);
      setMarcaSelecionadaId(data.marca_ativa.id);
      if (data.temas_editoriais?.length > 0) {
        setTemaMalhaId((prev) => prev || data.temas_editoriais[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarContexto();
  }, [carregarContexto]);

  // Sincronizar estado local do modal quando abrir uma peça
  useEffect(() => {
    if (!modalDemandaId || !contexto) return;
    const dem = contexto.demandas.find((d) => d.id === modalDemandaId);
    if (!dem) return;
    setSlideAtivoIdx(0);
    setAbaModalBlog("leitura");
    const art = contexto.artigos_blog_ancora.find(
      (a) =>
        a.id === dem.artigo_blog_origem_id || a.tema_id === dem.tema_origem_id
    );
    setMarkdownBlogEditavel(
      dem.conteudo_estruturado?.artigo_markdown ||
        art?.conteudo_completo_markdown ||
        ""
    );
    setSlidesEditaveis(dem.conteudo_estruturado?.slides || []);
    setLegendaEditavel(dem.conteudo_estruturado?.legenda || "");
    const temImgNoSlide0 = Boolean(
      dem.conteudo_estruturado?.slides?.[0]?.imagem_url
    );
    setModoVisualizacaoSlide(temImgNoSlide0 ? "imagem_ia" : "card_eloss");
  }, [modalDemandaId, contexto]);

  async function executarPesquisa(focoCustom?: string, gatilhoCustom?: TipoGatilhoPesquisa) {
    if (!contexto) return;
    const foco = (focoCustom ?? assuntoPesquisa).trim();
    if (!foco) {
      setErrorMsg("Informe um assunto ou selecione uma sugestão da Base da Eloss.");
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "disparar_pesquisa_de_engrenagem",
          marca_id: contexto.marca_ativa.id,
          gatilho_tipo: gatilhoCustom ?? gatilhoPesquisa,
          foco_assunto: foco,
          ator: "Isabelle",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssuntoPesquisa("");
      await carregarContexto(contexto.marca_ativa.id);
      setToastMsg({
        texto: `Pesquisa concluída na Base da Eloss! ${data.temas?.length || 3} novos temas foram enviados para o Banco de Temas.`,
        acaoLabel: "Ir para o Banco de Temas →",
        onAcao: () => setActiveSection("banco_temas"),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro na pesquisa.");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmarDemandaCriacao() {
    if (!contexto || !temaParaDemandar) return;
    if (canaisParaDemandar.length === 0) {
      setErrorMsg("Selecione pelo menos 1 canal para produzir.");
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const temaId = temaParaDemandar.id;
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "aprovar_tema_e_gerar_canais",
          marca_id: contexto.marca_ativa.id,
          tema_id: temaId,
          canais_selecionados: canaisParaDemandar,
          metodo_geracao_post: metodoGeracaoPost,
          ator: "Isabelle",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTemaParaDemandar(null);
      setTemaMalhaId(temaId);
      await carregarContexto(contexto.marca_ativa.id);
      setActiveSection("malhas");
      setToastMsg({
        texto: `Malha produzida! Matéria de Blog via Método Malha de Conteúdos + Posts via ${metodoGeracaoPost === "gpt" ? "Estratégia GPT (Padrão)" : "Método Malha (Opcional)"}.`,
        acaoLabel: "Ver no Kanban de Peças →",
        onAcao: () => setActiveSection("pecas"),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao demandar.");
    } finally {
      setActionLoading(false);
    }
  }

  async function gerarCanalIndividualNaMalha(
    tema: TemaEditorial,
    canal: FormatoCanal,
    metodoCustom?: MetodoGeracaoPost
  ) {
    if (!contexto) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "aprovar_tema_e_gerar_canais",
          marca_id: contexto.marca_ativa.id,
          tema_id: tema.id,
          canais_selecionados: [canal],
          metodo_geracao_post: metodoCustom ?? metodoGeracaoPost,
          ator: "Isabelle",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await carregarContexto(contexto.marca_ativa.id);
      if (data.demandas_criadas?.[0]?.demanda?.id) {
        setModalDemandaId(data.demandas_criadas[0].demanda.id);
      }
      setToastMsg({
        texto:
          canal === "blog"
            ? "Matéria de Blog produzida com o Método Oficial da Malha de Conteúdos!"
            : `Peça de ${canal.toUpperCase()} produzida via ${(metodoCustom ?? metodoGeracaoPost) === "gpt" ? "Estratégia GPT (OpenAI GPT-4o)" : "Método Malha (Opcional)"}!`,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao gerar canal.");
    } finally {
      setActionLoading(false);
    }
  }

  async function regenerarPecaComMetodo(
    demandaId: string,
    metodoPost?: MetodoGeracaoPost,
    forcarIaAoVivo = false
  ) {
    if (!contexto) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "regenerar_peca_com_metodo",
          marca_id: contexto.marca_ativa.id,
          demanda_id: demandaId,
          metodo_geracao_post: metodoPost,
          forcar_ia_ao_vivo: forcarIaAoVivo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await carregarContexto(contexto.marca_ativa.id);
      setToastMsg({
        texto: !metodoPost
          ? "Matéria de Blog regenerada ao vivo pelo Método Malha de Conteúdos (redator.blog.artigo)!"
          : metodoPost === "gpt"
            ? "Post atualizado com a Estratégia GPT (OpenAI GPT-4o + Prompt Visual 8 Pontos)!"
            : "Post atualizado com o Método Malha de Conteúdos (Opcional — H2/Componentes)!",
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erro ao regenerar peça."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function gerarImagemSlideNoGpt(demandaId: string, ordemSlide: number) {
    if (!contexto) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "gerar_imagem_slide_gpt",
          marca_id: contexto.marca_ativa.id,
          demanda_id: demandaId,
          ordem_slide: ordemSlide,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await carregarContexto(contexto.marca_ativa.id);
      setModoVisualizacaoSlide("imagem_ia");
      if (data.aviso_sem_credito_openai) {
        setToastMsg({
          texto: `Arte Dark Tech 4:5 renderizada para o Slide ${ordemSlide}! (Aviso: a chave OpenAI sk-proj-Cx_p... está conectada, porém a conta retornou 'credit_balance_exhausted' para o gpt-image-1; você pode recarregar créditos na OpenAI ou usar "📋 Copiar Prompt GPT" para colar direto no ChatGPT Plus).`,
        });
      } else {
        setToastMsg({
          texto: `Imagem do Slide ${ordemSlide} gerada ao vivo via OpenAI GPT (gpt-image-1)!`,
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Erro ao gerar imagem no GPT (gpt-image-1)."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function copiarSuperPromptPlanoChatGpt(
    demandaId: string,
    modo: "completo" | "somente_artes",
    abrirChatGpt = false
  ) {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/mcp-gpt?demanda_id=${encodeURIComponent(demandaId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const texto =
        modo === "somente_artes"
          ? data.prompt_sequencia_artes
          : data.super_prompt_completo;
      await navigator.clipboard.writeText(texto);
      if (abrirChatGpt) {
        window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
      }
      setToastMsg({
        texto:
          modo === "somente_artes"
            ? "Todos os 8 Prompts de Arte (Slides 1 a 8 com Cláusula Anti-Mosaico) foram copiados! Cole (Ctrl+V) no seu ChatGPT para gerar usando seu plano."
            : abrirChatGpt
              ? "Super-Prompt Completo copiado e ChatGPT aberto! Basta dar Ctrl+V no seu ChatGPT (sem gastar API)."
              : "Super-Prompt Completo (Matéria + 8 Slides + Regras + Sincronização MCP) copiado para a área de transferência!",
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Erro ao copiar Super-Prompt para o ChatGPT."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function sincronizarRetornoDoChatGpt(demandaId: string) {
    if (!contexto || !textoRetornoChatGpt.trim()) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/mcp-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "sincronizar_json_chatgpt",
          demanda_id: demandaId,
          texto_colado_chatgpt: textoRetornoChatGpt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await carregarContexto(contexto.marca_ativa.id);
      setTextoRetornoChatGpt("");
      setMostrarPonteChatGptMcp(false);
      setToastMsg({
        texto:
          "Post / Carrossel atualizado automaticamente com o conteúdo desenvolvido no seu ChatGPT!",
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Erro ao sincronizar resposta do ChatGPT."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function anexarArteDoChatGptNoSlide(
    demandaId: string,
    ordemSlide: number,
    fileOrBlob: File | Blob
  ) {
    if (!contexto) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Falha ao ler imagem."));
        reader.readAsDataURL(fileOrBlob);
      });

      const res = await fetch("/api/mcp-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "salvar_arte_colada_chatgpt",
          demanda_id: demandaId,
          ordem_slide: ordemSlide,
          data_url: dataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await carregarContexto(contexto.marca_ativa.id);
      setModoVisualizacaoSlide("imagem_ia");
      setToastMsg({
        texto: `Arte do Slide ${ordemSlide} (gerada no seu ChatGPT) anexada e salva com sucesso no sistema!`,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Erro ao salvar arte gerada no ChatGPT."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function salvarOuAprovarPecaNoModal(
    demandaId: string,
    novoStatus?: "peca_pronta" | "reprovada_em_ajuste" | "em_gate"
  ) {
    if (!contexto) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "atualizar_conteudo_peca",
          marca_id: contexto.marca_ativa.id,
          demanda_id: demandaId,
          novo_status: novoStatus,
          artigo_markdown: markdownBlogEditavel || undefined,
          conteudo_estruturado: {
            slides: slidesEditaveis.length > 0 ? slidesEditaveis : undefined,
            legenda: legendaEditavel || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await carregarContexto(contexto.marca_ativa.id);
      setToastMsg({
        texto:
          novoStatus === "peca_pronta"
            ? "Peça aprovada com sucesso! Ela já está na coluna 'Aprovado / Pronto'."
            : novoStatus === "reprovada_em_ajuste"
              ? "Peça enviada para a coluna 'Em Correção'."
              : "Alterações salvas com sucesso na peça!",
      });
      if (novoStatus === "peca_pronta" || novoStatus === "reprovada_em_ajuste") {
        setModalDemandaId(null);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar peça.");
    } finally {
      setActionLoading(false);
    }
  }

  // Abre a matéria de blog do tema (ou cria na hora caso ainda não exista peça de blog)
  async function abrirMateriaDoTema(tema: TemaEditorial) {
    if (!contexto) return;
    const pecaBlog = contexto.demandas.find(
      (d) => d.tema_origem_id === tema.id && d.formato_canal === "blog"
    );
    if (pecaBlog) {
      setModalDemandaId(pecaBlog.id);
      return;
    }
    // Se não existir ainda como demanda, gera imediatamente e já abre o leitor!
    await gerarCanalIndividualNaMalha(tema, "blog");
  }

  if (loading && !contexto) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl px-8 py-6 shadow-sm border border-slate-200/80 flex items-center gap-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#5B1F8A] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-700">
            Sincronizando Base Oficial da Eloss...
          </p>
        </div>
      </div>
    );
  }

  if (!contexto) return null;

  const temasSugeridos = contexto.temas_editoriais.filter(
    (t) => t.status === "sugerido"
  );
  const temasBanco = contexto.temas_editoriais.filter(
    (t) => t.status !== "sugerido"
  );

  const pecasAguardandoValidacao = contexto.demandas.filter(
    (d) => d.status === "em_gate"
  );

  const temaMalhaAtivo =
    contexto.temas_editoriais.find((t) => t.id === temaMalhaId) ||
    temasBanco[0] ||
    contexto.temas_editoriais[0];

  const modalDemanda = modalDemandaId
    ? contexto.demandas.find((d) => d.id === modalDemandaId) || null
    : null;

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex">
      {/* =====================================================================
          SIDEBAR (ESTILO MALHA DE CONTEÚDOS — PLANEJAMENTO / PRODUÇÃO / MARCA)
      ===================================================================== */}
      <aside
        className={`bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 transition-all duration-200 select-none ${
          sidebarPinned ? "w-64" : "w-[68px]"
        }`}
      >
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #382060 0%, #5B1F8A 55%, #F4834B 100%)",
                }}
              >
                E
              </div>
              {sidebarPinned && (
                <div className="truncate">
                  <p className="text-[14px] font-bold text-slate-900 leading-tight truncate">
                    Malha & Motor
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {contexto.marca_ativa.nome} · Oficial
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarPinned((v) => !v)}
              title={sidebarPinned ? "Recolher menu" : "Fixar menu aberto"}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            >
              {sidebarPinned ? "«" : "»"}
            </button>
          </div>

          <div className="p-3 space-y-5">
            <div>
              {sidebarPinned && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Planejamento
                </p>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveSection("pesquisa")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    activeSection === "pesquisa"
                      ? "bg-[#F3E8FF] text-[#5B1F8A] font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="text-base">🔎</span>
                    {sidebarPinned && <span>Pesquisa</span>}
                  </span>
                </button>

                <button
                  onClick={() => setActiveSection("banco_temas")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    activeSection === "banco_temas"
                      ? "bg-[#F3E8FF] text-[#5B1F8A] font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="text-base">🗂️</span>
                    {sidebarPinned && <span>Banco de Temas</span>}
                  </span>
                  {sidebarPinned && temasSugeridos.length > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-purple-100 text-purple-700">
                      +{temasSugeridos.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div>
              {sidebarPinned && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Produção
                </p>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveSection("malhas")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    activeSection === "malhas"
                      ? "bg-[#F3E8FF] text-[#5B1F8A] font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="text-base">🕸️</span>
                    {sidebarPinned && <span>Malhas</span>}
                  </span>
                </button>

                <button
                  onClick={() => setActiveSection("pecas")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    activeSection === "pecas"
                      ? "bg-[#F3E8FF] text-[#5B1F8A] font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="text-base">📋</span>
                    {sidebarPinned && <span>Peças (Kanban)</span>}
                  </span>
                  {sidebarPinned && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600">
                      {contexto.demandas.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveSection("fila_validacao")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    activeSection === "fila_validacao"
                      ? "bg-[#F3E8FF] text-[#5B1F8A] font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="text-base">✅</span>
                    {sidebarPinned && <span>Fila de Validação</span>}
                  </span>
                  {sidebarPinned && pecasAguardandoValidacao.length > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800">
                      {pecasAguardandoValidacao.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div>
              {sidebarPinned && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Marca
                </p>
              )}
              <button
                onClick={() => setActiveSection("base_marca")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  activeSection === "base_marca"
                    ? "bg-[#F3E8FF] text-[#5B1F8A] font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <span className="text-base">🏛️</span>
                  {sidebarPinned && <span>Base Oficial Eloss</span>}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100">
          {sidebarPinned ? (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Marca Ativa
              </label>
              <select
                value={marcaSelecionadaId}
                onChange={(e) => carregarContexto(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
              >
                {contexto.marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
          )}
        </div>
      </aside>

      {/* =====================================================================
          ÁREA PRINCIPAL
      ===================================================================== */}
      <main className="flex-1 min-w-0 p-6 sm:p-8 max-w-6xl mx-auto">
        {toastMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-medium">
              <span>✅</span>
              <span>{toastMsg.texto}</span>
              {toastMsg.acaoLabel && toastMsg.onAcao && (
                <button
                  onClick={() => {
                    toastMsg.onAcao?.();
                    setToastMsg(null);
                  }}
                  className="ml-2 underline font-bold text-emerald-800 hover:text-emerald-950"
                >
                  {toastMsg.acaoLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-emerald-600 hover:text-emerald-900 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-5 py-3.5 flex items-center justify-between">
            <span className="text-sm font-medium">{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs font-bold underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* ===================================================================
            TELA 1: BANCO DE TEMAS
        =================================================================== */}
        {activeSection === "banco_temas" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#382060] text-white">
                    Base Oficial Eloss Sincronizada
                  </span>
                  <span className="text-xs text-slate-500">
                    6 Pilares (P1 a P6) · VTP & VCE · Plataforma Operacional de Crescimento
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Banco de Temas
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Aprove temas mapeados da Base da Eloss e demande para criação (Matéria de Blog + Carrossel 8 Slides + Redes).
                </p>
              </div>
              <button
                onClick={() => setActiveSection("pesquisa")}
                className="px-4 py-2.5 rounded-xl bg-[#382060] hover:bg-[#4e2d82] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                + Pesquisar Novos Temas na Base Eloss
              </button>
            </div>

            {/* CAIXA ROXA: SUGERIDOS PELA IA (TEMAS REAIS T9, T12, T15, T20) */}
            {temasSugeridos.length > 0 && (
              <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                      <span>✨</span> Sugeridos pela IA — Mapeados da Base Oficial Eloss ({temasSugeridos.length})
                    </h2>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Temas alinhados à Plataforma Operacional de Crescimento (VTP/VCE, White Label, No-Code, Split na Recorrência e Canais B2B).
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {temasSugeridos.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-xl border border-purple-100 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.codigo_tema && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono font-bold">
                              {t.codigo_tema}
                            </span>
                          )}
                          {t.nome_pilar && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[11px] font-semibold">
                              {t.nome_pilar}
                            </span>
                          )}
                          <p className="text-sm font-bold text-slate-900">
                            {t.titulo_tema}
                          </p>
                        </div>
                        <p className="text-xs text-slate-600">
                          {t.dor_do_publico}
                        </p>
                        <p className="text-[11px] text-purple-800 font-medium">
                          Pergunta AEO: &ldquo;{t.pergunta_direta_aeo}&rdquo; · Tese:{" "}
                          <strong>{t.tese_autoridade_geo}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setTemaParaDemandar(t);
                            setCanaisParaDemandar(["blog", "carrossel"]);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#5B1F8A] hover:bg-[#4a1873] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          ✓ Aprovar e Demandar Canais
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABELA DO BANCO DE TEMAS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">
                  Temas Aprovados e Malhas em Produção ({temasBanco.length})
                </h2>
                <span className="text-xs text-slate-400">
                  Clique em &ldquo;Abrir matéria&rdquo; ou &ldquo;Ver malha&rdquo; para inspecionar as peças
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Código / Pilar
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Tema Canônico Eloss
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Canais na Malha
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                        Ações Rápidas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {temasBanco.map((tema, idx) => {
                      const canais = tema.canais_aprovados || [];
                      return (
                        <tr
                          key={tema.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-4 py-4 whitespace-nowrap align-top">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold">
                                {tema.codigo_tema || `T-${idx + 1}`}
                              </span>
                              {tema.nome_pilar && (
                                <span className="text-[11px] font-semibold text-[#5B1F8A]">
                                  {tema.nome_pilar}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 max-w-md align-top">
                            <p className="font-bold text-slate-900 leading-snug">
                              {tema.titulo_tema}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {tema.dor_do_publico}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            {canais.length === 0 ? (
                              <span className="text-xs text-slate-400">
                                Nenhum canal gerado ainda
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {canais.map((c) => {
                                  const cfg = TODOS_CANAIS.find(
                                    (x) => x.id === c
                                  );
                                  return (
                                    <span
                                      key={c}
                                      style={{
                                        backgroundColor: cfg?.corBg,
                                        color: cfg?.corTexto,
                                        borderColor: cfg?.corBorda,
                                      }}
                                      className="px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                                    >
                                      {cfg?.curto || c}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right align-top">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => abrirMateriaDoTema(tema)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                📖 Abrir matéria
                              </button>
                              <button
                                onClick={() => {
                                  setTemaParaDemandar(tema);
                                  setCanaisParaDemandar(
                                    tema.canais_aprovados?.length > 0
                                      ? tema.canais_aprovados
                                      : ["blog", "carrossel"]
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                + Canais
                              </button>
                              <button
                                onClick={() => {
                                  setTemaMalhaId(tema.id);
                                  setActiveSection("malhas");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#382060] hover:bg-[#4e2d82] text-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Ver malha →
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TELA 2: MALHAS (PEÇA-ÂNCORA BLOG + CARROSSEL 8 LÂMINAS + CANAIS)
        =================================================================== */}
        {activeSection === "malhas" && temaMalhaAtivo && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setActiveSection("banco_temas")}
                className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                ← Voltar ao Banco de Temas
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Tema da Malha:
                </span>
                <select
                  value={temaMalhaAtivo.id}
                  onChange={(e) => setTemaMalhaId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  {contexto.temas_editoriais.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo_tema ? `${t.codigo_tema} — ` : ""}
                      {t.titulo_tema.slice(0, 62)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CABEÇALHO DO TEMA + BARRA DE COMPLETUDE */}
            {(() => {
              const canaisProduzidos = temaMalhaAtivo.canais_aprovados || [];
              const pct = Math.round((canaisProduzidos.length / 5) * 100);
              const pecasDoTema = contexto.demandas.filter(
                (d) => d.tema_origem_id === temaMalhaAtivo.id
              );
              const pecaBlog = pecasDoTema.find(
                (d) => d.formato_canal === "blog"
              );
              const pecasSociais = pecasDoTema.filter(
                (d) => d.formato_canal !== "blog"
              );
              const canaisFaltantes = TODOS_CANAIS.filter(
                (c) => !canaisProduzidos.includes(c.id)
              );

              return (
                <>
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
                    <div className="flex items-center gap-2 mb-1.5">
                      {temaMalhaAtivo.codigo_tema && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-mono font-bold">
                          {temaMalhaAtivo.codigo_tema}
                        </span>
                      )}
                      {temaMalhaAtivo.nome_pilar && (
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-[#5B1F8A] text-xs font-bold">
                          {temaMalhaAtivo.nome_pilar}
                        </span>
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Malha de Conteúdo do Tema
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">
                      {temaMalhaAtivo.titulo_tema}
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {temaMalhaAtivo.dor_do_publico}
                    </p>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>Completude da malha (Canais adaptados)</span>
                        <span>
                          <strong className="text-slate-800">
                            {canaisProduzidos.length}
                          </strong>
                          /5 formatos produzidos
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5B1F8A] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-4 text-xs">
                        {TODOS_CANAIS.map((c) => {
                          const tem = canaisProduzidos.includes(c.id);
                          return (
                            <span
                              key={c.id}
                              className={
                                tem
                                  ? "text-slate-800 font-semibold flex items-center gap-1"
                                  : "text-slate-400 flex items-center gap-1"
                              }
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  tem ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              />
                              {c.curto}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ÁRVORE DA MALHA: PEÇA-ÂNCORA (BLOG) + DERIVADAS PENDURADAS */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                    {/* CARD DA MATÉRIA DE BLOG ÂNCORA */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                            📖 MATÉRIA DE BLOG
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                            Peça-Âncora (Padrão AEO / SEO / GEO)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            Artigo Completo Pronto
                          </span>
                        </div>
                        <p className="text-base font-bold text-slate-900">
                          {temaMalhaAtivo.titulo_tema}
                        </p>
                        <p className="text-xs text-slate-600">
                          Declaração direta na 1ª frase visível + Espinha dorsal com dados WFDSA/ABEVD/Zuora + 5 Critérios Técnicos + Perspectiva da Eloss + 6 Perguntas de FAQ AEO.
                        </p>
                      </div>
                      <button
                        onClick={() => abrirMateriaDoTema(temaMalhaAtivo)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 shadow-xs transition-colors cursor-pointer"
                      >
                        📖 Abrir matéria completa →
                      </button>
                    </div>

                    {/* PEÇAS DERIVADAS PENDURADAS (CARROSSEL, POST SIMPLES, REELS, STORY) */}
                    {pecasSociais.length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-indigo-200 space-y-3">
                        {pecasSociais.map((peca) => {
                          const cfg = TODOS_CANAIS.find(
                            (c) => c.id === peca.formato_canal
                          );
                          const slides = peca.conteudo_estruturado?.slides || [];
                          return (
                            <div
                              key={peca.id}
                              className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 hover:border-purple-300 transition-all"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="space-y-1.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      style={{
                                        backgroundColor: cfg?.corBg,
                                        color: cfg?.corTexto,
                                      }}
                                      className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase"
                                    >
                                      {cfg?.curto || peca.formato_canal}
                                    </span>
                                    {slides.length > 0 && (
                                      <span className="px-2 py-0.5 rounded-md bg-[#382060] text-white text-[11px] font-semibold">
                                        {slides.length} Lâminas Dark Tech
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                        peca.status === "peca_pronta"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : peca.status === "reprovada_em_ajuste"
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {peca.status === "peca_pronta"
                                        ? "Aprovado"
                                        : peca.status === "reprovada_em_ajuste"
                                          ? "Em correção"
                                          : "Aguardando aprovação"}
                                    </span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {peca.titulo}
                                  </p>
                                  {slides.length > 0 ? (
                                    <div className="pt-1 space-y-1">
                                      <p className="text-xs text-slate-700">
                                        <strong>Capa (Slide 1):</strong> &ldquo;
                                        {slides[0].headline}&rdquo;
                                      </p>
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {slides.slice(0, 5).map((s) => (
                                          <span
                                            key={s.ordem}
                                            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-600"
                                          >
                                            <strong>S{s.ordem}:</strong>{" "}
                                            {s.headline.slice(0, 32)}…
                                          </span>
                                        ))}
                                        {slides.length > 5 && (
                                          <span className="px-2 py-0.5 rounded bg-purple-50 text-[#5B1F8A] text-[11px] font-semibold">
                                            +{slides.length - 5} slides
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-600">
                                      {peca.briefing.pauta_central}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={() => setModalDemandaId(peca.id)}
                                  className="px-4 py-2.5 rounded-xl bg-[#5B1F8A] hover:bg-[#46166b] text-white text-xs font-bold shrink-0 shadow-xs transition-colors cursor-pointer"
                                >
                                  {peca.formato_canal === "carrossel"
                                    ? `🎨 Abrir carrossel (${slides.length || 8} slides) →`
                                    : "Abrir peça completa →"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CANAIS QUE FALTAM NESTA MALHA */}
                  {canaisFaltantes.length > 0 && (
                    <div className="space-y-3">
                      {canaisFaltantes.map((c) => {
                        const adapt = temaMalhaAtivo.adaptacoes_canais?.[c.id];
                        return (
                          <div
                            key={c.id}
                            className="bg-white border border-dashed border-slate-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {c.curto}{" "}
                                <span className="font-normal text-slate-400">
                                  — falta nesta malha
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {adapt?.estrutura_sugerida || c.proposito}
                              </p>
                            </div>
                            <button
                              disabled={actionLoading}
                              onClick={() =>
                                gerarCanalIndividualNaMalha(
                                  temaMalhaAtivo,
                                  c.id
                                )
                              }
                              className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5B1F8A] text-xs font-bold shrink-0 transition-colors cursor-pointer"
                            >
                              + Gerar {c.curto}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ===================================================================
            TELA 3: PEÇAS (KANBAN DE 4 COLUNAS POR CANAL)
        =================================================================== */}
        {activeSection === "pecas" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Peças em Produção
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Clique em qualquer card para abrir a Matéria de Blog completa ou o Estúdio Visual de Carrossel (8 lâminas Dark Tech).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setFiltroCanalPecas("todos")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filtroCanalPecas === "todos"
                      ? "bg-[#382060] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Todos ({contexto.demandas.length})
                </button>
                {TODOS_CANAIS.map((c) => {
                  const count = contexto.demandas.filter(
                    (d) => d.formato_canal === c.id
                  ).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setFiltroCanalPecas(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        filtroCanalPecas === c.id
                          ? "bg-[#382060] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {c.curto} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const pecasFiltradas =
                filtroCanalPecas === "todos"
                  ? contexto.demandas
                  : contexto.demandas.filter(
                      (d) => d.formato_canal === filtroCanalPecas
                    );

              const colunas = [
                {
                  id: "rascunho",
                  titulo: "EM CRIAÇÃO / RASCUNHO",
                  corDot: "bg-slate-400",
                  itens: pecasFiltradas.filter(
                    (d) =>
                      d.status === "em_producao" ||
                      d.status === "briefing_recebido"
                  ),
                },
                {
                  id: "aguardando",
                  titulo: "AGUARDANDO APROVAÇÃO",
                  corDot: "bg-amber-500",
                  itens: pecasFiltradas.filter((d) => d.status === "em_gate"),
                },
                {
                  id: "correcao",
                  titulo: "EM CORREÇÃO",
                  corDot: "bg-rose-500",
                  itens: pecasFiltradas.filter(
                    (d) =>
                      d.status === "reprovada_em_ajuste" ||
                      d.status === "ambiguidade_escalada"
                  ),
                },
                {
                  id: "aprovado",
                  titulo: "APROVADO / PRONTO",
                  corDot: "bg-emerald-500",
                  itens: pecasFiltradas.filter(
                    (d) =>
                      d.status === "peca_pronta" || d.status === "publicada"
                  ),
                },
              ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {colunas.map((col) => (
                    <div
                      key={col.id}
                      className="bg-slate-100/80 border border-slate-200/70 rounded-2xl p-3.5 flex flex-col min-h-[420px]"
                    >
                      <div className="flex items-center justify-between px-1 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${col.corDot}`}
                          />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            {col.titulo}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-700 border border-slate-200">
                          {col.itens.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 flex-1">
                        {col.itens.length === 0 ? (
                          <div className="h-32 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                            Nenhuma peça
                          </div>
                        ) : (
                          col.itens.map((peca) => {
                            const cfg = TODOS_CANAIS.find(
                              (c) => c.id === peca.formato_canal
                            );
                            const qtdSlides =
                              peca.conteudo_estruturado?.slides?.length || 0;
                            return (
                              <div
                                key={peca.id}
                                onClick={() => setModalDemandaId(peca.id)}
                                className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-[#5B1F8A] hover:shadow-md transition-all cursor-pointer space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    style={{
                                      backgroundColor: cfg?.corBg,
                                      color: cfg?.corTexto,
                                    }}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                                  >
                                    {cfg?.curto || peca.formato_canal}
                                  </span>
                                  {qtdSlides > 0 && (
                                    <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded">
                                      {qtdSlides} slides
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-bold text-slate-900 leading-snug">
                                  {peca.titulo}
                                </p>

                                <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-[#5B1F8A]">
                                  <span>
                                    {peca.formato_canal === "blog"
                                      ? "📖 Ler / Editar Matéria →"
                                      : peca.formato_canal === "carrossel"
                                        ? "🎨 Ver 8 Slides Dark Tech →"
                                        : "Abrir peça →"}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ===================================================================
            TELA 4: FILA DE VALIDAÇÃO
        =================================================================== */}
        {activeSection === "fila_validacao" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Fila de Validação
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Peças que já foram escritas pelos agentes da Eloss e aguardam sua aprovação humana.
              </p>
            </div>

            {pecasAguardandoValidacao.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
                <p className="text-base font-bold text-slate-800">
                  Tudo em dia por aqui! 🎉
                </p>
                <p className="text-xs text-slate-500">
                  Nenhuma peça aguardando aprovação no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pecasAguardandoValidacao.map((peca) => {
                  const cfg = TODOS_CANAIS.find(
                    (c) => c.id === peca.formato_canal
                  );
                  const slides = peca.conteudo_estruturado?.slides || [];
                  return (
                    <div
                      key={peca.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              backgroundColor: cfg?.corBg,
                              color: cfg?.corTexto,
                            }}
                            className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase"
                          >
                            {cfg?.curto}
                          </span>
                          {slides.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-[#382060] text-white text-[11px] font-semibold">
                              {slides.length} Lâminas prontas
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            Aguardando sua validação
                          </span>
                        </div>
                        <p className="text-base font-bold text-slate-900">
                          {peca.titulo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {peca.briefing.pauta_central}
                        </p>
                      </div>

                      <button
                        onClick={() => setModalDemandaId(peca.id)}
                        className="px-4 py-2.5 rounded-xl bg-[#5B1F8A] hover:bg-[#46166b] text-white text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Revisar e Aprovar →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TELA 5: PESQUISA (CONECTADA AOS 4 MOTORES E 6 PILARES DA ELOSS)
        =================================================================== */}
        {activeSection === "pesquisa" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Pesquisa de Temas Conectada à Base da Eloss
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Toda pesquisa consulta obrigatoriamente o Posicionamento Canônico, a Base Factual (VTP / VCE / 5 Planos), o Público Decisor B2B e os 6 Pilares da Eloss.
              </p>
            </div>

            {/* OS 4 MOTORES REAIS DA ELOSS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contexto.insumos_radar.map((insumo) => (
                <div
                  key={insumo.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5B1F8A]">
                        {insumo.nome_engrenagem}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {insumo.status_conexao}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {insumo.diagnostico_atual}
                    </p>
                    <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-slate-700">
                      <strong className="text-purple-950 block mb-0.5">
                        Pauta sugerida para a Eloss:
                      </strong>
                      {insumo.oportunidade_pesquisa_sugerida}
                    </div>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={() =>
                      executarPesquisa(
                        insumo.oportunidade_pesquisa_sugerida,
                        insumo.tipo_engrenagem
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5B1F8A] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Gerar Temas desta Engrenagem →
                  </button>
                </div>
              ))}
            </div>

            {/* PESQUISA LIVRE ALINHADA À ELOSS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Ou pesquisar um assunto específico dentro da tese da Eloss
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={assuntoPesquisa}
                  onChange={(e) => setAssuntoPesquisa(e.target.value)}
                  placeholder="Ex.: Split de pagamento na recorrência, Migração White Label, Governança sem vínculo trabalhista..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <button
                  disabled={actionLoading}
                  onClick={() => executarPesquisa()}
                  className="px-5 py-2.5 rounded-xl bg-[#382060] hover:bg-[#4e2d82] text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  {actionLoading ? "Pesquisando..." : "Pesquisar e Sugerir Temas"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TELA 6: BASE DE CONHECIMENTO OFICIAL DA ELOSS (SINCRONIZADA DO SUPABASE)
        =================================================================== */}
        {activeSection === "base_marca" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  ● Conectado ao Supabase Eloss (28 Documentos de Regra + 6 Pilares)
                </span>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                  Base de Conhecimento Oficial — {contexto.marca_ativa.nome}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Estes são os documentos reais que governam os temas, os artigos AEO e os carrosséis Dark Tech da Eloss.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B1F8A]">
                  1. Posicionamento Canônico & 6 Pilares
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {contexto.base_conhecimento_ao_vivo.posicionamento}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B1F8A]">
                  2. Público-Alvo (Decisor B2B) & Objeções Reais
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {contexto.base_conhecimento_ao_vivo.publico}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B1F8A]">
                  3. Base Factual do Produto (VTP, VCE e 5 Planos)
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {contexto.base_conhecimento_ao_vivo.produtos_catalogo}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B1F8A]">
                  4. Tom de Comunicação, Padrão AEO & Identidade Dark Tech
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {contexto.base_conhecimento_ao_vivo.identidade_tom}
                </p>
              </div>
              <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-5 space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  5. Palavras Proibidas, Vocabulário de Consultoria Proibido & Critério de Formato
                </span>
                <p className="text-xs text-rose-900 leading-relaxed">
                  {contexto.base_conhecimento_ao_vivo.restricoes_conteudo}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          MODAL 1: DEMANDAR PARA CRIAÇÃO (SELEÇÃO DE CANAIS)
      ===================================================================== */}
      {temaParaDemandar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B1F8A]">
                  Produzir Malha Multicanal da Eloss
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {temaParaDemandar.codigo_tema
                    ? `${temaParaDemandar.codigo_tema} — `
                    : ""}
                  {temaParaDemandar.titulo_tema}
                </h2>
              </div>
              <button
                onClick={() => setTemaParaDemandar(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Selecione quais canais deseja produzir. A{" "}
              <strong>Matéria de Blog</strong> utiliza exatamente o{" "}
              <strong>Método Oficial da Malha de Conteúdos (redator.blog.artigo + Padrão AEO + Checagens)</strong>, e os{" "}
              <strong>Posts Sociais</strong> seguem a{" "}
              <strong>Estratégia GPT (Padrão)</strong> com o método da Malha como opcional:
            </p>

            {/* SELETOR DE MÉTODO PARA PRODUÇÃO DE POSTS SOCIAIS */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Estratégia de Produção do Post Social (Carrossel / Post Simples / Reels / Story)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  Blog = Método Malha Oficial
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMetodoGeracaoPost("gpt")}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    metodoGeracaoPost === "gpt"
                      ? "bg-[#382060] text-white border-[#382060] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      🤖 Estratégia GPT (Padrão)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F4834B] text-white font-bold">
                      Principal
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-1 leading-snug ${
                      metodoGeracaoPost === "gpt"
                        ? "text-purple-100"
                        : "text-slate-500"
                    }`}
                  >
                    OpenAI GPT-4o desdobra o artigo em lâminas densas + Prompt Visual de 8 Pontos (Anti-Mosaico) para gpt-image-1.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoGeracaoPost("malha_legado")}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    metodoGeracaoPost === "malha_legado"
                      ? "bg-[#382060] text-white border-[#382060] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      🕸️ Método Malha (Opcional)
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        metodoGeracaoPost === "malha_legado"
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Opcional
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-1 leading-snug ${
                      metodoGeracaoPost === "malha_legado"
                        ? "text-purple-100"
                        : "text-slate-500"
                    }`}
                  >
                    Método alternativo do sistema Malha (redator.instagram.plano + prompt_fundo sem texto + Componentes H2).
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {TODOS_CANAIS.map((c) => {
                const checked = canaisParaDemandar.includes(c.id);
                const adapt = temaParaDemandar.adaptacoes_canais?.[c.id];
                return (
                  <label
                    key={c.id}
                    onClick={() =>
                      setCanaisParaDemandar((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((x) => x !== c.id)
                          : [...prev, c.id]
                      )
                    }
                    className={`block p-4 rounded-xl border transition-all cursor-pointer ${
                      checked
                        ? "bg-purple-50/60 border-[#5B1F8A] ring-1 ring-[#5B1F8A]"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="rounded text-[#5B1F8A]"
                        />
                        <span className="text-sm font-bold text-slate-900">
                          {c.label}
                        </span>
                      </div>
                      <span
                        style={{
                          backgroundColor: c.corBg,
                          color: c.corTexto,
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      >
                        {c.curto}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 pl-6">
                      {adapt?.angulo_adaptado || c.proposito}
                    </p>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setTemaParaDemandar(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                disabled={actionLoading || canaisParaDemandar.length === 0}
                onClick={confirmarDemandaCriacao}
                className="px-5 py-2.5 rounded-xl bg-[#5B1F8A] hover:bg-[#46166b] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {actionLoading
                  ? "Produzindo peças..."
                  : `Produzir ${canaisParaDemandar.length} Canal(is) Selecionado(s) →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: LEITOR & ESTÚDIO VISUAL COMPLETO DA PEÇA
          - Se for BLOG: Abre a Matéria de Blog completa e formatada + Editor + FAQ AEO
          - Se for CARROSSEL: Abre o Estúdio Visual de 8 Slides Dark Tech Eloss + Legenda
          - Se for POST SIMPLES / REELS / STORY: Abre o preview visual dedicado
      ===================================================================== */}
      {modalDemanda && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-6xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[94vh] overflow-y-auto">
            {/* TOPO DO MODAL */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-[#382060] text-white">
                    {modalDemanda.formato_canal === "blog"
                      ? "📖 MATÉRIA DE BLOG (PEÇA-ÂNCORA AEO)"
                      : modalDemanda.formato_canal === "carrossel"
                        ? "🎨 CARROSSEL INSTAGRAM (DARK TECH ELOSS)"
                        : modalDemanda.formato_canal.toUpperCase()}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      modalDemanda.status === "peca_pronta"
                        ? "bg-emerald-100 text-emerald-800"
                        : modalDemanda.status === "reprovada_em_ajuste"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {modalDemanda.status === "peca_pronta"
                      ? "Aprovado / Pronto"
                      : modalDemanda.status === "reprovada_em_ajuste"
                        ? "Em Correção"
                        : "Aguardando Aprovação"}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  {modalDemanda.titulo}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    salvarOuAprovarPecaNoModal(
                      modalDemanda.id,
                      "reprovada_em_ajuste"
                    )
                  }
                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                >
                  Pedir Correção
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    salvarOuAprovarPecaNoModal(modalDemanda.id, "peca_pronta")
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  ✓ Aprovar Peça
                </button>
                <button
                  onClick={() => setModalDemandaId(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ===============================================================
                BARRA DE MÉTODO / ESTRATÉGIA DE PRODUÇÃO DA PEÇA
            =============================================================== */}
            {modalDemanda.formato_canal === "blog" ? (
              <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-[#382060] text-white text-[11px] font-bold">
                    🕸️ Método Malha de Conteúdos (Oficial)
                  </span>
                  <span className="text-xs text-indigo-950 font-medium">
                    Skill <strong>redator.blog.artigo</strong> + Direção da Marca + Padrão AEO + Pesquisa Prévia + Checagens ({markdownBlogEditavel.length.toLocaleString("pt-BR")} caracteres)
                  </span>
                </div>
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    regenerarPecaComMetodo(modalDemanda.id, undefined, true)
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-[#5B1F8A] hover:bg-[#46166b] text-white text-xs font-bold cursor-pointer"
                >
                  {actionLoading
                    ? "Gerando com IA..."
                    : "✨ Regenerar Matéria com IA (Método Malha)"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-purple-50/90 border border-purple-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-[#382060] text-white text-[11px] font-bold">
                      {modalDemanda.conteudo_estruturado?.metodo_geracao ===
                      "malha_legado"
                        ? "🕸️ Método Malha (Opcional Ativo)"
                        : "🤖 Estratégia GPT — Plano ChatGPT + MCP (Zero API)"}
                    </span>
                    <span className="text-xs text-purple-950 font-medium">
                      Use seu <strong>Plano ChatGPT (chatgpt.com)</strong> sem gastar API: copie o prompt completo de uma vez e sincronize de volta via MCP ou 1 clique!
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        copiarSuperPromptPlanoChatGpt(
                          modalDemanda.id,
                          "completo",
                          false
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#382060] hover:bg-[#4c2b82] text-white cursor-pointer shadow-2xs"
                    >
                      📋 Copiar Super-Prompt Completo (Post Todo)
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        copiarSuperPromptPlanoChatGpt(
                          modalDemanda.id,
                          "somente_artes",
                          false
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#5B1F8A] hover:bg-[#46166b] text-white cursor-pointer shadow-2xs"
                    >
                      🎨 Copiar os 8 Prompts de Arte (1 a 8)
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        copiarSuperPromptPlanoChatGpt(
                          modalDemanda.id,
                          "completo",
                          true
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F4834B] hover:bg-[#e06d35] text-white cursor-pointer shadow-2xs"
                    >
                      🚀 Copiar Tudo + Abrir Meu ChatGPT
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarPonteChatGptMcp((prev) => !prev)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        mostrarPonteChatGptMcp
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      🔄 Sincronizar do ChatGPT / MCP
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        regenerarPecaComMetodo(
                          modalDemanda.id,
                          modalDemanda.conteudo_estruturado?.metodo_geracao ===
                            "malha_legado"
                            ? "gpt"
                            : "malha_legado",
                          false
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      {modalDemanda.conteudo_estruturado?.metodo_geracao ===
                      "malha_legado"
                        ? "Voltar p/ Estratégia GPT"
                        : "🕸️ Ver Método Malha (Opcional)"}
                    </button>
                  </div>
                </div>

                {/* PAINEL EXPANSÍVEL: PONTE PLANO CHATGPT + INTEGRAÇÃO MCP */}
                {mostrarPonteChatGptMcp && (
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-emerald-950">
                          ⚡ Sincronização Automática com seu Plano ChatGPT (Sem consumir créditos de API)
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Depois de ajustar o carrossel no seu ChatGPT, peça para ele atualizar via <strong>MCP</strong> (ou cole a resposta/JSON dele abaixo para atualizar todos os 8 slides e a legenda de uma só vez).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarConfigMcp((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                      >
                        {mostrarConfigMcp
                          ? "Ocultar Conexão MCP"
                          : "🔌 Como conectar via MCP / GPT Action"}
                      </button>
                    </div>

                    {mostrarConfigMcp && (
                      <div className="bg-white border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
                        <p className="font-bold text-slate-900">
                          Como o ChatGPT atualiza o sistema automaticamente via MCP ou Custom GPT Action:
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          1. <strong>Via Servidor MCP Local (ChatGPT Desktop / Claude / Cursor):</strong> adicione o servidor MCP apontando para{" "}
                          <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px]">
                            node c:\projetos\motor-marketing\mcp-server-eloss.mjs
                          </code>{" "}
                          (ou endpoint HTTP JSON-RPC{" "}
                          <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px]">
                            http://localhost:3005/api/mcp-gpt
                          </code>
                          ). Quando você disser <em>&quot;Atualize esse carrossel no sistema da Eloss&quot;</em>, ele chama a tool{" "}
                          <code>atualizar_post_no_sistema_eloss</code> sozinho!
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          2. <strong>Via Custom GPT Action (No navegador em chatgpt.com):</strong> importe o schema OpenAPI disponível em{" "}
                          <a
                            href="/api/mcp-gpt?schema=openapi"
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 underline font-semibold"
                          >
                            http://localhost:3005/api/mcp-gpt?schema=openapi
                          </a>
                          .
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        placeholder='Cole aqui a resposta do seu ChatGPT (com o bloco JSON dos slides) e clique em "Atualizar Post no Sistema Automaticamente"...'
                        value={textoRetornoChatGpt}
                        onChange={(e) => setTextoRetornoChatGpt(e.target.value)}
                        className="w-full rounded-xl border border-emerald-300 bg-white p-3 font-mono text-xs text-slate-800"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={
                            actionLoading || !textoRetornoChatGpt.trim()
                          }
                          onClick={() =>
                            sincronizarRetornoDoChatGpt(modalDemanda.id)
                          }
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                        >
                          {actionLoading
                            ? "Sincronizando..."
                            : "⚡ Atualizar Todos os Slides e Legenda no Sistema"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===============================================================
                CASO 1: MATÉRIA DE BLOG COMPLETA (LEITURA FORMATADA + EDITOR)
            =============================================================== */}
            {modalDemanda.formato_canal === "blog" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAbaModalBlog("leitura")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          abaModalBlog === "leitura"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        📖 Leitura da Matéria Formatada
                      </button>
                      <button
                        onClick={() => setAbaModalBlog("editar")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          abaModalBlog === "editar"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        ✏️ Editar Texto Completo (Markdown)
                      </button>
                    </div>
                    {abaModalBlog === "editar" && (
                      <button
                        disabled={actionLoading}
                        onClick={() =>
                          salvarOuAprovarPecaNoModal(modalDemanda.id)
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#5B1F8A] text-white text-xs font-bold cursor-pointer"
                      >
                        Salvar Texto
                      </button>
                    )}
                  </div>

                  {abaModalBlog === "leitura" ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs">
                      <ArtigoBlogRenderer markdown={markdownBlogEditavel} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        rows={22}
                        value={markdownBlogEditavel}
                        onChange={(e) =>
                          setMarkdownBlogEditavel(e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-300 p-4 font-mono text-xs text-slate-800 leading-relaxed focus:border-[#5B1F8A] outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* COLUNA LATERAL: PADRÃO AEO & CHECAGENS DA ELOSS */}
                <div className="space-y-4">
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                      Padrão AEO Eloss Aplicado
                    </span>
                    <p className="text-xs text-indigo-950 leading-relaxed">
                      • Conceito declarado explicitamente na <strong>1ª frase visível</strong> (resposta direta para IAs e Google).
                      <br />• Byline assinada pela Equipe Editorial Eloss.
                      <br />• Termos proprietários (<strong>VTP, VCE, Recorrência Distribuída, Plataforma Operacional de Crescimento</strong>) com definição exata.
                      <br />• <strong>6 Perguntas de FAQ</strong> divididas em definitórias, decisão e operacionais.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Checagens Automáticas da Marca Eloss
                    </span>
                    {(modalDemanda.conteudo_estruturado?.checagens || []).map(
                      (c, i) => (
                        <div
                          key={i}
                          className="bg-white rounded-xl p-3 border border-slate-200/80 flex items-start gap-2.5"
                        >
                          <span className="text-emerald-600 font-bold text-sm mt-0.5">
                            ✓
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {c.nome}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {c.detalhe}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                CASO 2: ESTÚDIO VISUAL DE CARROSSEL (8 LÂMINAS DARK TECH ELOSS)
            =============================================================== */}
            {modalDemanda.formato_canal === "carrossel" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUNA ESQUERDA (5 cols): SIMULADOR VISUAL DO SLIDE NO INSTAGRAM */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Preview do Carrossel ({slideAtivoIdx + 1}/
                      {slidesEditaveis.length || 8})
                    </span>
                    {slidesEditaveis[slideAtivoIdx]?.imagem_url && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() => setModoVisualizacaoSlide("imagem_ia")}
                          className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                            modoVisualizacaoSlide === "imagem_ia"
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-600"
                          }`}
                        >
                          Arte Supabase
                        </button>
                        <button
                          onClick={() => setModoVisualizacaoSlide("card_eloss")}
                          className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                            modoVisualizacaoSlide === "card_eloss"
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-600"
                          }`}
                        >
                          Layout Editável
                        </button>
                      </div>
                    )}
                  </div>

                  {/* MOLDURA DO INSTAGRAM + SLIDE 4:5 DARK TECH ELOSS */}
                  {(() => {
                    const slideAtual = slidesEditaveis[slideAtivoIdx] || {
                      ordem: 1,
                      tipo: "capa",
                      headline: modalDemanda.titulo,
                      headline_destaque: "",
                      corpo: modalDemanda.briefing.pauta_central,
                      cta: "",
                      direcao_visual: "Modo Escuro #0A0820",
                    };

                    return (
                      <div className="max-w-[380px] mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
                        {/* Header Instagram */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{
                                background:
                                  "linear-gradient(135deg, #382060, #5B1F8A, #F4834B)",
                              }}
                            >
                              E
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 leading-none">
                                plataformaeloss
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Plataforma Operacional de Crescimento
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">
                            {slideAtivoIdx + 1}/{slidesEditaveis.length}
                          </span>
                        </div>

                        {/* Área 4:5 do Slide */}
                        <div className="relative aspect-4/5 bg-[#0A0820] overflow-hidden flex flex-col justify-between p-6 text-white select-none">
                          {modoVisualizacaoSlide === "imagem_ia" &&
                          slideAtual.imagem_url ? (
                            <img
                              src={slideAtual.imagem_url}
                              alt={`Slide ${slideAtivoIdx + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              {/* Glows Atmosféricos Dark Tech Eloss (#5B1F8A + #F4834B) */}
                              <div
                                className="absolute -top-16 -left-16 w-56 h-56 rounded-full opacity-45 blur-3xl pointer-events-none"
                                style={{ background: "#5B1F8A" }}
                              />
                              <div
                                className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-35 blur-3xl pointer-events-none"
                                style={{ background: "#F4834B" }}
                              />
                              {/* Dot Matrix sutil no canto superior esquerdo */}
                              <div
                                className="absolute top-4 left-4 w-16 h-16 opacity-20 pointer-events-none"
                                style={{
                                  backgroundImage:
                                    "radial-gradient(#C77DE0 1.2px, transparent 1.2px)",
                                  backgroundSize: "8px 8px",
                                }}
                              />

                              {/* Topo do Slide */}
                              <div className="relative z-10 flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[#C77DE0]/40 text-[#C77DE0] bg-white/5">
                                  {slideAtual.tipo === "capa"
                                    ? "ELOSS · ARQUITETURA"
                                    : slideAtual.tipo === "dado"
                                      ? "DADO DO SETOR"
                                      : slideAtual.tipo === "cta"
                                        ? "PLATAFORMA ELOSS"
                                        : `CRITÉRIO ${slideAtual.ordem - 1}`}
                                </span>
                                <span className="text-[11px] font-bold text-white/60">
                                  0{slideAtual.ordem}
                                </span>
                              </div>

                              {/* Miolo Tipográfico: Headline Poppins + Gradiente + Barra Vertical #F4834B */}
                              <div className="relative z-10 space-y-4 my-auto py-4">
                                <h3 className="text-[21px] font-extrabold leading-[1.15] tracking-tight text-white">
                                  {renderHeadlineComGradiente(
                                    slideAtual.headline,
                                    slideAtual.headline_destaque
                                  )}
                                </h3>

                                <div className="pl-3.5 border-l-2 border-[#F4834B]">
                                  <p className="text-[13px] text-[#E2DCF0] leading-relaxed font-normal">
                                    {slideAtual.corpo}
                                  </p>
                                </div>

                                {slideAtual.cta && (
                                  <div className="pt-2">
                                    <span
                                      className="inline-block px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm"
                                      style={{
                                        background:
                                          "linear-gradient(90deg, #5B1F8A 0%, #9B2E8A 50%, #F4834B 100%)",
                                      }}
                                    >
                                      {slideAtual.cta}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Rodapé do Slide: Contador + Dots */}
                              <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-white/60">
                                  eloss
                                </span>
                                <div className="flex items-center gap-1">
                                  {slidesEditaveis.map((_, idx) => (
                                    <span
                                      key={idx}
                                      className={`h-1.5 rounded-full transition-all ${
                                        idx === slideAtivoIdx
                                          ? "w-4 bg-[#F4834B]"
                                          : "w-1.5 bg-white/30"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Botões Setas Anterior / Próximo Slide */}
                          {slideAtivoIdx > 0 && (
                            <button
                              onClick={() => setSlideAtivoIdx((s) => s - 1)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center font-bold cursor-pointer"
                            >
                              ‹
                            </button>
                          )}
                          {slideAtivoIdx < slidesEditaveis.length - 1 && (
                            <button
                              onClick={() => setSlideAtivoIdx((s) => s + 1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center font-bold cursor-pointer"
                            >
                              ›
                            </button>
                          )}
                        </div>

                        {/* Barra de Miniaturas dos 8 Slides */}
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
                          {slidesEditaveis.map((s, idx) => (
                            <button
                              key={s.ordem}
                              onClick={() => setSlideAtivoIdx(idx)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                                idx === slideAtivoIdx
                                  ? "bg-[#382060] text-white"
                                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              S{s.ordem}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* COLUNA DIREITA (7 cols): EDITOR DE CADA SLIDE + LEGENDA + CHECAGENS */}
                <div className="lg:col-span-7 space-y-5">
                  {slidesEditaveis[slideAtivoIdx] && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#5B1F8A]">
                          Editando Lâmina {slideAtivoIdx + 1} de{" "}
                          {slidesEditaveis.length} (
                          {slidesEditaveis[slideAtivoIdx].tipo.toUpperCase()})
                        </span>
                        <button
                          disabled={actionLoading}
                          onClick={() =>
                            salvarOuAprovarPecaNoModal(modalDemanda.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#382060] hover:bg-[#4e2d82] text-white text-xs font-bold cursor-pointer"
                        >
                          Salvar Alterações dos Slides
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Headline do Slide (Poppins ExtraBold)
                          </label>
                          <input
                            type="text"
                            value={slidesEditaveis[slideAtivoIdx].headline}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlidesEditaveis((prev) =>
                                prev.map((sl, i) =>
                                  i === slideAtivoIdx
                                    ? { ...sl, headline: val }
                                    : sl
                                )
                              );
                            }}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Trecho em Gradiente da Marca (#5B1F8A → #F4834B — apenas 1 trecho por slide)
                          </label>
                          <input
                            type="text"
                            value={
                              slidesEditaveis[slideAtivoIdx]
                                .headline_destaque || ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlidesEditaveis((prev) =>
                                prev.map((sl, i) =>
                                  i === slideAtivoIdx
                                    ? { ...sl, headline_destaque: val }
                                    : sl
                                )
                              );
                            }}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Corpo do Slide (DM Sans — tom afirmativo, sem gerúndio)
                          </label>
                          <textarea
                            rows={3}
                            value={slidesEditaveis[slideAtivoIdx].corpo}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlidesEditaveis((prev) =>
                                prev.map((sl, i) =>
                                  i === slideAtivoIdx
                                    ? { ...sl, corpo: val }
                                    : sl
                                )
                              );
                            }}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 leading-relaxed"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="block text-[11px] font-bold text-slate-700">
                              {slidesEditaveis[slideAtivoIdx].prompt_imagem
                                ? "🤖 Prompt Visual de 8 Pontos (Para usar no seu Plano ChatGPT — Sem Mosaico)"
                                : "🕸️ Direção Visual / Prompt de Fundo (Método Malha H2)"}
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  const txt =
                                    slidesEditaveis[slideAtivoIdx]
                                      .prompt_imagem ||
                                    slidesEditaveis[slideAtivoIdx]
                                      .prompt_fundo ||
                                    slidesEditaveis[slideAtivoIdx]
                                      .direcao_visual;
                                  navigator.clipboard.writeText(txt);
                                  setToastMsg({
                                    texto: `Prompt de 8 pontos do Slide ${slideAtivoIdx + 1} copiado! Cole (Ctrl+V) no seu ChatGPT.`,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                              >
                                📋 Copiar Prompt deste Slide
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  copiarSuperPromptPlanoChatGpt(
                                    modalDemanda.id,
                                    "somente_artes",
                                    true
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#5B1F8A] hover:bg-[#46166b] text-white text-[11px] font-bold cursor-pointer"
                              >
                                🚀 Copiar 8 Prompts + Abrir Meu ChatGPT
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={4}
                            value={
                              slidesEditaveis[slideAtivoIdx].prompt_imagem ||
                              slidesEditaveis[slideAtivoIdx].prompt_fundo ||
                              slidesEditaveis[slideAtivoIdx].direcao_visual
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlidesEditaveis((prev) =>
                                prev.map((sl, i) =>
                                  i === slideAtivoIdx
                                    ? {
                                        ...sl,
                                        prompt_imagem: val,
                                        direcao_visual: val,
                                      }
                                    : sl
                                )
                              );
                            }}
                            className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-[11px] text-slate-700 leading-relaxed"
                          />

                          {/* ÁREA DE ANEXAR / COLAR (CTRL+V) A ARTE GERADA NO PLANO CHATGPT */}
                          <div
                            tabIndex={0}
                            onPaste={(e) => {
                              const items = e.clipboardData?.items;
                              if (!items) return;
                              for (const item of Array.from(items)) {
                                if (item.type.startsWith("image/")) {
                                  const blob = item.getAsFile();
                                  if (blob) {
                                    e.preventDefault();
                                    anexarArteDoChatGptNoSlide(
                                      modalDemanda.id,
                                      slidesEditaveis[slideAtivoIdx].ordem,
                                      blob
                                    );
                                  }
                                }
                              }
                            }}
                            className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-50/70 border border-dashed border-indigo-300 text-xs text-indigo-950 focus:ring-2 focus:ring-[#5B1F8A] outline-none"
                          >
                            <span className="text-[11px] font-medium">
                              🖼️ <strong>Gerou a arte no seu ChatGPT?</strong> Clique aqui e dê <strong>Ctrl+V</strong> para colar a imagem do Slide {slideAtivoIdx + 1} direto no sistema:
                            </span>
                            <label className="px-3 py-1 rounded-lg bg-[#382060] hover:bg-[#4c2b82] text-white text-[11px] font-bold cursor-pointer shrink-0">
                              📥 Escolher Imagem do Computador
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    anexarArteDoChatGptNoSlide(
                                      modalDemanda.id,
                                      slidesEditaveis[slideAtivoIdx].ordem,
                                      file
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {slidesEditaveis[slideAtivoIdx].componentes &&
                            slidesEditaveis[slideAtivoIdx].componentes!.length >
                              0 && (
                              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-950">
                                <strong>Componentes H2 (Método Malha):</strong>{" "}
                                {slidesEditaveis[slideAtivoIdx].componentes!.map(
                                  (comp, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block mr-2 px-2 py-0.5 rounded bg-white border border-purple-200 font-semibold"
                                    >
                                      {comp.tipo}:{" "}
                                      {Object.values(comp.dados).join(" · ")}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LEGENDA DO POST NO INSTAGRAM */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Legenda Completa do Carrossel (Instagram)
                    </label>
                    <textarea
                      rows={6}
                      value={legendaEditavel}
                      onChange={(e) => setLegendaEditavel(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* CHECAGENS DA MARCA ELOSS */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block mb-2">
                      ✓ Checagens de Qualidade & Regras da Eloss
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(modalDemanda.conteudo_estruturado?.checagens || []).map(
                        (c, i) => (
                          <div
                            key={i}
                            className="bg-white rounded-xl p-2.5 border border-emerald-100 text-xs"
                          >
                            <p className="font-bold text-slate-800">
                              ✓ {c.nome}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {c.detalhe}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                CASO 3: POST SIMPLES / REELS / STORY
            =============================================================== */}
            {modalDemanda.formato_canal !== "blog" &&
              modalDemanda.formato_canal !== "carrossel" && (
                <div className="space-y-4">
                  {modalDemanda.formato_canal === "post_simples" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#0A0820] text-white rounded-2xl p-8 aspect-4/5 flex flex-col justify-between relative overflow-hidden">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#C77DE0]">
                          ELOSS · DECLARAÇÃO TÉCNICA
                        </span>
                        <div className="space-y-4 my-auto">
                          <h3 className="text-2xl font-extrabold leading-tight">
                            {renderHeadlineComGradiente(
                              modalDemanda.conteudo_estruturado
                                ?.headline_arte || modalDemanda.titulo,
                              modalDemanda.conteudo_estruturado
                                ?.destaque_gradiente
                            )}
                          </h3>
                          <p className="text-sm text-[#E2DCF0] pl-3.5 border-l-2 border-[#F4834B]">
                            {modalDemanda.conteudo_estruturado
                              ?.subtitulo_arte ||
                              modalDemanda.briefing.pauta_central}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-white/60">
                          plataformaeloss.com.br
                        </span>
                      </div>
                      <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase text-slate-700">
                          Legenda do Post Simples
                        </label>
                        <textarea
                          rows={10}
                          value={legendaEditavel}
                          onChange={(e) => setLegendaEditavel(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-800 leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {modalDemanda.formato_canal === "reels" && (
                    <div className="space-y-4">
                      {modalDemanda.conteudo_estruturado?.direcao_peca && (
                        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs font-medium text-purple-950">
                          {modalDemanda.conteudo_estruturado.direcao_peca}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(
                          modalDemanda.conteudo_estruturado?.roteiro_cenas || []
                        ).map((c, i) => (
                          <div
                            key={i}
                            className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-[#382060] text-white text-[11px] font-bold">
                                {c.tempo}
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {c.etapa}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed">
                              <strong>Fala:</strong> &ldquo;{c.fala}&rdquo;
                            </p>
                            <p className="text-[11px] text-[#5B1F8A] font-semibold">
                              Lettering em Tela: [{c.lettering_tela}]
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Direção: {c.direcao_camera}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {modalDemanda.formato_canal === "story" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(
                        modalDemanda.conteudo_estruturado?.telas_story || []
                      ).map((t) => (
                        <div
                          key={t.ordem}
                          className="bg-[#0A0820] text-white rounded-2xl p-5 aspect-9/16 flex flex-col justify-between border border-purple-900"
                        >
                          <span className="text-[10px] font-bold uppercase text-[#C77DE0]">
                            STORY {t.ordem}/4 · {t.objetivo}
                          </span>
                          <p className="text-sm font-bold leading-relaxed my-auto">
                            {t.texto_tela}
                          </p>
                          <div className="p-2.5 rounded-xl bg-white/10 border border-[#F4834B]/50 text-[11px] text-[#F4834B] font-semibold">
                            {t.elemento_interativo}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
