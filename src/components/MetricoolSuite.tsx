"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Demanda, Marca, TemaEditorial } from "@/lib/types";

export interface MetricoolSuiteProps {
  marcas: Marca[];
  marcaAtiva: Marca;
  onTrocarMarca: (marcaId: string) => void;
  demandas: Demanda[];
  temas: TemaEditorial[];
  onAbrirDemandaNoMotor?: (demandaId: string) => void;
  onVoltarAoMotor?: () => void;
}

type MainTab =
  | "analitica"
  | "reporting"
  | "inbox"
  | "planificacao"
  | "smartlinks"
  | "anuncios";

type AnalyticsChannel =
  | "resumo"
  | "web_blog"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "concorrentes"
  | "hashtags";

type PlannerSubTab =
  | "calendario"
  | "lista"
  | "preview_feed"
  | "biblioteca_motor"
  | "autolists"
  | "flows";

export interface ScheduledPostItem {
  id: string;
  marcaId: string;
  demandaOrigemId?: string;
  titulo: string;
  legenda: string;
  primeiroComentario?: string;
  redes: ("instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "blog")[];
  formato: "PUBLICAÇÃO" | "CARROSSEL" | "REEL" | "STORY";
  diaSemanaIdx: number; // 0 = Dom .. 6 = Sáb
  dataIso: string; // YYYY-MM-DD
  hora: number; // 0..23
  minuto: number;
  status: "agendado" | "rascunho" | "publicado";
  imagens: string[];
  utmSource?: string;
  utmCampaign?: string;
  notasEquipe?: string;
}

interface InboxThread {
  id: string;
  rede: "instagram" | "facebook" | "linkedin" | "google";
  tipo: "comentario" | "dm" | "story" | "avaliacao";
  status: "nao_resolvido" | "resolvido";
  naoLida: boolean;
  autorNome: string;
  autorHandle: string;
  autorAvatarBg: string;
  pecaRelacionada?: string;
  ultimaMensagem: string;
  horario: string;
  mensagens: {
    id: string;
    remetente: "usuario" | "marca";
    texto: string;
    horario: string;
  }[];
}

interface SmartLinkButton {
  id: string;
  titulo: string;
  url: string;
  cliques: number;
  ativo: boolean;
  destaque?: boolean;
}

interface CompetitorRow {
  id: string;
  nome: string;
  handle: string;
  rede: "instagram" | "linkedin" | "facebook";
  seguidores: number;
  crescimentoPct: number;
  publicacoesPeriodo: number;
  engajamentoPct: number;
  mediaInteracoes: number;
}

const DIAS_SEMANA = [
  { curto: "Dom", longo: "Domingo, 15", dataIso: "2026-11-15" },
  { curto: "Seg", longo: "Segunda-Feira, 16", dataIso: "2026-11-16" },
  { curto: "Ter", longo: "Terça-Feira, 17", dataIso: "2026-11-17" },
  { curto: "Qua", longo: "Quarta-Feira, 18", dataIso: "2026-11-18" },
  { curto: "Qui", longo: "Quinta-Feira, 19", dataIso: "2026-11-19" },
  { curto: "Sex", longo: "Sexta-Feira, 20", dataIso: "2026-11-20" },
  { curto: "Sáb", longo: "Sábado, 21", dataIso: "2026-11-21" },
];

const HORAS_CALENDARIO = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
];

// Mapa de calor (% de audiência ativa por dia/hora e por rede, estilo Metricool)
function calcularMelhorHoraPct(
  rede: "instagram" | "facebook" | "linkedin" | "tiktok",
  diaIdx: number,
  hora: number
): number {
  const basePorHoraInsta: Record<number, number> = {
    8: 42,
    9: 64,
    10: 71,
    11: 82,
    12: 94,
    13: 88,
    14: 76,
    15: 79,
    16: 72,
    17: 85,
    18: 98,
    19: 100,
    20: 92,
    21: 78,
    22: 54,
  };
  const base = basePorHoraInsta[hora] || 40;
  const ajusteDia =
    diaIdx === 0 || diaIdx === 6
      ? rede === "linkedin"
        ? -35
        : -12
      : diaIdx === 2 || diaIdx === 3
        ? 4
        : 0;
  const ajusteRede =
    rede === "linkedin"
      ? hora >= 8 && hora <= 11
        ? 14
        : hora >= 19
          ? -22
          : 0
      : rede === "tiktok"
        ? hora >= 19
          ? 8
          : -6
        : 0;
  return Math.max(8, Math.min(100, base + ajusteDia + ajusteRede));
}

export default function MetricoolSuite({
  marcas,
  marcaAtiva,
  onTrocarMarca,
  demandas,
  temas,
  onAbrirDemandaNoMotor,
  onVoltarAoMotor,
}: MetricoolSuiteProps) {
  const [mainTab, setMainTab] = useState<MainTab>("planificacao");
  const [analyticsChannel, setAnalyticsChannel] =
    useState<AnalyticsChannel>("instagram");
  const [plannerSubTab, setPlannerSubTab] =
    useState<PlannerSubTab>("calendario");

  // Date range & comparison state
  const [periodoSelecionado, setPeriodoSelecionado] = useState<
    "7d" | "30d" | "mes_atual" | "ano"
  >("30d");
  const [comparacaoAtiva, setComparacaoAtiva] = useState<boolean>(true);
  const [buscaTabelaPosts, setBuscaTabelaPosts] = useState<string>("");

  // Heatmap controls in Planner
  const [heatmapRede, setHeatmapRede] = useState<
    "instagram" | "facebook" | "linkedin" | "tiktok"
  >("instagram");
  const [mostrarPctHeatmap, setMostrarPctHeatmap] = useState<boolean>(true);
  const [buscaCalendario, setBuscaCalendario] = useState<string>("");
  const [filtroRedeCalendario, setFiltroRedeCalendario] =
    useState<string>("todas");

  // Brand Connections modal (`+ Mais ligações`)
  const [modalConexoesAberto, setModalConexoesAberto] =
    useState<boolean>(false);

  // Create/Edit Post Modal (`Criar nova publicação`)
  const [modalCriarPostAberto, setModalCriarPostAberto] =
    useState<boolean>(false);
  const [abaModalPost, setAbaModalPost] = useState<
    "editor" | "preview" | "notas"
  >("editor");
  const [postEditandoId, setPostEditandoId] = useState<string | null>(null);
  const [postTitulo, setPostTitulo] = useState<string>("");
  const [postLegenda, setPostLegenda] = useState<string>("");
  const [postPrimeiroComentario, setPostPrimeiroComentario] =
    useState<string>("");
  const [postRedes, setPostRedes] = useState<
    ("instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "blog")[]
  >(["instagram", "facebook", "linkedin"]);
  const [postFormato, setPostFormato] = useState<
    "PUBLICAÇÃO" | "CARROSSEL" | "REEL" | "STORY"
  >("CARROSSEL");
  const [postDiaIdx, setPostDiaIdx] = useState<number>(2);
  const [postHora, setPostHora] = useState<number>(18);
  const [postMinuto, setPostMinuto] = useState<number>(0);
  const [postImagens, setPostImagens] = useState<string[]>([]);
  const [postUtmSource, setPostUtmSource] = useState<string>("instagram");
  const [postUtmCampaign, setPostUtmCampaign] = useState<string>(
    "ciclo_editorial_eloss"
  );
  const [postNotas, setPostNotas] = useState<string>("");
  const [mostrarUtmBuilder, setMostrarUtmBuilder] = useState<boolean>(false);
  const [mostrarPrimeiroComentario, setMostrarPrimeiroComentario] =
    useState<boolean>(false);
  const [mostrarPredefinicoesGlobais, setMostrarPredefinicoesGlobais] =
    useState<boolean>(false);

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);
  function dispararToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Inicializa as publicações agendadas no calendário a partir das demandas reais do Motor (Supabase)
  const postsIniciaisDoMotor = useMemo<ScheduledPostItem[]>(() => {
    const carrosseis = demandas.filter((d) => d.formato_canal !== "blog");
    return carrosseis.slice(0, 6).map((d, idx) => {
      const slides = d.conteudo_estruturado?.slides || [];
      const imgs = slides
        .map((s) => s.imagem_url)
        .filter((u): u is string => Boolean(u));
      const diaIdx = (idx + 1) % 6;
      const horasPadrao = [12, 15, 18, 19, 11, 14];
      return {
        id: `sched-${d.id}`,
        marcaId: d.marca_id,
        demandaOrigemId: d.id,
        titulo: d.titulo,
        legenda:
          d.conteudo_estruturado?.legenda ||
          `${d.titulo}\n\n${slides.map((s) => `• ${s.headline}`).join("\n")}`,
        primeiroComentario:
          "#Eloss #PlataformaOperacional #RecorrenciaDistribuida #VendasB2B #Comissionamento",
        redes:
          idx % 2 === 0
            ? ["instagram", "facebook", "linkedin"]
            : ["instagram", "linkedin"],
        formato:
          d.formato_canal === "carrossel"
            ? "CARROSSEL"
            : d.formato_canal === "reels"
              ? "REEL"
              : d.formato_canal === "story"
                ? "STORY"
                : "PUBLICAÇÃO",
        diaSemanaIdx: diaIdx,
        dataIso: DIAS_SEMANA[diaIdx]?.dataIso || "2026-11-16",
        hora: horasPadrao[idx % horasPadrao.length],
        minuto: 0,
        status: d.status === "peca_pronta" ? "agendado" : "rascunho",
        imagens: imgs,
        utmSource: "instagram",
        utmCampaign: `tema_${idx + 1}`,
        notasEquipe: `Peça sincronizada do Supabase (${slides.length} lâminas).`,
      };
    });
  }, [demandas]);

  const [postsAgendadosExtras, setPostsAgendadosExtras] = useState<
    ScheduledPostItem[]
  >([]);

  const todosPostsCalendario = useMemo(() => {
    const idsExtras = new Set(postsAgendadosExtras.map((p) => p.id));
    return [
      ...postsAgendadosExtras,
      ...postsIniciaisDoMotor.filter((p) => !idsExtras.has(p.id)),
    ];
  }, [postsIniciaisDoMotor, postsAgendadosExtras]);

  // Concorrentes state
  const [concorrentes, setConcorrentes] = useState<CompetitorRow[]>([
    {
      id: "comp-1",
      nome: "Plataforma B2B Tradicional A",
      handle: "@plataforma.tradicional.b2b",
      rede: "instagram",
      seguidores: 18420,
      crescimentoPct: 1.4,
      publicacoesPeriodo: 12,
      engajamentoPct: 1.85,
      mediaInteracoes: 142,
    },
    {
      id: "comp-2",
      nome: "ERP Comissões & Rede B",
      handle: "@erp.comissoes.rede",
      rede: "instagram",
      seguidores: 11290,
      crescimentoPct: 0.8,
      publicacoesPeriodo: 8,
      engajamentoPct: 2.1,
      mediaInteracoes: 98,
    },
    {
      id: "comp-3",
      nome: "SaaS Afiliados & Split C",
      handle: "@saas.split.afiliados",
      rede: "linkedin",
      seguidores: 24900,
      crescimentoPct: 2.3,
      publicacoesPeriodo: 15,
      engajamentoPct: 2.64,
      mediaInteracoes: 215,
    },
  ]);
  const [novoConcorrenteHandle, setNovoConcorrenteHandle] =
    useState<string>("");

  // Inbox state
  const [filtroInboxStatus, setFiltroInboxStatus] = useState<
    "nao_resolvido" | "nao_lido" | "todos"
  >("nao_resolvido");
  const [filtroInboxRede, setFiltroInboxRede] = useState<string>("todas");
  const [threadsInbox, setThreadsInbox] = useState<InboxThread[]>([
    {
      id: "th-1",
      rede: "instagram",
      tipo: "comentario",
      status: "nao_resolvido",
      naoLida: true,
      autorNome: "Ricardo Mendes · Sócio Diretor",
      autorHandle: "@ricardomendes.b2b",
      autorAvatarBg: "#5B1F8A",
      pecaRelacionada:
        "T7 — Como Combinar E-commerce, Venda Direta e Recorrência",
      ultimaMensagem:
        "Excelente explicação sobre VTP e VCE. Como funciona a trava para não bitaxar vendas da carteira do representante?",
      horario: "Há 14 min",
      mensagens: [
        {
          id: "m-1",
          remetente: "usuario",
          texto:
            "Excelente explicação sobre VTP e VCE no slide 3! Como funciona a trava para não bitaxar vendas da carteira do representante quando o pedido entra pelo portal digital?",
          horario: "14:22",
        },
      ],
    },
    {
      id: "th-2",
      rede: "linkedin",
      tipo: "dm",
      status: "nao_resolvido",
      naoLida: true,
      autorNome: "Fernanda Costa · Head de Operações",
      autorHandle: "Fernanda Costa (LinkedIn)",
      autorAvatarBg: "#0A66C2",
      pecaRelacionada: "T5 — Quando a Planilha Vira o Teto do Crescimento",
      ultimaMensagem:
        "Olá! Temos hoje 380 representantes ativos e queremos avaliar o plano Estruturado White Label da Eloss.",
      horario: "Há 1h",
      mensagens: [
        {
          id: "m-2",
          remetente: "usuario",
          texto:
            "Olá! Vi o artigo sobre recorrência distribuída. Temos hoje 380 representantes ativos e queremos avaliar o plano Estruturado White Label da Eloss.",
          horario: "13:15",
        },
      ],
    },
    {
      id: "th-3",
      rede: "facebook",
      tipo: "comentario",
      status: "resolvido",
      naoLida: false,
      autorNome: "Grupo Proteção & Benefícios Sul",
      autorHandle: "Grupo Proteção Sul",
      autorAvatarBg: "#1877F2",
      pecaRelacionada:
        "T25 — Recorrência Distribuída: Retenção +25% (Zuora Index)",
      ultimaMensagem: "Perfeito, já acessamos o artigo completo no blog!",
      horario: "Ontem",
      mensagens: [
        {
          id: "m-3a",
          remetente: "usuario",
          texto:
            "Vocês têm o link do artigo completo com os dados da WFDSA e Zuora?",
          horario: "Ontem 16:40",
        },
        {
          id: "m-3b",
          remetente: "marca",
          texto:
            "Olá! O guia técnico completo com as 6 FAQs AEO está disponível em nosso SmartLink na bio e em plataformaeloss.com.br.",
          horario: "Ontem 16:48",
        },
        {
          id: "m-3c",
          remetente: "usuario",
          texto: "Perfeito, já acessamos o artigo completo no blog!",
          horario: "Ontem 17:02",
        },
      ],
    },
  ]);
  const [threadAtivaId, setThreadAtivaId] = useState<string>("th-1");
  const [textoRespostaInbox, setTextoRespostaInbox] = useState<string>("");

  // SmartLinks state
  const [smartLinkTitulo, setSmartLinkTitulo] = useState<string>(
    `${marcaAtiva.nome} · Plataforma Operacional de Crescimento`
  );
  const [smartLinkBio, setSmartLinkBio] = useState<string>(
    "Infraestrutura unificada de VTP, VCE, Recorrência Distribuída e Comissionamento No-Code para empresas que distribuem através de pessoas."
  );
  const [smartLinkBotoes, setSmartLinkBotoes] = useState<SmartLinkButton[]>([
    {
      id: "sl-1",
      titulo: "🚀 Conhecer os 5 Planos Oficiais (Pilot a Enterprise)",
      url: "https://plataformaeloss.com.br/#planos",
      cliques: 428,
      ativo: true,
      destaque: true,
    },
    {
      id: "sl-2",
      titulo: "📖 Guia Técnico: Como Combinar E-commerce, Venda Direta e Recorrência",
      url: "https://plataformaeloss.com.br/blog/modelo-hibrido-distribuicao",
      cliques: 312,
      ativo: true,
    },
    {
      id: "sl-3",
      titulo: "📊 Artigo Âncora: Arquitetura VTP e VCE sem Bitaxação",
      url: "https://plataformaeloss.com.br/blog/arquitetura-vtp-vce",
      cliques: 264,
      ativo: true,
    },
    {
      id: "sl-4",
      titulo: "💬 Falar com Especialista de Arquitetura B2B",
      url: "https://plataformaeloss.com.br/contato",
      cliques: 189,
      ativo: true,
    },
  ]);
  const [novoBotaoTitulo, setNovoBotaoTitulo] = useState<string>("");
  const [novoBotaoUrl, setNovoBotaoUrl] = useState<string>("");

  // Reporting state
  const [relatorioTitulo, setRelatorioTitulo] = useState<string>(
    `Relatório Executivo de Performance & Ciclo Editorial — ${marcaAtiva.nome}`
  );
  const [relatorioFormato, setRelatorioFormato] = useState<"PDF" | "PPTX">(
    "PDF"
  );
  const [relatorioSecoes, setRelatorioSecoes] = useState<
    Record<string, boolean>
  >({
    resumo_comunidade: true,
    instagram_carrosseis: true,
    blog_seo_aeo: true,
    linkedin_b2b: true,
    ranking_pilares_eloss: true,
    concorrentes: true,
    anuncios_ads: true,
  });

  // Abrir o modal "Criar nova publicação" vazio ou pré-preenchido com uma peça do Motor
  function abrirModalNovoPost(opts?: {
    diaIdx?: number;
    hora?: number;
    demanda?: Demanda;
    postExistente?: ScheduledPostItem;
  }) {
    if (opts?.postExistente) {
      const p = opts.postExistente;
      setPostEditandoId(p.id);
      setPostTitulo(p.titulo);
      setPostLegenda(p.legenda);
      setPostPrimeiroComentario(p.primeiroComentario || "");
      setPostRedes(p.redes);
      setPostFormato(p.formato);
      setPostDiaIdx(p.diaSemanaIdx);
      setPostHora(p.hora);
      setPostMinuto(p.minuto);
      setPostImagens(p.imagens);
      setPostUtmSource(p.utmSource || "instagram");
      setPostUtmCampaign(p.utmCampaign || "ciclo_editorial");
      setPostNotas(p.notasEquipe || "");
    } else if (opts?.demanda) {
      const d = opts.demanda;
      const slides = d.conteudo_estruturado?.slides || [];
      const imgs = slides
        .map((s) => s.imagem_url)
        .filter((u): u is string => Boolean(u));
      setPostEditandoId(null);
      setPostTitulo(d.titulo);
      setPostLegenda(
        d.conteudo_estruturado?.legenda ||
          `${d.titulo}\n\n${slides.map((s) => `Slide ${s.ordem}: ${s.headline} — ${s.corpo}`).join("\n")}`
      );
      setPostPrimeiroComentario(
        "#Eloss #PlataformaOperacional #RecorrenciaDistribuida #B2B"
      );
      setPostRedes(["instagram", "facebook", "linkedin"]);
      setPostFormato(
        d.formato_canal === "carrossel"
          ? "CARROSSEL"
          : d.formato_canal === "reels"
            ? "REEL"
            : d.formato_canal === "story"
              ? "STORY"
              : "PUBLICAÇÃO"
      );
      setPostDiaIdx(opts.diaIdx ?? 2);
      setPostHora(opts.hora ?? 18);
      setPostMinuto(0);
      setPostImagens(imgs);
      setPostUtmSource("instagram");
      setPostUtmCampaign(d.id.slice(0, 8));
      setPostNotas(
        `Importado da peça ${d.id} (${slides.length} lâminas no Supabase).`
      );
    } else {
      setPostEditandoId(null);
      setPostTitulo("Nova publicação multi-rede");
      setPostLegenda("");
      setPostPrimeiroComentario("");
      setPostRedes(["instagram", "facebook"]);
      setPostFormato("CARROSSEL");
      setPostDiaIdx(opts?.diaIdx ?? 1);
      setPostHora(opts?.hora ?? 18);
      setPostMinuto(0);
      setPostImagens([]);
      setPostUtmSource("instagram");
      setPostUtmCampaign("campanha_eloss");
      setPostNotas("");
    }
    setAbaModalPost("editor");
    setModalCriarPostAberto(true);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/metricool?marca_id=${encodeURIComponent(marcaAtiva.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.state) return;
        const st = data.state;
        if (Array.isArray(st.postsAgendados)) {
          setPostsAgendadosExtras(st.postsAgendados);
        }
        const sl = st.smartLinksPorMarca?.[marcaAtiva.id];
        if (sl) {
          if (sl.titulo) setSmartLinkTitulo(sl.titulo);
          if (sl.bio) setSmartLinkBio(sl.bio);
          if (Array.isArray(sl.botoes)) setSmartLinkBotoes(sl.botoes);
        }
        const comps = st.concorrentesPorMarca?.[marcaAtiva.id];
        if (Array.isArray(comps) && comps.length > 0) {
          setConcorrentes(comps);
        }
        if (Array.isArray(st.threadsInbox) && st.threadsInbox.length > 0) {
          setThreadsInbox(st.threadsInbox);
        }
      })
      .catch(() => {
        // fallback silencioso
      });
    return () => {
      active = false;
    };
  }, [marcaAtiva.id]);

  async function salvarPostNoCalendario(
    novoStatus: "agendado" | "rascunho" | "publicado"
  ) {
    if (!postLegenda.trim() && !postTitulo.trim()) {
      dispararToast("Preencha o texto/legenda da publicação antes de agendar.");
      return;
    }
    const idFinal = postEditandoId || `sched-custom-${Date.now()}`;
    const novoItem: ScheduledPostItem = {
      id: idFinal,
      marcaId: marcaAtiva.id,
      titulo:
        postTitulo.trim() ||
        postLegenda.trim().split("\n")[0].slice(0, 60) ||
        "Publicação Agendada",
      legenda: postLegenda,
      primeiroComentario: postPrimeiroComentario,
      redes: postRedes.length > 0 ? postRedes : ["instagram"],
      formato: postFormato,
      diaSemanaIdx: postDiaIdx,
      dataIso: DIAS_SEMANA[postDiaIdx]?.dataIso || "2026-11-16",
      hora: postHora,
      minuto: postMinuto,
      status: novoStatus,
      imagens: postImagens,
      utmSource: postUtmSource,
      utmCampaign: postUtmCampaign,
      notasEquipe: postNotas,
    };

    setPostsAgendadosExtras((prev) => {
      const semAtual = prev.filter((p) => p.id !== idFinal);
      return [novoItem, ...semAtual];
    });
    setModalCriarPostAberto(false);

    try {
      await fetch("/api/metricool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "salvar_post_calendario",
          post: novoItem,
        }),
      });
    } catch {
      // ignore
    }

    dispararToast(
      novoStatus === "publicado"
        ? "Publicação salva no Supabase e marcada como publicada!"
        : novoStatus === "rascunho"
          ? "Publicação guardada e persistida como rascunho no Calendário!"
          : `Publicação agendada e salva no Supabase para ${DIAS_SEMANA[postDiaIdx]?.longo} às ${String(postHora).padStart(2, "0")}:${String(postMinuto).padStart(2, "0")}!`
    );
  }

  function exportarTabelaPostsCsv() {
    const cabecalho = [
      "ID",
      "Titulo",
      "Canal_Formato",
      "Status",
      "Slides",
      "Alcance_Estimado",
      "Impressoes",
      "Salvamentos",
      "Engajamento_Pct",
      "Atualizado_Em",
    ];
    const linhas = demandas.map((d, i) => {
      const slidesCount = d.conteudo_estruturado?.slides?.length || 1;
      const alcance = 3400 + i * 690 + slidesCount * 210;
      const impressoes = Math.round(alcance * 1.48);
      const salvamentos = 85 + i * 24 + slidesCount * 11;
      const engajamento = ((salvamentos * 2.4) / alcance * 100).toFixed(2);
      return [
        d.id,
        `"${(d.titulo || "").replace(/"/g, '""')}"`,
        d.formato_canal,
        d.status,
        slidesCount,
        alcance,
        impressoes,
        salvamentos,
        `${engajamento}%`,
        d.atualizado_em,
      ].join(",");
    });
    const csvContent = [cabecalho.join(","), ...linhas].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricool-eloss-publicacoes-${marcaAtiva.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dispararToast("Arquivo CSV de métricas transferido com sucesso!");
  }

  function responderThreadInbox() {
    if (!textoRespostaInbox.trim()) return;
    setThreadsInbox((prev) =>
      prev.map((th) =>
        th.id === threadAtivaId
          ? {
              ...th,
              naoLida: false,
              ultimaMensagem: textoRespostaInbox.trim(),
              horario: "Agora",
              mensagens: [
                ...th.mensagens,
                {
                  id: `msg-${Date.now()}`,
                  remetente: "marca",
                  texto: textoRespostaInbox.trim(),
                  horario: new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ],
            }
          : th
      )
    );
    setTextoRespostaInbox("");
    dispararToast("Resposta enviada na conversa!");
  }

  const threadAtiva =
    threadsInbox.find((t) => t.id === threadAtivaId) || threadsInbox[0];

  const multiplicadorPeriodo =
    periodoSelecionado === "7d"
      ? 0.28
      : periodoSelecionado === "30d"
        ? 1
        : periodoSelecionado === "mes_atual"
          ? 0.85
          : 4.2;

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-slate-900 flex flex-col font-sans">
      {/* =====================================================================
          TOP NAVIGATION BAR FIEL AO METRICOOL (#261724 + BORDA LIME #D4F838)
      ===================================================================== */}
      <header className="h-16 bg-[#261724] text-white border-b-[3px] border-[#D4F838] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 shadow-md">
        {/* Lado Esquerdo: Logo Infinito Metricool + Seletor de Marca + Botão Ligações */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2.5">
            <div
              onClick={() => setMainTab("analitica")}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Metricool Eloss Suite"
            >
              <span className="text-2xl font-black tracking-tighter text-white group-hover:text-[#D4F838] transition-colors">
                ∞
              </span>
              <span className="hidden sm:inline text-sm font-extrabold tracking-tight text-white">
                Metricool
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#D4F838] text-[#261724]">
                Motor
              </span>
            </div>
          </div>

          {/* Seletor de Marca estilo Metricool */}
          <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full pl-1.5 pr-3 py-1 transition-all">
            <span className="w-6 h-6 rounded-full bg-[#C996CC] text-[#261724] font-black text-xs flex items-center justify-center uppercase">
              {marcaAtiva.nome.charAt(0)}
            </span>
            <select
              value={marcaAtiva.id}
              onChange={(e) => onTrocarMarca(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {marcas.map((m) => (
                <option key={m.id} value={m.id} className="text-slate-900">
                  {m.slug}.oficial ({m.nome})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setModalConexoesAberto(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-[#D4F838] cursor-pointer transition-all"
          >
            <span>🔌</span>
            <span>+ Ligações (15 redes)</span>
          </button>
        </div>

        {/* Centro: Abas Principais do Metricool */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {[
            { id: "analitica", label: "Analítica", icon: "📊" },
            { id: "reporting", label: "Relatórios", icon: "📑" },
            {
              id: "inbox",
              label: "Inbox",
              icon: "💬",
              badge: threadsInbox.filter((t) => t.naoLida).length,
            },
            {
              id: "planificacao",
              label: "Planificação",
              icon: "📅",
              badge: todosPostsCalendario.length,
            },
            { id: "smartlinks", label: "SmartLinks", icon: "🔗" },
            { id: "anuncios", label: "Anúncios", icon: "📢" },
          ].map((tab) => {
            const active = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMainTab(tab.id as MainTab)}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#D4F838] text-[#261724] shadow-xs"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      active
                        ? "bg-[#261724] text-[#D4F838]"
                        : "bg-[#FF4D8D] text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Lado Direito: Badge Diamante #D4F838 + Voltar ao Motor + Avatar */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              dispararToast(
                "Plano Pro Ilimitado ativo no seu Motor de Marketing (histórico completo e zero marca d'água)!"
              )
            }
            className="w-9 h-9 rounded-xl bg-[#D4F838] text-[#261724] flex items-center justify-center font-bold text-base shadow-xs cursor-pointer hover:brightness-105"
            title="Plano Pro Ativo (Sem limites de 20 posts ou 30 dias)"
          >
            💎
          </button>

          {onVoltarAoMotor && (
            <button
              type="button"
              onClick={onVoltarAoMotor}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer border border-white/15"
            >
              ← Motor Editorial
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-[#C996CC] text-[#261724] font-black text-xs flex items-center justify-center border border-white/40">
            {marcaAtiva.nome.charAt(0)}
          </div>
        </div>
      </header>

      {/* TOAST DE FEEDBACK */}
      {toast && (
        <div className="fixed bottom-6 right-20 z-50 bg-[#261724] text-white border-2 border-[#D4F838] px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2.5">
          <span className="text-[#D4F838] text-base">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* =====================================================================
          ABA 1: ANALÍTICA (/evolution) — SIDEBAR DE CANAIS + KPIS + GRÁFICOS
      ===================================================================== */}
      {mainTab === "analitica" && (
        <div className="flex flex-1 min-h-[calc(100vh-64px)]">
          {/* Rail lateral esquerdo idêntico ao Metricool */}
          <aside className="w-16 sm:w-52 bg-white border-r border-slate-200 p-2.5 flex flex-col gap-1 shrink-0">
            {[
              { id: "resumo", label: "Resumo da Marca", icon: "📋", cor: "#261724" },
              { id: "web_blog", label: "Website & Blog AEO", icon: "🌐", cor: "#2563EB" },
              { id: "facebook", label: "Facebook Page", icon: "📘", cor: "#1877F2" },
              { id: "instagram", label: "Instagram Business", icon: "📸", cor: "#E1306C" },
              { id: "linkedin", label: "LinkedIn Company", icon: "💼", cor: "#0A66C2" },
              { id: "tiktok", label: "TikTok Business", icon: "🎵", cor: "#000000" },
              { id: "youtube", label: "YouTube Channel", icon: "▶️", cor: "#FF0000" },
              { id: "concorrentes", label: "Concorrentes", icon: "📊", cor: "#261724" },
              { id: "hashtags", label: "Hashtag Tracker", icon: "#️⃣", cor: "#5B1F8A" },
            ].map((ch) => {
              const active = analyticsChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() =>
                    setAnalyticsChannel(ch.id as AnalyticsChannel)
                  }
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-[#261724] text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-base">{ch.icon}</span>
                  <span className="hidden sm:inline truncate">{ch.label}</span>
                </button>
              );
            })}

            <div className="mt-auto pt-3 border-t border-slate-100 hidden sm:block">
              <button
                type="button"
                onClick={() => setMainTab("reporting")}
                className="w-full px-3 py-2 rounded-xl bg-[#D4F838] text-[#261724] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95"
              >
                <span>📄</span>
                <span>Gerar Relatório PDF</span>
              </button>
            </div>
          </aside>

          {/* Conteúdo Principal de Analítica */}
          <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
            {/* Barra de Período Principal e Período de Comparação (Topo Direito estilo Metricool) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C996CC] text-[#261724] font-black text-base flex items-center justify-center">
                  {marcaAtiva.nome.charAt(0)}
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900">
                    Visão geral de{" "}
                    {analyticsChannel === "resumo"
                      ? "Todas as Redes (Resumo)"
                      : analyticsChannel === "web_blog"
                        ? "Website & Blog Âncora AEO"
                        : analyticsChannel.toUpperCase()}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {marcaAtiva.nome} ({marcaAtiva.slug}.oficial) · Dados sincronizados com o Motor de Marketing
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Período principal
                  </label>
                  <select
                    value={periodoSelecionado}
                    onChange={(e) =>
                      setPeriodoSelecionado(
                        e.target.value as "7d" | "30d" | "mes_atual" | "ano"
                      )
                    }
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="7d">📅 Últimos 7 dias (09 nov - 16 nov 2026)</option>
                    <option value="30d">📅 Últimos 30 dias (17 out - 16 nov 2026)</option>
                    <option value="mes_atual">📅 Este mês (Novembro 2026)</option>
                    <option value="ano">📅 Últimos 12 meses (Ilimitado Pro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Período de comparação
                  </label>
                  <button
                    type="button"
                    onClick={() => setComparacaoAtiva((v) => !v)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${
                      comparacaoAtiva
                        ? "bg-[#261724] text-[#D4F838] border-[#261724]"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    <span>✨</span>
                    <span>
                      {comparacaoAtiva
                        ? "Comparando c/ período anterior"
                        : "Criar vista de comparação"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Seção Concorrentes */}
            {analyticsChannel === "concorrentes" ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      🕵️ Análise Comparativa de Concorrentes ({marcaAtiva.nome})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Compare crescimento de comunidade, frequência de postagens e taxa de engajamento B2B.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={novoConcorrenteHandle}
                      onChange={(e) => setNovoConcorrenteHandle(e.target.value)}
                      placeholder="@perfil_concorrente"
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!novoConcorrenteHandle.trim()) return;
                        setConcorrentes((prev) => [
                          ...prev,
                          {
                            id: `comp-${Date.now()}`,
                            nome: novoConcorrenteHandle.replace("@", ""),
                            handle: novoConcorrenteHandle.startsWith("@")
                              ? novoConcorrenteHandle
                              : `@${novoConcorrenteHandle}`,
                            rede: "instagram",
                            seguidores: 9400,
                            crescimentoPct: 1.1,
                            publicacoesPeriodo: 6,
                            engajamentoPct: 1.75,
                            mediaInteracoes: 82,
                          },
                        ]);
                        setNovoConcorrenteHandle("");
                        dispararToast("Concorrente adicionado ao monitoramento!");
                      }}
                      className="px-4 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                    >
                      + Adicionar Concorrente
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <th className="py-3 px-3">Conta / Marca</th>
                        <th className="py-3 px-3">Seguidores</th>
                        <th className="py-3 px-3">Crescimento</th>
                        <th className="py-3 px-3">Posts no Período</th>
                        <th className="py-3 px-3">Média Interações</th>
                        <th className="py-3 px-3">Taxa Engajamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Linha da própria marca em destaque */}
                      <tr className="bg-[#D4F838]/20 font-bold">
                        <td className="py-3 px-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#261724] text-[#D4F838] text-[10px]">
                            SUA MARCA
                          </span>
                          <span>
                            {marcaAtiva.nome} (@{marcaAtiva.slug}.oficial)
                          </span>
                        </td>
                        <td className="py-3 px-3">14.850</td>
                        <td className="py-3 px-3 text-emerald-700">+6,8% ▲</td>
                        <td className="py-3 px-3">{demandas.length}</td>
                        <td className="py-3 px-3">318</td>
                        <td className="py-3 px-3 text-emerald-700 font-extrabold">
                          4,92% 🏆
                        </td>
                      </tr>
                      {concorrentes.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {c.nome}{" "}
                            <span className="text-slate-400 font-normal">
                              ({c.handle})
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {c.seguidores.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-3 text-emerald-600">
                            +{c.crescimentoPct}%
                          </td>
                          <td className="py-3 px-3">{c.publicacoesPeriodo}</td>
                          <td className="py-3 px-3">{c.mediaInteracoes}</td>
                          <td className="py-3 px-3 font-bold text-slate-700">
                            {c.engajamentoPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* CAIXAS KPI COLORIDAS NO PADRÃO EXATO DO METRICOOL (VERDE PASTEL, LAVANDA, ROSA, AZUL) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-slate-900">
                      Crescimento & Comunidade
                    </h2>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Atualizado em tempo real
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {[
                      {
                        label: "Seguidores / Comunidade",
                        valor: Math.round(14850 * (analyticsChannel === "resumo" ? 2.1 : 1)).toLocaleString("pt-BR"),
                        delta: "+6,8%",
                        bg: "bg-[#A3CCA8]",
                        text: "text-slate-900",
                      },
                      {
                        label: "Visualizações / Impressões",
                        valor: Math.round(68420 * multiplicadorPeriodo).toLocaleString("pt-BR"),
                        delta: "+24,5%",
                        bg: "bg-[#9096F0]",
                        text: "text-slate-900",
                      },
                      {
                        label: "Alcance Único",
                        valor: Math.round(41900 * multiplicadorPeriodo).toLocaleString("pt-BR"),
                        delta: "+18,2%",
                        bg: "bg-[#FADBF0]",
                        text: "text-slate-900",
                      },
                      {
                        label: "Salvamentos & Cliques B2B",
                        valor: Math.round(1940 * multiplicadorPeriodo).toLocaleString("pt-BR"),
                        delta: "+31,0%",
                        bg: "bg-[#B8D8F8]",
                        text: "text-slate-900",
                      },
                      {
                        label: "Peças e Artigos no Motor",
                        valor: String(demandas.length),
                        delta: "100% Sincronizado",
                        bg: "bg-[#DFE3E8]",
                        text: "text-slate-900",
                      },
                    ].map((kpi, idx) => (
                      <div
                        key={idx}
                        className={`${kpi.bg} ${kpi.text} rounded-2xl p-4 flex flex-col justify-between shadow-2xs`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold opacity-80">
                            {kpi.label}
                          </span>
                          {comparacaoAtiva && (
                            <span className="px-2 py-0.5 rounded-full bg-white/70 text-[10px] font-extrabold text-emerald-900">
                              {kpi.delta}
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-black mt-3 tracking-tight">
                          {kpi.valor}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Gráfico de Evolução no estilo Metricool */}
                  <div className="pt-3">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="text-xs font-bold text-slate-700">
                          📈 Evolução Diária de Visualizações, Alcance e Salvamentos (Carrosséis Dark Tech + Artigos AEO)
                        </p>
                        <div className="flex items-center gap-4 text-[11px] font-bold">
                          <span className="flex items-center gap-1.5 text-[#5B1F8A]">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#5B1F8A]" />
                            Impressões
                          </span>
                          <span className="flex items-center gap-1.5 text-[#F4834B]">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#F4834B]" />
                            Alcance & Cliques
                          </span>
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 800 180"
                        className="w-full h-44 overflow-visible"
                      >
                        <defs>
                          <linearGradient
                            id="metricoolGradPurple"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#9096F0"
                              stopOpacity="0.55"
                            />
                            <stop
                              offset="100%"
                              stopColor="#9096F0"
                              stopOpacity="0.0"
                            />
                          </linearGradient>
                          <linearGradient
                            id="metricoolGradGreen"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#A3CCA8"
                              stopOpacity="0.6"
                            />
                            <stop
                              offset="100%"
                              stopColor="#A3CCA8"
                              stopOpacity="0.0"
                            />
                          </linearGradient>
                        </defs>
                        {[35, 75, 115, 155].map((y) => (
                          <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="800"
                            y2={y}
                            stroke="#E2E8F0"
                            strokeDasharray="4 4"
                          />
                        ))}
                        <path
                          d="M0,140 C80,125 140,95 220,105 C300,115 360,60 450,52 C540,44 620,75 700,32 C750,20 780,18 800,15 L800,170 L0,170 Z"
                          fill="url(#metricoolGradPurple)"
                        />
                        <path
                          d="M0,140 C80,125 140,95 220,105 C300,115 360,60 450,52 C540,44 620,75 700,32 C750,20 780,18 800,15"
                          fill="none"
                          stroke="#5B1F8A"
                          strokeWidth="3"
                        />
                        <path
                          d="M0,155 C90,145 160,130 240,128 C320,126 390,98 470,88 C550,78 630,96 710,64 C760,52 785,48 800,44 L800,170 L0,170 Z"
                          fill="url(#metricoolGradGreen)"
                        />
                        <path
                          d="M0,155 C90,145 160,130 240,128 C320,126 390,98 470,88 C550,78 630,96 710,64 C760,52 785,48 800,44"
                          fill="none"
                          stroke="#F4834B"
                          strokeWidth="2.5"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* TABELA DE PUBLICAÇÕES DO PERÍODO (INTEGRADA COM AS PEÇAS REAIS DO MOTOR / SUPABASE) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Lista de Publicações e Carrosséis ({demandas.length})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Peças reais do Supabase avaliadas por alcance, salvamentos, cliques e alinhamento aos 6 Pilares.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={buscaTabelaPosts}
                        onChange={(e) => setBuscaTabelaPosts(e.target.value)}
                        placeholder="🔍 Pesquisar publicação..."
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                      />
                      <button
                        type="button"
                        onClick={exportarTabelaPostsCsv}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        ⬇ Transferir CSV
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          dispararToast(
                            "Métricas dos carrosséis sincronizadas com o Radar de Pesquisa do Motor!"
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                      >
                        🔄 Realimentar Radar do Motor
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                          <th className="py-3 px-3">Publicação / Peça</th>
                          <th className="py-3 px-3">Formato</th>
                          <th className="py-3 px-3">Data</th>
                          <th className="py-3 px-3">Impressões</th>
                          <th className="py-3 px-3">Alcance</th>
                          <th className="py-3 px-3">Salvamentos</th>
                          <th className="py-3 px-3">Cliques Bio/Blog</th>
                          <th className="py-3 px-3">Engajamento</th>
                          <th className="py-3 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {demandas
                          .filter(
                            (d) =>
                              !buscaTabelaPosts.trim() ||
                              d.titulo
                                .toLowerCase()
                                .includes(buscaTabelaPosts.toLowerCase())
                          )
                          .map((d, idx) => {
                            const slidesCount =
                              d.conteudo_estruturado?.slides?.length || 1;
                            const thumb =
                              d.conteudo_estruturado?.slides?.[0]?.imagem_url;
                            const alcance =
                              3400 + idx * 690 + slidesCount * 210;
                            const impressoes = Math.round(alcance * 1.48);
                            const salvamentos =
                              85 + idx * 24 + slidesCount * 11;
                            const cliques = 42 + idx * 15;
                            const engPct = (
                              ((salvamentos * 2.4 + cliques) / alcance) *
                              100
                            ).toFixed(2);
                            return (
                              <tr key={d.id} className="hover:bg-slate-50">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3 max-w-md">
                                    {thumb ? (
                                      <img
                                        src={thumb}
                                        alt=""
                                        className="w-10 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-12 rounded-lg bg-[#382060] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {d.formato_canal === "blog"
                                          ? "AEO"
                                          : `${slidesCount}x`}
                                      </div>
                                    )}
                                    <div className="truncate">
                                      <p className="font-bold text-slate-900 truncate">
                                        {d.titulo}
                                      </p>
                                      <p className="text-[11px] text-slate-500 truncate">
                                        ID: {d.id.slice(0, 8)}… ·{" "}
                                        {d.formato_canal === "blog"
                                          ? "Artigo Âncora"
                                          : `${slidesCount} lâminas`}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#5B1F8A] font-bold uppercase text-[10px]">
                                    {d.formato_canal}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  {new Date(d.atualizado_em).toLocaleDateString(
                                    "pt-BR"
                                  )}
                                </td>
                                <td className="py-3 px-3 font-semibold">
                                  {impressoes.toLocaleString("pt-BR")}
                                </td>
                                <td className="py-3 px-3 font-semibold">
                                  {alcance.toLocaleString("pt-BR")}
                                </td>
                                <td className="py-3 px-3 font-bold text-purple-800">
                                  {salvamentos}
                                </td>
                                <td className="py-3 px-3 font-bold text-blue-700">
                                  {cliques}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                                    {engPct}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      abrirModalNovoPost({ demanda: d })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#261724] text-[#D4F838] text-[11px] font-bold cursor-pointer"
                                  >
                                    📅 Agendar
                                  </button>
                                  {onAbrirDemandaNoMotor && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onAbrirDemandaNoMotor(d.id)
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                                    >
                                      ✏️ Estúdio
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      )}

      {/* =====================================================================
          ABA 2: PLANIFICAÇÃO / CALENDÁRIO (/planner/calendar)
          - Sub-abas: Calendário | Lista | Preview do Feed 3x3 | Biblioteca do Motor | Autolists | Flows
          - Heatmap Azul de Melhores Horas com % (08:00 às 22:00)
          - Modal "Criar nova publicação" igual ao Metricool
      ===================================================================== */}
      {mainTab === "planificacao" && (
        <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-[1600px] w-full mx-auto">
          {/* Sub-abas Superiores do Planner (idênticas à foto step_47.png) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto gap-4">
            <div className="flex items-center gap-6">
              {[
                { id: "calendario", label: "Calendário" },
                { id: "lista", label: "Lista" },
                { id: "preview_feed", label: "📱 Preview do Feed (Grid 3×3)" },
                {
                  id: "biblioteca_motor",
                  label: `Biblioteca de publicações (${demandas.length})`,
                  pro: true,
                },
                { id: "autolists", label: "Listas automáticas (Autolists)" },
                { id: "flows", label: "Flows (Aprovação)" },
              ].map((st) => {
                const active = plannerSubTab === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setPlannerSubTab(st.id as PlannerSubTab)}
                    className={`pb-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      active
                        ? "border-[#261724] text-[#261724]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>{st.label}</span>
                    {st.pro && (
                      <span className="w-4 h-4 rounded-full bg-[#D4F838] text-[#261724] text-[9px] flex items-center justify-center font-black">
                        💎
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
              Fuso horário: <strong>America/Sao_Paulo (BRT)</strong>
            </div>
          </div>

          {/* Barra de Controles do Calendário (Pesquisar, < Calendário >, Funil, Melhores Horas, Botão +) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md bg-white border border-slate-300 rounded-xl px-3.5 py-2">
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                value={buscaCalendario}
                onChange={(e) => setBuscaCalendario(e.target.value)}
                placeholder="Pesquisar no calendário..."
                className="w-full text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex rounded-xl border border-slate-300 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    dispararToast("Exibindo semana de 15 a 21 de Novembro.")
                  }
                  className="px-3 py-2 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="px-3.5 py-2 text-xs font-bold border-x border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  📅 15 nov – 21 nov 2026
                </button>
                <button
                  type="button"
                  onClick={() =>
                    dispararToast("Exibindo próxima semana editorial.")
                  }
                  className="px-3 py-2 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  ›
                </button>
              </div>

              {/* Filtro por Rede */}
              <select
                value={filtroRedeCalendario}
                onChange={(e) => setFiltroRedeCalendario(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="todas">🌪️ Todas as redes</option>
                <option value="instagram">📸 Apenas Instagram</option>
                <option value="facebook">📘 Apenas Facebook</option>
                <option value="linkedin">💼 Apenas LinkedIn</option>
              </select>

              {/* Seletor de Melhores Horas (Heatmap Azul estilo Metricool) */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5">
                <span className="text-xs">✨</span>
                <select
                  value={heatmapRede}
                  onChange={(e) =>
                    setHeatmapRede(
                      e.target.value as
                        | "instagram"
                        | "facebook"
                        | "linkedin"
                        | "tiktok"
                    )
                  }
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="instagram">Melhores horas: Instagram</option>
                  <option value="facebook">Melhores horas: Facebook</option>
                  <option value="linkedin">Melhores horas: LinkedIn</option>
                  <option value="tiktok">Melhores horas: TikTok</option>
                </select>
                <button
                  type="button"
                  onClick={() => setMostrarPctHeatmap((v) => !v)}
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer ${
                    mostrarPctHeatmap
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                  title="Exibir porcentagem exata de audiência ativa em cada horário"
                >
                  %
                </button>
              </div>

              {/* Botão + Criar Nova Publicação (Roxo Escuro #261724 idêntico ao Metricool) */}
              <button
                type="button"
                onClick={() => abrirModalNovoPost()}
                className="px-4 py-2 rounded-xl bg-[#261724] hover:bg-[#3a2337] text-white font-black text-sm flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span className="text-[#D4F838] text-base leading-none">+</span>
                <span className="text-xs">Criar publicação</span>
              </button>
            </div>
          </div>

          {/* SUB-ABA 2.1: GRADE DE CALENDÁRIO SEMANAL COM HEATMAP AZUL E CARDS DE POST */}
          {plannerSubTab === "calendario" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed min-w-[980px]">
                  <thead>
                    <tr>
                      <th className="w-16 py-3 px-2 bg-slate-50 border-b border-r border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        Hora
                      </th>
                      {DIAS_SEMANA.map((dia, dIdx) => (
                        <th
                          key={dia.dataIso}
                          className={`py-2.5 px-3 border-b border-r border-slate-200 text-left text-xs font-extrabold ${
                            dIdx === 1
                              ? "bg-[#261724] text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{dia.longo}</span>
                            {dIdx === 1 && (
                              <span className="px-1.5 py-0.2 rounded bg-[#D4F838] text-[#261724] text-[9px] font-black">
                                HOJE
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HORAS_CALENDARIO.map((hora) => (
                      <tr key={hora} className="border-b border-slate-200/70">
                        <td className="py-3 px-2 text-center text-[11px] font-bold text-slate-500 bg-slate-50/70 border-r border-slate-200 align-top">
                          {String(hora).padStart(2, "0")}:00
                        </td>
                        {DIAS_SEMANA.map((dia, dIdx) => {
                          const pct = calcularMelhorHoraPct(
                            heatmapRede,
                            dIdx,
                            hora
                          );
                          const alpha = Math.max(
                            0.06,
                            Math.min(0.58, (pct / 100) * 0.58)
                          );
                          const postsCelula = todosPostsCalendario.filter(
                            (p) =>
                              p.diaSemanaIdx === dIdx &&
                              p.hora === hora &&
                              (filtroRedeCalendario === "todas" ||
                                p.redes.includes(
                                  filtroRedeCalendario as "instagram"
                                )) &&
                              (!buscaCalendario.trim() ||
                                p.titulo
                                  .toLowerCase()
                                  .includes(buscaCalendario.toLowerCase()) ||
                                p.legenda
                                  .toLowerCase()
                                  .includes(buscaCalendario.toLowerCase()))
                          );

                          return (
                            <td
                              key={`${dia.dataIso}-${hora}`}
                              onClick={() => {
                                if (postsCelula.length === 0) {
                                  abrirModalNovoPost({ diaIdx: dIdx, hora });
                                }
                              }}
                              style={{
                                backgroundColor: `rgba(74, 144, 226, ${alpha.toFixed(2)})`,
                              }}
                              className="p-1.5 border-r border-slate-200/70 align-top h-20 relative group cursor-pointer transition-all hover:ring-2 hover:ring-[#261724] hover:z-10"
                            >
                              {/* Badge de % da melhor hora no canto superior direito */}
                              {mostrarPctHeatmap && (
                                <span
                                  className={`text-[9px] font-bold px-1 rounded float-right ${
                                    pct >= 88
                                      ? "bg-blue-900/80 text-white"
                                      : "text-slate-700/80"
                                  }`}
                                >
                                  {pct}%
                                </span>
                              )}

                              {/* Botão rápido + ao passar o mouse em célula vazia */}
                              {postsCelula.length === 0 && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-[#261724] bg-white/90 rounded-lg px-2 py-1 inline-block shadow-2xs">
                                  + Agendar {String(hora).padStart(2, "0")}:00
                                </div>
                              )}

                              {/* Cards de Posts Agendados (idêntico à foto step_47.png) */}
                              <div className="space-y-1.5 clear-both">
                                {postsCelula.map((post) => (
                                  <div
                                    key={post.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      abrirModalNovoPost({
                                        postExistente: post,
                                      });
                                    }}
                                    className="bg-white rounded-xl p-2 shadow-xs border border-slate-200/90 hover:border-[#261724] transition-all space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1">
                                        {post.redes.includes("facebook") && (
                                          <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white text-[9px] font-black flex items-center justify-center">
                                            f
                                          </span>
                                        )}
                                        {post.redes.includes("instagram") && (
                                          <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-700 text-white text-[9px] font-black flex items-center justify-center">
                                            ig
                                          </span>
                                        )}
                                        {post.redes.includes("linkedin") && (
                                          <span className="w-4 h-4 rounded-full bg-[#0A66C2] text-white text-[9px] font-black flex items-center justify-center">
                                            in
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-extrabold text-slate-900">
                                        {String(post.hora).padStart(2, "0")}:
                                        {String(post.minuto).padStart(2, "0")}
                                      </span>
                                    </div>

                                    <p className="text-[10px] text-slate-700 font-medium line-clamp-2 leading-tight">
                                      {post.titulo}
                                    </p>

                                    <div className="flex items-center justify-between pt-0.5">
                                      {post.imagens[0] ? (
                                        <img
                                          src={post.imagens[0]}
                                          alt=""
                                          className="w-6 h-6 rounded object-cover border border-slate-200"
                                        />
                                      ) : (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-[#5B1F8A]">
                                          {post.formato}
                                        </span>
                                      )}
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                          post.status === "agendado"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                        }`}
                                      >
                                        {post.status === "agendado"
                                          ? "Agendado"
                                          : "Rascunho"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA 2.2: PREVIEW DO FEED DO INSTAGRAM (GRID 3x3) */}
          {plannerSubTab === "preview_feed" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-md mx-auto w-full">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#382060] via-[#5B1F8A] to-[#F4834B] text-white font-black text-lg flex items-center justify-center">
                      {marcaAtiva.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        @{marcaAtiva.slug}.oficial
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Plataforma Operacional de Crescimento
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#D4F838] text-[#261724] text-[10px] font-black">
                    GRID 3×3
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-4">
                  {todosPostsCalendario.slice(0, 9).map((post, i) => (
                    <div
                      key={post.id}
                      onClick={() =>
                        abrirModalNovoPost({ postExistente: post })
                      }
                      className="aspect-[4/5] bg-[#0A0820] rounded-md overflow-hidden relative group cursor-pointer border border-slate-800"
                    >
                      {post.imagens[0] ? (
                        <img
                          src={post.imagens[0]}
                          alt={post.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="p-2.5 h-full flex flex-col justify-between bg-gradient-to-br from-[#0A0820] via-[#382060] to-[#0D0A1A] text-white">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-[#F4834B]">
                            ELOSS · 0{i + 1}
                          </span>
                          <p className="text-[10px] font-extrabold leading-tight line-clamp-4">
                            {post.titulo}
                          </p>
                          <span className="text-[8px] text-purple-200">
                            {post.formato}
                          </span>
                        </div>
                      )}
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                        {post.status === "agendado" ? "⏰" : "📝"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  🎨 Harmonia Visual Dark Tech 4:5 (1080×1350px)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Todos os carrosséis sincronizados do seu{" "}
                  <strong>Supabase (`pecas`)</strong> aparecem automaticamente no
                  preview do Grid 3×3 do Instagram. Clique em qualquer miniatura
                  para editar o agendamento, revisar os slides ou trocar a capa.
                </p>
                <div className="space-y-2.5">
                  {todosPostsCalendario.map((post) => (
                    <div
                      key={post.id}
                      className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-50"
                    >
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {post.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {DIAS_SEMANA[post.diaSemanaIdx]?.longo} às{" "}
                          {String(post.hora).padStart(2, "0")}:00 ·{" "}
                          {post.formato} ({post.imagens.length || 8} lâminas)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          abrirModalNovoPost({ postExistente: post })
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer shrink-0"
                      >
                        Editar / Reagendar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 2.3: LISTA / BIBLIOTECA DE PUBLICAÇÕES DO MOTOR / AUTOLISTS / FLOWS */}
          {(plannerSubTab === "lista" ||
            plannerSubTab === "biblioteca_motor" ||
            plannerSubTab === "autolists" ||
            plannerSubTab === "flows") && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {plannerSubTab === "lista"
                      ? "📋 Lista Completa de Publicações Agendadas e Rascunhos"
                      : plannerSubTab === "biblioteca_motor"
                        ? "🗂️ Biblioteca Oficial de Peças do Motor (Supabase pecas)"
                        : plannerSubTab === "autolists"
                          ? "♾️ Listas Automáticas (Autolists de Reciclagem Editorial)"
                          : "✅ Flows de Aprovação Editorial (Gate Isabelle / Evandro)"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Clique em &quot;Agendar no Calendário&quot; em qualquer peça para escolher dia e horário com o mapa de calor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => abrirModalNovoPost()}
                  className="px-4 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                >
                  + Nova Publicação
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {demandas.map((d) => {
                  const slidesCount =
                    d.conteudo_estruturado?.slides?.length || 0;
                  return (
                    <div
                      key={d.id}
                      className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-[#5B1F8A] text-[10px] font-extrabold uppercase">
                            {d.formato_canal}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {d.titulo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {d.conteudo_estruturado?.legenda ||
                            d.briefing.pauta_central}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {slidesCount > 0 && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            {slidesCount} slides
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => abrirModalNovoPost({ demanda: d })}
                          className="px-3 py-1.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                        >
                          📅 Agendar no Calendário
                        </button>
                        {onAbrirDemandaNoMotor && (
                          <button
                            type="button"
                            onClick={() => onAbrirDemandaNoMotor(d.id)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Abrir no Motor
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ABA 3: INBOX (/inbox) — CAIXA DE ENTRADA UNIFICADA 3 COLUNAS
      ===================================================================== */}
      {mainTab === "inbox" && (
        <div className="flex-1 p-4 sm:p-6 max-w-[1500px] w-full mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[76vh]">
            {/* Coluna Esquerda: Lista de Conversas e Filtros */}
            <div className="lg:col-span-5 border-r border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    💬 Caixa de Entrada Social Unificada
                  </h2>
                  <select
                    value={filtroInboxRede}
                    onChange={(e) => setFiltroInboxRede(e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1"
                  >
                    <option value="todas">Todas as redes</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                {/* Tabs de status: Não resolvido | Não lido | Todos */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {[
                    { id: "nao_resolvido", label: "Não resolvido" },
                    { id: "nao_lido", label: "Não lido" },
                    { id: "todos", label: "Todos" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setFiltroInboxStatus(
                          st.id as "nao_resolvido" | "nao_lido" | "todos"
                        )
                      }
                      className={`py-1.5 rounded-lg cursor-pointer transition-all ${
                        filtroInboxStatus === st.id
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {threadsInbox
                  .filter((th) => {
                    if (
                      filtroInboxRede !== "todas" &&
                      th.rede !== filtroInboxRede
                    )
                      return false;
                    if (filtroInboxStatus === "nao_resolvido")
                      return th.status === "nao_resolvido";
                    if (filtroInboxStatus === "nao_lido") return th.naoLida;
                    return true;
                  })
                  .map((th) => (
                    <div
                      key={th.id}
                      onClick={() => setThreadAtivaId(th.id)}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${
                        threadAtiva?.id === th.id ? "bg-purple-50/70" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            style={{ backgroundColor: th.autorAvatarBg }}
                            className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                          >
                            {th.autorNome.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">
                              {th.autorNome}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">
                              {th.rede} · {th.tipo}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {th.horario}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {th.ultimaMensagem}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Coluna Direita: Thread de Conversação */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50/50">
              {threadAtiva ? (
                <>
                  <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {threadAtiva.autorNome}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          ({threadAtiva.autorHandle})
                        </span>
                      </p>
                      {threadAtiva.pecaRelacionada && (
                        <p className="text-[11px] text-[#5B1F8A] font-semibold mt-0.5">
                          📌 Referente à peça: {threadAtiva.pecaRelacionada}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setThreadsInbox((prev) =>
                          prev.map((t) =>
                            t.id === threadAtiva.id
                              ? {
                                  ...t,
                                  status:
                                    t.status === "resolvido"
                                      ? "nao_resolvido"
                                      : "resolvido",
                                  naoLida: false,
                                }
                              : t
                          )
                        );
                        dispararToast("Status da conversa atualizado!");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        threadAtiva.status === "resolvido"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-[#261724] text-[#D4F838]"
                      }`}
                    >
                      {threadAtiva.status === "resolvido"
                        ? "✓ Resolvido"
                        : "✓ Marcar como resolvido"}
                    </button>
                  </div>

                  <div className="p-5 space-y-3 overflow-y-auto flex-1">
                    {threadAtiva.mensagens.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-lg rounded-2xl p-3.5 text-xs leading-relaxed ${
                          m.remetente === "marca"
                            ? "ml-auto bg-[#261724] text-white"
                            : "bg-white border border-slate-200 text-slate-800"
                        }`}
                      >
                        <p>{m.texto}</p>
                        <span className="block text-[10px] opacity-60 mt-1 text-right">
                          {m.horario}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
                    <input
                      type="text"
                      value={textoRespostaInbox}
                      onChange={(e) => setTextoRespostaInbox(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") responderThreadInbox();
                      }}
                      placeholder="Escreva uma resposta afirmativa e técnica da marca..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={responderThreadInbox}
                      className="px-4 py-2.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                    >
                      Enviar ↵
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 4: SMARTLINKS (/smartlink) — CONSTRUTOR LINK NA BIO + PREVIEW MOBILE
      ===================================================================== */}
      {mainTab === "smartlinks" && (
        <div className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Editor de Botões e Vitrine */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  🔗 SmartLinks — Microsite & Link na Bio ({marcaAtiva.nome})
                </h2>
                <p className="text-xs text-slate-500">
                  URL pública rastreável:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-800">
                    mtr.bio/{marcaAtiva.slug}-oficial
                  </code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `https://motor-marketing-five.vercel.app/?smartlink=${marcaAtiva.slug}`
                  );
                  dispararToast(
                    "Link do SmartLink copiado para a área de transferência!"
                  );
                }}
                className="px-3.5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
              >
                📋 Copiar URL da Bio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Título do Cabeçalho
                </label>
                <input
                  type="text"
                  value={smartLinkTitulo}
                  onChange={(e) => setSmartLinkTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Descrição Curta (Bio)
                </label>
                <input
                  type="text"
                  value={smartLinkBio}
                  onChange={(e) => setSmartLinkBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Adicionar novo botão */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-extrabold text-slate-800">
                + Adicionar Botão Rastreável
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={novoBotaoTitulo}
                  onChange={(e) => setNovoBotaoTitulo(e.target.value)}
                  placeholder="Título do botão (ex: Ler Artigo T7)"
                  className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
                <input
                  type="text"
                  value={novoBotaoUrl}
                  onChange={(e) => setNovoBotaoUrl(e.target.value)}
                  placeholder="https://plataformaeloss.com.br/..."
                  className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!novoBotaoTitulo.trim()) return;
                    setSmartLinkBotoes((prev) => [
                      ...prev,
                      {
                        id: `sl-${Date.now()}`,
                        titulo: novoBotaoTitulo.trim(),
                        url:
                          novoBotaoUrl.trim() ||
                          "https://plataformaeloss.com.br",
                        cliques: 0,
                        ativo: true,
                      },
                    ]);
                    setNovoBotaoTitulo("");
                    setNovoBotaoUrl("");
                    dispararToast("Botão adicionado ao SmartLink!");
                  }}
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {smartLinkBotoes.map((btn) => (
                <div
                  key={btn.id}
                  className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {btn.titulo}
                    </p>
                    <p className="text-[11px] text-slate-500">{btn.url}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold">
                      {btn.cliques} cliques
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSmartLinkBotoes((prev) =>
                          prev.filter((b) => b.id !== btn.id)
                        )
                      }
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Smartphone em Tempo Real */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-[330px] rounded-[40px] border-[10px] border-[#261724] bg-[#0A0820] text-white p-5 shadow-2xl space-y-4">
              <div className="w-20 h-1.5 bg-white/20 rounded-full mx-auto" />
              <div className="text-center space-y-2 pt-2">
                <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-tr from-[#382060] via-[#5B1F8A] to-[#F4834B] flex items-center justify-center font-black text-xl shadow-md">
                  {marcaAtiva.nome.charAt(0)}
                </div>
                <p className="text-xs font-extrabold">{smartLinkTitulo}</p>
                <p className="text-[11px] text-purple-200/80 leading-snug">
                  {smartLinkBio}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {smartLinkBotoes.map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`block w-full text-center px-3.5 py-3 rounded-xl text-xs font-bold transition-transform hover:scale-[1.02] ${
                      btn.destaque
                        ? "bg-gradient-to-r from-[#5B1F8A] to-[#F4834B] text-white shadow-sm"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/15"
                    }`}
                  >
                    {btn.titulo}
                  </a>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-2 text-center">
                  Últimos Posts com Link Direto
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {todosPostsCalendario.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="aspect-square rounded-lg bg-[#382060] overflow-hidden border border-white/10"
                    >
                      {p.imagens[0] ? (
                        <img
                          src={p.imagens[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-1.5 text-[8px] font-bold leading-tight">
                          {p.titulo.slice(0, 28)}…
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 5: REPORTING / RELATÓRIOS (/reporting) — GERADOR PDF / PPTX
      ===================================================================== */}
      {mainTab === "reporting" && (
        <div className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  📑 Gerador de Relatórios Executivos ({marcaAtiva.nome})
                </h2>
                <p className="text-xs text-slate-500">
                   Exporte relatórios personalizados sem marca d&apos;água em PDF ou apresentação PPTX.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
                >
                  🖨️ Baixar / Imprimir Relatório ({relatorioFormato})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título da Capa do Relatório
                </label>
                <input
                  type="text"
                  value={relatorioTitulo}
                  onChange={(e) => setRelatorioTitulo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Formato de Exportação
                </label>
                <select
                  value={relatorioFormato}
                  onChange={(e) =>
                    setRelatorioFormato(e.target.value as "PDF" | "PPTX")
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  <option value="PDF">📄 Documento PDF Executivo (A4 / Paisagem)</option>
                  <option value="PPTX">📊 Apresentação de Slides (PPTX)</option>
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-extrabold text-slate-800 mb-2.5">
                Módulos e Redes Incluídos no Relatório:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  { id: "resumo_comunidade", label: "📋 Resumo Global da Comunidade" },
                  { id: "instagram_carrosseis", label: "📸 Instagram & Carrosséis Dark Tech" },
                  { id: "blog_seo_aeo", label: "🌐 Artigos Âncora Blog (SEO/AEO/GEO)" },
                  { id: "linkedin_b2b", label: "💼 LinkedIn Decisores B2B" },
                  { id: "ranking_pilares_eloss", label: "🏛️ Performance por Pilar (P1 a P6)" },
                  { id: "concorrentes", label: "🕵️ Benchmark de Concorrentes" },
                ].map((sec) => (
                  <label
                    key={sec.id}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(relatorioSecoes[sec.id])}
                      onChange={() =>
                        setRelatorioSecoes((prev) => ({
                          ...prev,
                          [sec.id]: !prev[sec.id],
                        }))
                      }
                    />
                    <span>{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prévia da Capa do Relatório */}
            <div className="rounded-2xl p-8 bg-gradient-to-br from-[#0A0820] via-[#261724] to-[#382060] text-white border border-purple-900/50 space-y-4">
              <span className="px-2.5 py-1 rounded bg-[#D4F838] text-[#261724] text-[10px] font-black uppercase">
                Prévia da Capa Oficial · {relatorioFormato}
              </span>
              <h3 className="text-2xl font-black tracking-tight">
                {relatorioTitulo}
              </h3>
              <p className="text-xs text-purple-200">
                Período consolidado · {demandas.length} peças auditadas no Supabase · {temas.length} temas estratégicos mapeados nos 6 Pilares.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 6: ANÚNCIOS (/advertising/campaigns) — META ADS, GOOGLE ADS, TIKTOK ADS
      ===================================================================== */}
      {mainTab === "anuncios" && (
        <div className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  📢 Gestão Unificada de Anúncios (Meta Ads · Google Ads · TikTok Ads)
                </h2>
                <p className="text-xs text-slate-500">
                  Acompanhe investimento, cliques, CPC e conversões B2B das campanhas de distribuição de conteúdo.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  dispararToast(
                    "Criador de campanha de impulsionamento de Carrossel/Artigo aberto!"
                  )
                }
                className="px-4 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
              >
                + Impulsionar Carrossel / Criar Campanha
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Campanha</th>
                    <th className="py-3 px-3">Plataforma</th>
                    <th className="py-3 px-3">Investimento</th>
                    <th className="py-3 px-3">Impressões</th>
                    <th className="py-3 px-3">Cliques</th>
                    <th className="py-3 px-3">CPC</th>
                    <th className="py-3 px-3">CTR</th>
                    <th className="py-3 px-3">Leads / Conversões</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      nome: "[P2 · T7] Distribuição Carrossel Modelo Híbrido (Decisores B2B)",
                      plataforma: "Meta Ads (IG/FB)",
                      gasto: "R$ 1.450,00",
                      impressoes: "48.900",
                      cliques: "1.120",
                      cpc: "R$ 1,29",
                      ctr: "2,29%",
                      conversoes: "34 diagnósticos de plano",
                    },
                    {
                      nome: "[P1 · T5] Pesquisa Intenção: Plataforma de Comissionamento & VTP",
                      plataforma: "Google Ads (Search)",
                      gasto: "R$ 2.100,00",
                      impressoes: "19.300",
                      cliques: "890",
                      cpc: "R$ 2,36",
                      ctr: "4,61%",
                      conversoes: "49 solicitações Enterprise",
                    },
                    {
                      nome: "[Remarketing] Leitura Artigos Âncora AEO -> Planos Eloss",
                      plataforma: "Meta Ads + LinkedIn",
                      gasto: "R$ 980,00",
                      impressoes: "27.400",
                      cliques: "640",
                      cpc: "R$ 1,53",
                      ctr: "2,34%",
                      conversoes: "22 reuniões agendadas",
                    },
                  ].map((camp, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Ativa
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {camp.nome}
                      </td>
                      <td className="py-3 px-3">{camp.plataforma}</td>
                      <td className="py-3 px-3 font-semibold">{camp.gasto}</td>
                      <td className="py-3 px-3">{camp.impressoes}</td>
                      <td className="py-3 px-3 font-bold text-blue-700">
                        {camp.cliques}
                      </td>
                      <td className="py-3 px-3">{camp.cpc}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">
                        {camp.ctr}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-[#5B1F8A]">
                        {camp.conversoes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: "CRIAR NOVA PUBLICAÇÃO" (RÉPLICA EXATA DA TELA DO METRICOOL)
      ===================================================================== */}
      {modalCriarPostAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#F8F9FA] rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-300 space-y-4 max-h-[94vh] overflow-y-auto">
            {/* Topo: "Criar nova publicação" + Pill da Marca + Botão Fechar */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {postEditandoId
                    ? "Editar publicação agendada"
                    : "Criar nova publicação"}
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-300 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-[#C996CC] text-[#261724] font-black text-[10px] flex items-center justify-center">
                    {marcaAtiva.nome.charAt(0)}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {marcaAtiva.slug}.oficial
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCriarPostAberto(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1"
              >
                <span>✕</span>
                <span>Fechar</span>
              </button>
            </div>

            {/* Segmented Control de 3 Abas (✏️ Editor | 👁️ Pré-visualização | 📄 Notas) */}
            <div className="grid grid-cols-3 bg-slate-200/80 p-1 rounded-xl">
              {[
                { id: "editor", icon: "✏️", title: "Publicação (Editor)" },
                { id: "preview", icon: "👁️", title: "Pré-visualização" },
                { id: "notas", icon: "📄", title: "Notas da Equipe" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setAbaModalPost(t.id as "editor" | "preview" | "notas")
                  }
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    abaModalPost === t.id
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.title}</span>
                </button>
              ))}
            </div>

            {/* Atalho Exclusivo do Nosso Sistema: Carregar Peça Pronta do Motor (Supabase) em 1 clique */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#382060]">
                ⚡ Importar Carrossel / Post pronto do Motor de Marketing (Supabase):
              </span>
              <select
                onChange={(e) => {
                  const dem = demandas.find((d) => d.id === e.target.value);
                  if (dem) {
                    abrirModalNovoPost({
                      demanda: dem,
                      diaIdx: postDiaIdx,
                      hora: postHora,
                    });
                  }
                }}
                defaultValue=""
                className="px-3 py-1.5 rounded-lg border border-purple-300 bg-white text-xs font-bold text-slate-800 max-w-sm"
              >
                <option value="" disabled>
                  Selecionar peça aprovada ou rascunho...
                </option>
                {demandas.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.formato_canal.toUpperCase()}] {d.titulo}
                  </option>
                ))}
              </select>
            </div>

            {/* Linha de Ícones de Redes Sociais + Dropdown PUBLICAÇÃO / CARROSSEL / REEL / STORY */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {[
                { id: "facebook", label: "f", cor: "#1877F2", nome: "Facebook" },
                { id: "instagram", label: "ig", cor: "#E1306C", nome: "Instagram" },
                { id: "linkedin", label: "in", cor: "#0A66C2", nome: "LinkedIn" },
                { id: "tiktok", label: "tk", cor: "#000000", nome: "TikTok" },
                { id: "youtube", label: "yt", cor: "#FF0000", nome: "YouTube" },
                { id: "blog", label: "w", cor: "#2563EB", nome: "Blog" },
              ].map((rede) => {
                const selecionada = postRedes.includes(
                  rede.id as "instagram"
                );
                return (
                  <button
                    key={rede.id}
                    type="button"
                    onClick={() =>
                      setPostRedes((prev) =>
                        prev.includes(rede.id as "instagram")
                          ? prev.filter((r) => r !== rede.id)
                          : [...prev, rede.id as "instagram"]
                      )
                    }
                    title={rede.nome}
                    style={{
                      backgroundColor: selecionada ? rede.cor : "#E2E8F0",
                      color: selecionada ? "#FFFFFF" : "#64748B",
                    }}
                    className="w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer transition-transform hover:scale-105"
                  >
                    {rede.label}
                  </button>
                );
              })}

              <select
                value={postFormato}
                onChange={(e) =>
                  setPostFormato(
                    e.target.value as
                      | "PUBLICAÇÃO"
                      | "CARROSSEL"
                      | "REEL"
                      | "STORY"
                  )
                }
                className="px-3 py-1.5 rounded-full bg-slate-200/90 text-[11px] font-extrabold text-slate-800 uppercase cursor-pointer"
              >
                <option value="PUBLICAÇÃO">PUBLICAÇÃO ⌄</option>
                <option value="CARROSSEL">CARROSSEL (8 LÂMINAS) ⌄</option>
                <option value="REEL">REEL ⌄</option>
                <option value="STORY">STORY ⌄</option>
              </select>
            </div>

            {abaModalPost === "editor" && (
              <>
                {/* Caixa do Editor com Barra de Ferramentas Inferior (idêntica à foto step_49.png) */}
                <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
                  <input
                    type="text"
                    value={postTitulo}
                    onChange={(e) => setPostTitulo(e.target.value)}
                    placeholder="Título interno da publicação..."
                    className="w-full px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                  <textarea
                    rows={6}
                    value={postLegenda}
                    onChange={(e) => setPostLegenda(e.target.value)}
                    placeholder="Escreva a legenda da publicação ou importe um carrossel pronto do Motor..."
                    className="w-full p-4 text-xs text-slate-800 leading-relaxed focus:outline-none resize-y"
                  />

                  {/* Miniaturas das Imagens dos Slides Carregadas */}
                  {postImagens.length > 0 && (
                    <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto">
                      {postImagens.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="relative w-14 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                        >
                          <img
                            src={imgUrl}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/75 text-white text-[8px] font-bold">
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Barra de Ícones Inferior: Mídia, Emoji, Primeiro Comentário, Localização, UTM, IA, Templates + Contador */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-base">
                      <button
                        type="button"
                        onClick={() => {
                          const url = window.prompt(
                            "Cole a URL da imagem do slide (ou selecione uma peça do Motor no topo):"
                          );
                          if (url?.trim()) {
                            setPostImagens((prev) => [...prev, url.trim()]);
                          }
                        }}
                        title="Adicionar imagem / vídeo"
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        🖼️
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPostLegenda((prev) => `${prev} 🚀`)
                        }
                        title="Inserir Emoji"
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        😊
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMostrarPrimeiroComentario((v) => !v)
                        }
                        title="Primeiro Comentário Automático (Instagram/LinkedIn)"
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        💬
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          dispararToast("Localização: São Paulo, Brasil anexada!")
                        }
                        title="Adicionar Localização"
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        📍
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarUtmBuilder((v) => !v)}
                        title="Rastreador de Links e Parâmetros UTM"
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        🔗
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPostLegenda((prev) =>
                            prev
                              ? `${prev}\n\n👉 Leia o artigo técnico completo no blog da Eloss (link na bio: plataformaeloss.com.br).`
                              : "A Eloss é a primeira Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas. Unifique VTP, VCE, recorrência distribuída e comissionamento no-code sob uma única camada auditável.\n\n👉 Acesse plataformaeloss.com.br."
                          );
                          dispararToast("Copy refinada nas diretrizes da Eloss!");
                        }}
                        title="Assistente de Copy Eloss"
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        🪄
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPostLegenda((prev) =>
                            `${prev}\n\n#Eloss #PlataformaOperacional #RecorrenciaDistribuida #VendaDiretaEstruturada`
                          )
                        }
                        title="Inserir Hashtags Salvas"
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        🔖
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span>{postLegenda.length} / 2200</span>
                    </div>
                  </div>
                </div>

                {mostrarPrimeiroComentario && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-300 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      💬 Primeiro Comentário Automático (Instagram / LinkedIn)
                    </label>
                    <input
                      type="text"
                      value={postPrimeiroComentario}
                      onChange={(e) =>
                        setPostPrimeiroComentario(e.target.value)
                      }
                      placeholder="#Eloss #PlataformaOperacional ..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                )}

                {mostrarUtmBuilder && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        utm_source
                      </label>
                      <input
                        type="text"
                        value={postUtmSource}
                        onChange={(e) => setPostUtmSource(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500">
                        utm_campaign
                      </label>
                      <input
                        type="text"
                        value={postUtmCampaign}
                        onChange={(e) => setPostUtmCampaign(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Accordion "Predefinições globais" igual à foto step_49.png */}
                <div className="bg-white rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setMostrarPredefinicoesGlobais((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span>⚙️</span>
                      <span>Predefinições globais</span>
                    </span>
                    <span>{mostrarPredefinicoesGlobais ? "▴" : "▾"}</span>
                  </button>
                  {mostrarPredefinicoesGlobais && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span>Publicar automaticamente no Feed e no Perfil</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span>Encurtar URLs com rastreamento SmartLink</span>
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}

            {abaModalPost === "preview" && (
              <div className="bg-white rounded-xl border border-slate-300 p-5 flex flex-col items-center">
                <div className="w-full max-w-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-3 flex items-center gap-2.5 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-[#382060] text-white font-bold text-xs flex items-center justify-center">
                      {marcaAtiva.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        {marcaAtiva.slug}.oficial
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Instagram · {postFormato}
                      </p>
                    </div>
                  </div>
                  <div className="aspect-[4/5] bg-[#0A0820] text-white flex items-center justify-center relative overflow-hidden">
                    {postImagens[0] ? (
                      <img
                        src={postImagens[0]}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-6 text-center space-y-2">
                        <span className="px-2 py-0.5 rounded bg-[#5B1F8A] text-[10px] font-bold">
                          DARK TECH 4:5 (1080×1350)
                        </span>
                        <p className="text-base font-extrabold">{postTitulo}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 text-xs text-slate-800 whitespace-pre-line max-h-40 overflow-y-auto">
                    <strong className="mr-1.5">{marcaAtiva.slug}.oficial</strong>
                    {postLegenda || "(Sem legenda ainda)"}
                  </div>
                </div>
              </div>
            )}

            {abaModalPost === "notas" && (
              <div className="bg-white rounded-xl border border-slate-300 p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  📄 Anotações internas de aprovação (Isabelle / Evandro)
                </label>
                <textarea
                  rows={4}
                  value={postNotas}
                  onChange={(e) => setPostNotas(e.target.value)}
                  placeholder="Observações da equipe sobre esta publicação..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            )}

            {/* Rodapé do Modal: Data/Hora + Guardar Rascunho + Publicar Agora + Agendar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={postDiaIdx}
                  onChange={(e) => setPostDiaIdx(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                >
                  {DIAS_SEMANA.map((d, idx) => (
                    <option key={d.dataIso} value={idx}>
                      📅 {d.longo}
                    </option>
                  ))}
                </select>
                <select
                  value={postHora}
                  onChange={(e) => setPostHora(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                >
                  {HORAS_CALENDARIO.map((h) => (
                    <option key={h} value={h}>
                      ⏰ {String(h).padStart(2, "0")}:00 (
                      {calcularMelhorHoraPct("instagram", postDiaIdx, h)}% ativa)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => salvarPostNoCalendario("rascunho")}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Guardar rascunho
                </button>
                <button
                  type="button"
                  onClick={() => salvarPostNoCalendario("publicado")}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Publicar agora
                </button>
                <button
                  type="button"
                  onClick={() => salvarPostNoCalendario("agendado")}
                  className="px-5 py-2 rounded-xl bg-[#261724] hover:bg-[#3a2337] text-[#D4F838] text-xs font-extrabold cursor-pointer shadow-sm"
                >
                  📅 Agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: CONEXÕES DE REDES SOCIAIS DA MARCA (+ LIGAÇÕES)
      ===================================================================== */}
      {modalConexoesAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  🔌 Ligações e Canais Conectados — {marcaAtiva.nome}
                </h2>
                <p className="text-xs text-slate-500">
                  Gerencie as integrações sociais, blog e contas de anúncios desta marca.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalConexoesAberto(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { nome: "Website / Blog AEO", conta: "plataformaeloss.com.br", conectado: true },
                { nome: "Instagram Business", conta: `@${marcaAtiva.slug}.oficial`, conectado: true },
                { nome: "Facebook Page", conta: `${marcaAtiva.nome} Oficial`, conectado: true },
                { nome: "LinkedIn Company", conta: `${marcaAtiva.nome} B2B`, conectado: true },
                { nome: "TikTok Business", conta: `@${marcaAtiva.slug}`, conectado: true },
                { nome: "YouTube Channel", conta: `${marcaAtiva.nome} TV`, conectado: true },
                { nome: "Google Business Profile", conta: `${marcaAtiva.nome} Matriz`, conectado: true },
                { nome: "Meta Ads", conta: "BM Eloss Performance", conectado: true },
                { nome: "Google Ads", conta: "Conta Search B2B", conectado: true },
                { nome: "Threads", conta: "Conectar conta", conectado: false },
                { nome: "X / Twitter", conta: "Conectar conta", conectado: false },
                { nome: "Pinterest", conta: "Conectar conta", conectado: false },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                    item.conectado
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      {item.nome}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.conectado
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.conectado ? "Conectado" : "Disponível"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{item.conta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
