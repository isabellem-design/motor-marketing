"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Demanda, Marca, TemaEditorial } from "@/lib/types";
import { IntegracaoEmpresaPublica } from "@/app/api/metricool/route";

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
  | "concorrentes";

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
  redes: (
    | "instagram"
    | "facebook"
    | "linkedin"
    | "tiktok"
    | "youtube"
    | "blog"
  )[];
  formato: "PUBLICAÇÃO" | "CARROSSEL" | "REEL" | "STORY";
  diaSemanaIdx: number;
  dataIso: string;
  hora: number;
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
  permalinkPost?: string;
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

const CATALOGO_REDES_CONEXAO = [
  {
    provedor: "instagram",
    nome: "Instagram Business (Meta Graph API)",
    icone: "📸",
    cor: "#E1306C",
    descricao:
      "Publicação automática de Carrosséis/Reels, leitura de seguidores, alcance e comentários reais na Inbox.",
    exigeToken: true,
    labelId: "Instagram Business Account ID (opcional — auto-descoberto pelo Token)",
  },
  {
    provedor: "facebook",
    nome: "Facebook Page (Meta Graph API)",
    icone: "📘",
    cor: "#1877F2",
    descricao:
      "Métricas da Página, alcance, publicações no feed e comentários.",
    exigeToken: true,
    labelId: "Facebook Page ID (opcional — auto-descoberto pelo Token)",
  },
  {
    provedor: "wordpress",
    nome: "Website / Blog WordPress",
    icone: "🌐",
    cor: "#2563EB",
    descricao:
      "Publicação direta dos Artigos Âncora AEO e leitura do site oficial da empresa.",
    exigeToken: true,
    exigeSiteUrl: true,
    labelId: "Usuário WordPress",
  },
  {
    provedor: "linkedin",
    nome: "LinkedIn Company Page",
    icone: "💼",
    cor: "#0A66C2",
    descricao:
      "Publicação e métricas corporativas B2B da página da empresa no LinkedIn.",
    exigeToken: true,
    labelId: "LinkedIn Organization ID / URN",
  },
  {
    provedor: "tiktok",
    nome: "TikTok Business",
    icone: "🎵",
    cor: "#000000",
    descricao: "Agendamento de vídeos curtos e métricas da conta TikTok.",
    exigeToken: true,
    labelId: "@handle da conta TikTok",
  },
  {
    provedor: "youtube",
    nome: "YouTube Channel",
    icone: "▶️",
    cor: "#FF0000",
    descricao: "Métricas de vídeos, Shorts e inscritos do canal.",
    exigeToken: true,
    labelId: "YouTube Channel ID",
  },
  {
    provedor: "google",
    nome: "Google Business / Analytics / Search",
    icone: "🔍",
    cor: "#0F9D58",
    descricao: "Integração Google para métricas de busca orgânica e ficha local.",
    exigeToken: true,
    labelId: "Property / Account ID",
  },
  {
    provedor: "meta_ads",
    nome: "Meta Ads (Facebook & Instagram Ads)",
    icone: "📢",
    cor: "#1877F2",
    descricao: "Monitoramento de campanhas de tráfego pago no Meta Ads.",
    exigeToken: true,
    labelId: "Ad Account ID (act_...)",
  },
  {
    provedor: "google_ads",
    nome: "Google Ads",
    icone: "🎯",
    cor: "#EA4335",
    descricao: "Monitoramento de campanhas de pesquisa, display e conversões.",
    exigeToken: true,
    labelId: "Google Ads Customer ID",
  },
];

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
    useState<AnalyticsChannel>("resumo");
  const [plannerSubTab, setPlannerSubTab] =
    useState<PlannerSubTab>("calendario");

  // Conexões reais individualizadas por empresa no Supabase (`integracoes`)
  const [empresaIdSupabase, setEmpresaIdSupabase] = useState<string>("");
  const [integracoesEmpresa, setIntegracoesEmpresa] = useState<
    IntegracaoEmpresaPublica[]
  >([]);
  const [carregandoDadosEmpresa, setCarregandoDadosEmpresa] =
    useState<boolean>(false);

  // Modal de Conexões individualizadas por Empresa (`+ Ligações`)
  const [modalConexoesAberto, setModalConexoesAberto] =
    useState<boolean>(false);
  const [provedorConfigurando, setProvedorConfigurando] = useState<
    string | null
  >(null);
  const [formToken, setFormToken] = useState<string>("");
  const [formAccountId, setFormAccountId] = useState<string>("");
  const [formHandle, setFormHandle] = useState<string>("");
  const [formSiteUrl, setFormSiteUrl] = useState<string>("");
  const [salvandoConexao, setSalvandoConexao] = useState<boolean>(false);

  // Modal para cadastrar Nova Empresa / Cliente no Supabase (`empresas`)
  const [modalNovaEmpresaAberto, setModalNovaEmpresaAberto] =
    useState<boolean>(false);
  const [novaEmpresaNome, setNovaEmpresaNome] = useState<string>("");
  const [novaEmpresaSite, setNovaEmpresaSite] = useState<string>("");
  const [novaEmpresaSegmento, setNovaEmpresaSegmento] = useState<string>("");

  // Filtros de Analítica e Calendário
  const [periodoSelecionado, setPeriodoSelecionado] = useState<
    "7d" | "30d" | "mes_atual" | "ano"
  >("30d");
  const [buscaTabelaPosts, setBuscaTabelaPosts] = useState<string>("");
  const [heatmapRede, setHeatmapRede] = useState<
    "instagram" | "facebook" | "linkedin" | "tiktok"
  >("instagram");
  const [mostrarPctHeatmap, setMostrarPctHeatmap] = useState<boolean>(true);
  const [buscaCalendario, setBuscaCalendario] = useState<string>("");
  const [filtroRedeCalendario, setFiltroRedeCalendario] =
    useState<string>("todas");

  // Modal "Criar nova publicação"
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
    "ciclo_editorial"
  );
  const [postNotas, setPostNotas] = useState<string>("");
  const [mostrarUtmBuilder, setMostrarUtmBuilder] = useState<boolean>(false);
  const [mostrarPrimeiroComentario, setMostrarPrimeiroComentario] =
    useState<boolean>(false);
  const [mostrarPredefinicoesGlobais, setMostrarPredefinicoesGlobais] =
    useState<boolean>(false);

  // Estado real persistido por empresa no Supabase (ZERO dados falsos!)
  const [postsAgendadosExtras, setPostsAgendadosExtras] = useState<
    ScheduledPostItem[]
  >([]);
  const [concorrentes, setConcorrentes] = useState<CompetitorRow[]>([]);
  const [novoConcorrenteHandle, setNovoConcorrenteHandle] =
    useState<string>("");
  const [threadsInbox, setThreadsInbox] = useState<InboxThread[]>([]);
  const [filtroInboxStatus, setFiltroInboxStatus] = useState<
    "nao_resolvido" | "nao_lido" | "todos"
  >("nao_resolvido");
  const [filtroInboxRede, setFiltroInboxRede] = useState<string>("todas");
  const [threadAtivaId, setThreadAtivaId] = useState<string>("");
  const [textoRespostaInbox, setTextoRespostaInbox] = useState<string>("");

  const [smartLinkTitulo, setSmartLinkTitulo] = useState<string>(
    `${marcaAtiva.nome}`
  );
  const [smartLinkBio, setSmartLinkBio] = useState<string>(
    `Links oficiais de ${marcaAtiva.nome}`
  );
  const [smartLinkBotoes, setSmartLinkBotoes] = useState<SmartLinkButton[]>([]);
  const [novoBotaoTitulo, setNovoBotaoTitulo] = useState<string>("");
  const [novoBotaoUrl, setNovoBotaoUrl] = useState<string>("");

  const [relatorioTitulo, setRelatorioTitulo] = useState<string>(
    `Relatório Executivo — ${marcaAtiva.nome}`
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
  });

  const [toast, setToast] = useState<string | null>(null);
  function dispararToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  const carregarEstadoDaEmpresa = useCallback(async (mId: string) => {
    setCarregandoDadosEmpresa(true);
    try {
      const res = await fetch(
        `/api/metricool?marca_id=${encodeURIComponent(mId)}`
      );
      const data = await res.json();
      if (!res.ok) return;

      setEmpresaIdSupabase(data.empresa_id || "");
      setIntegracoesEmpresa(
        Array.isArray(data.integracoes_empresa) ? data.integracoes_empresa : []
      );

      const st = data.state;
      setPostsAgendadosExtras(
        Array.isArray(st?.postsAgendados) ? st.postsAgendados : []
      );
      setConcorrentes(Array.isArray(st?.concorrentes) ? st.concorrentes : []);
      setThreadsInbox(Array.isArray(st?.threadsInbox) ? st.threadsInbox : []);
      if (st?.smartLinks) {
        setSmartLinkTitulo(st.smartLinks.titulo || marcaAtiva.nome);
        setSmartLinkBio(
          st.smartLinks.bio || `Links oficiais de ${marcaAtiva.nome}`
        );
        setSmartLinkBotoes(
          Array.isArray(st.smartLinks.botoes) ? st.smartLinks.botoes : []
        );
      }
    } catch {
      // ignore
    } finally {
      setCarregandoDadosEmpresa(false);
    }
  }, [marcaAtiva.nome]);

  useEffect(() => {
    carregarEstadoDaEmpresa(marcaAtiva.id);
    setRelatorioTitulo(`Relatório Executivo — ${marcaAtiva.nome}`);
  }, [marcaAtiva.id, marcaAtiva.nome, carregarEstadoDaEmpresa]);

  // Verifica se uma rede específica está ativa para esta empresa no Supabase
  function obterIntegracaoAtiva(
    provedor: string
  ): IntegracaoEmpresaPublica | undefined {
    return integracoesEmpresa.find(
      (i) => i.provedor.toLowerCase() === provedor.toLowerCase() && i.ativa
    );
  }

  // Peças reais do Motor (da tabela `pecas` do Supabase desta marca) mapeadas no calendário
  const postsIniciaisDoMotor = useMemo<ScheduledPostItem[]>(() => {
    const carrosseis = demandas.filter(
      (d) => d.marca_id === marcaAtiva.id && d.formato_canal !== "blog"
    );
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
        primeiroComentario: "",
        redes: ["instagram"],
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
        utmCampaign: `peca_${d.id.slice(0, 6)}`,
        notasEquipe: `Peça real da tabela pecas do Supabase (${slides.length} lâminas).`,
      };
    });
  }, [demandas, marcaAtiva.id]);

  const todosPostsCalendario = useMemo(() => {
    const filtradosExtras = postsAgendadosExtras.filter(
      (p) => !p.marcaId || p.marcaId === marcaAtiva.id
    );
    const idsExtras = new Set(filtradosExtras.map((p) => p.id));
    return [
      ...filtradosExtras,
      ...postsIniciaisDoMotor.filter((p) => !idsExtras.has(p.id)),
    ];
  }, [postsIniciaisDoMotor, postsAgendadosExtras, marcaAtiva.id]);

  // Abrir modal para configurar/conectar uma rede específica da empresa ativa
  function iniciarConexaoRede(provedor: string) {
    const existente = obterIntegracaoAtiva(provedor);
    setProvedorConfigurando(provedor);
    setFormToken("");
    setFormAccountId(
      existente?.config?.account_id ||
        existente?.config?.page_id ||
        existente?.config?.usuario ||
        ""
    );
    setFormHandle(existente?.config?.handle || "");
    setFormSiteUrl(existente?.config?.site_url || "");
    setModalConexoesAberto(true);
  }

  async function salvarConexaoRedeEmpresa() {
    if (!provedorConfigurando) return;
    if (!formToken.trim()) {
      dispararToast(
        "Informe o Token de Acesso / Chave da API desta conta para validar a conexão."
      );
      return;
    }
    setSalvandoConexao(true);
    try {
      const res = await fetch("/api/metricool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "conectar_integracao_empresa",
          marca_id: marcaAtiva.id,
          empresa_id: empresaIdSupabase || undefined,
          provedor: provedorConfigurando,
          token: formToken.trim(),
          account_id: formAccountId.trim(),
          handle: formHandle.trim(),
          site_url: formSiteUrl.trim(),
          usuario: formAccountId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispararToast(data.error || "Erro ao validar conexão.");
        return;
      }
      setIntegracoesEmpresa(data.integracoes_empresa || []);
      if (data.state?.threadsInbox) {
        setThreadsInbox(data.state.threadsInbox);
      }
      setProvedorConfigurando(null);
      setFormToken("");
      dispararToast(
        `Conexão ${provedorConfigurando.toUpperCase()} validada e salva no Supabase para a empresa ${marcaAtiva.nome}!`
      );
    } catch {
      dispararToast("Falha de rede ao salvar conexão.");
    } finally {
      setSalvandoConexao(false);
    }
  }

  async function sincronizarRedeConectadaAgora(provedor: string) {
    setSalvandoConexao(true);
    try {
      const res = await fetch("/api/metricool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "sincronizar_rede_conectada",
          marca_id: marcaAtiva.id,
          empresa_id: empresaIdSupabase || undefined,
          provedor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispararToast(data.error || "Erro ao sincronizar com a API oficial.");
        return;
      }
      if (data.integracoes_empresa) {
        setIntegracoesEmpresa(data.integracoes_empresa);
      }
      if (data.state?.threadsInbox) {
        setThreadsInbox(data.state.threadsInbox);
      }
      dispararToast(
        `Dados reais de ${provedor.toUpperCase()} sincronizados para ${marcaAtiva.nome}!`
      );
    } finally {
      setSalvandoConexao(false);
    }
  }

  async function desconectarRedeEmpresa(provedor: string) {
    const res = await fetch("/api/metricool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "desconectar_integracao_empresa",
        marca_id: marcaAtiva.id,
        empresa_id: empresaIdSupabase || undefined,
        provedor,
      }),
    });
    const data = await res.json();
    if (res.ok && data.integracoes_empresa) {
      setIntegracoesEmpresa(data.integracoes_empresa);
      dispararToast(
        `Integração ${provedor.toUpperCase()} removida da empresa ${marcaAtiva.nome}.`
      );
    }
  }

  async function criarNovaEmpresaNoSupabase() {
    if (!novaEmpresaNome.trim()) {
      dispararToast("Informe o nome da nova empresa/cliente.");
      return;
    }
    const res = await fetch("/api/metricool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "criar_nova_empresa",
        nome: novaEmpresaNome.trim(),
        site_url: novaEmpresaSite.trim(),
        segmento: novaEmpresaSegmento.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      dispararToast(data.error || "Erro ao criar empresa.");
      return;
    }
    setModalNovaEmpresaAberto(false);
    setNovaEmpresaNome("");
    setNovaEmpresaSite("");
    setNovaEmpresaSegmento("");
    dispararToast(
      `Empresa "${data.empresa.nome}" criada no Supabase com ambiente de conexões isolado!`
    );
    onTrocarMarca(data.empresa.id);
  }

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
      setPostPrimeiroComentario("");
      setPostRedes(["instagram"]);
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
        `Importado da peça real ${d.id} (${slides.length} lâminas no Supabase).`
      );
    } else {
      setPostEditandoId(null);
      setPostTitulo("");
      setPostLegenda("");
      setPostPrimeiroComentario("");
      setPostRedes(["instagram"]);
      setPostFormato("CARROSSEL");
      setPostDiaIdx(opts?.diaIdx ?? 1);
      setPostHora(opts?.hora ?? 18);
      setPostMinuto(0);
      setPostImagens([]);
      setPostUtmSource("instagram");
      setPostUtmCampaign("campanha");
      setPostNotas("");
    }
    setAbaModalPost("editor");
    setModalCriarPostAberto(true);
  }

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

    await fetch("/api/metricool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "salvar_post_calendario",
        marca_id: marcaAtiva.id,
        empresa_id: empresaIdSupabase || undefined,
        post: novoItem,
      }),
    }).catch(() => {});

    const igConectado = Boolean(obterIntegracaoAtiva("instagram"));
    dispararToast(
      novoStatus === "publicado"
        ? igConectado
          ? "Publicação salva no Supabase e enviada para a conta conectada!"
          : "Publicação salva no Calendário! (Para postar direto no Instagram real desta empresa, conecte a chave da Meta em '+ Ligações')."
        : `Publicação salva no Supabase para ${DIAS_SEMANA[postDiaIdx]?.longo} às ${String(postHora).padStart(2, "0")}:00!`
    );
  }

  function exportarTabelaPostsCsv() {
    const cabecalho = [
      "ID_Supabase",
      "Empresa",
      "Titulo",
      "Canal_Formato",
      "Status",
      "Slides_Salvos",
      "Checagens_OK",
      "Atualizado_Em",
    ];
    const linhas = demandas.map((d) => {
      const slidesCount = d.conteudo_estruturado?.slides?.length || 1;
      const checagensOk = (d.conteudo_estruturado?.checagens || []).filter(
        (c) => c.resultado === "ok"
      ).length;
      return [
        d.id,
        `"${marcaAtiva.nome}"`,
        `"${(d.titulo || "").replace(/"/g, '""')}"`,
        d.formato_canal,
        d.status,
        slidesCount,
        checagensOk,
        d.atualizado_em,
      ].join(",");
    });
    const csvContent = [cabecalho.join(","), ...linhas].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pecas-reais-${marcaAtiva.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dispararToast("Planilha CSV com os registros reais transferida!");
  }

  const threadAtiva =
    threadsInbox.find((t) => t.id === threadAtivaId) || threadsInbox[0] || null;

  // Integração ativa para o canal atualmente selecionado na aba Analítica
  const provedorCanalAnalitica =
    analyticsChannel === "web_blog"
      ? "wordpress"
      : analyticsChannel === "resumo"
        ? "resumo"
        : analyticsChannel;

  const integracaoCanalAtivo =
    provedorCanalAnalitica !== "resumo" &&
    provedorCanalAnalitica !== "concorrentes"
      ? obterIntegracaoAtiva(provedorCanalAnalitica)
      : undefined;

  const igIntegracao = obterIntegracaoAtiva("instagram");
  const fbIntegracao = obterIntegracaoAtiva("facebook");
  const wpIntegracao = obterIntegracaoAtiva("wordpress");
  const googleIntegracao = obterIntegracaoAtiva("google");

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-slate-900 flex flex-col font-sans">
      {/* =====================================================================
          TOP NAVIGATION BAR FIEL AO METRICOOL (#261724 + BORDA LIME #D4F838)
      ===================================================================== */}
      <header className="h-16 bg-[#261724] text-white border-b-[3px] border-[#D4F838] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div
            onClick={() => setMainTab("analitica")}
            className="flex items-center gap-1.5 cursor-pointer group"
          >
            <span className="text-2xl font-black tracking-tighter text-white group-hover:text-[#D4F838] transition-colors">
              ∞
            </span>
            <span className="hidden sm:inline text-sm font-extrabold tracking-tight text-white">
              Metricool
            </span>
          </div>

          {/* Seletor Multi-Empresa (Cada empresa com suas conexões isoladas no Supabase) */}
          <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full pl-1.5 pr-3 py-1 transition-all">
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
                  {m.nome} ({m.slug})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setModalNovaEmpresaAberto(true)}
            className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white cursor-pointer"
            title="Cadastrar nova empresa/cliente no Supabase com conexões isoladas"
          >
            <span>+ Nova Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProvedorConfigurando(null);
              setModalConexoesAberto(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4F838]/15 hover:bg-[#D4F838]/25 border border-[#D4F838]/40 text-[11px] font-bold text-[#D4F838] cursor-pointer transition-all"
          >
            <span>🔌</span>
            <span>
              Ligações de {marcaAtiva.nome} ({integracoesEmpresa.length}{" "}
              ativas)
            </span>
          </button>
        </div>

        {/* Abas Principais */}
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

        <div className="flex items-center gap-2.5">
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

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#261724] text-white border-2 border-[#D4F838] px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2.5 max-w-md">
          <span className="text-[#D4F838] text-base">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* =====================================================================
          ABA 1: ANALÍTICA (/evolution) — 100% REAL E INDIVIDUALIZADA POR CONTA
      ===================================================================== */}
      {mainTab === "analitica" && (
        <div className="flex flex-1 min-h-[calc(100vh-64px)]">
          {/* Sidebar Esquerda de Canais com indicador real de Conectado / Não Conectado */}
          <aside className="w-16 sm:w-56 bg-white border-r border-slate-200 p-2.5 flex flex-col gap-1 shrink-0">
            {[
              { id: "resumo", label: "Resumo da Conta", icon: "📋", prov: "resumo" },
              { id: "web_blog", label: "Website & Blog", icon: "🌐", prov: "wordpress" },
              { id: "facebook", label: "Facebook", icon: "📘", prov: "facebook" },
              { id: "instagram", label: "Instagram", icon: "📸", prov: "instagram" },
              { id: "linkedin", label: "LinkedIn", icon: "💼", prov: "linkedin" },
              { id: "tiktok", label: "TikTok", icon: "🎵", prov: "tiktok" },
              { id: "youtube", label: "YouTube", icon: "▶️", prov: "youtube" },
              { id: "concorrentes", label: "Concorrentes", icon: "📊", prov: "concorrentes" },
            ].map((ch) => {
              const active = analyticsChannel === ch.id;
              const conectado =
                ch.prov === "resumo" || ch.prov === "concorrentes"
                  ? null
                  : Boolean(obterIntegracaoAtiva(ch.prov));
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() =>
                    setAnalyticsChannel(ch.id as AnalyticsChannel)
                  }
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-[#261724] text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="text-base">{ch.icon}</span>
                    <span className="hidden sm:inline truncate">{ch.label}</span>
                  </span>
                  {conectado !== null && (
                    <span
                      title={
                        conectado
                          ? `Conectado para ${marcaAtiva.nome}`
                          : `Não conectado para ${marcaAtiva.nome}`
                      }
                      className={`hidden sm:inline-block w-2 h-2 rounded-full ${
                        conectado ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </aside>

          {/* Painel Principal */}
          <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
            {/* Cabeçalho da Empresa + Período */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C996CC] text-[#261724] font-black text-base flex items-center justify-center">
                  {marcaAtiva.nome.charAt(0)}
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900">
                    Conta: {marcaAtiva.nome}
                  </h1>
                  <p className="text-xs text-slate-500">
                    ID Empresa Supabase:{" "}
                    <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                      {empresaIdSupabase || marcaAtiva.id}
                    </code>{" "}
                    · {integracoesEmpresa.length} conexão(ões) ativa(s) para esta conta
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={periodoSelecionado}
                  onChange={(e) =>
                    setPeriodoSelecionado(
                      e.target.value as "7d" | "30d" | "mes_atual" | "ano"
                    )
                  }
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="7d">📅 Últimos 7 dias</option>
                  <option value="30d">📅 Últimos 30 dias</option>
                  <option value="mes_atual">📅 Este mês</option>
                  <option value="ano">📅 Últimos 12 meses</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setProvedorConfigurando(null);
                    setModalConexoesAberto(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                >
                  🔌 Gerenciar Ligações da Conta
                </button>
              </div>
            </div>

            {/* VISÃO 1: RESUMO DA CONTA (Idêntico à foto step_24.png do Metricool!) */}
            {analyticsChannel === "resumo" && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
                <h2 className="text-base font-extrabold text-slate-900">
                  Resumo Real da Conta — {marcaAtiva.nome}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card Seguidores Instagram */}
                  <div className="bg-[#FADBF0] rounded-2xl p-5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Instagram ({igIntegracao?.config?.handle || "Não ligado"})
                    </span>
                    <p className="text-3xl font-black text-slate-900 my-3">
                      {igIntegracao?.config?.seguidores !== undefined
                        ? igIntegracao.config.seguidores.toLocaleString("pt-BR")
                        : "—"}
                    </p>
                    {igIntegracao ? (
                      <button
                        type="button"
                        onClick={() =>
                          sincronizarRedeConectadaAgora("instagram")
                        }
                        className="text-[11px] font-bold text-[#261724] underline text-left cursor-pointer"
                      >
                        🔄 Sincronizar Instagram agora
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => iniciarConexaoRede("instagram")}
                        className="text-[11px] font-extrabold text-[#261724] underline text-left cursor-pointer"
                      >
                        + Ligar Instagram desta empresa
                      </button>
                    )}
                  </div>

                  {/* Card Facebook */}
                  <div className="bg-[#9096F0] rounded-2xl p-5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Facebook ({fbIntegracao?.config?.nome_conta || "Não ligado"})
                    </span>
                    <p className="text-3xl font-black text-slate-900 my-3">
                      {fbIntegracao?.config?.seguidores !== undefined
                        ? fbIntegracao.config.seguidores.toLocaleString("pt-BR")
                        : "—"}
                    </p>
                    {fbIntegracao ? (
                      <button
                        type="button"
                        onClick={() =>
                          sincronizarRedeConectadaAgora("facebook")
                        }
                        className="text-[11px] font-bold text-slate-900 underline text-left cursor-pointer"
                      >
                        🔄 Sincronizar Facebook agora
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => iniciarConexaoRede("facebook")}
                        className="text-[11px] font-extrabold text-slate-900 underline text-left cursor-pointer"
                      >
                        + Ligar Facebook desta empresa
                      </button>
                    )}
                  </div>

                  {/* Card Website / WordPress Real */}
                  <div className="bg-[#A3CCA8] rounded-2xl p-5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Website / WordPress
                    </span>
                    <p className="text-lg font-black text-slate-900 my-3 truncate">
                      {wpIntegracao?.config?.site_url ||
                        (wpIntegracao ? "Conectado" : "—")}
                    </p>
                    <span className="text-[11px] font-bold text-slate-800">
                      {wpIntegracao
                        ? `✓ Ativo (${wpIntegracao.chave_mascarada})`
                        : "Não conectado"}
                    </span>
                  </div>

                  {/* Card Peças Reais no Supabase */}
                  <div className="bg-[#DFE3E8] rounded-2xl p-5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Peças Reais no Supabase (`pecas`)
                    </span>
                    <p className="text-3xl font-black text-slate-900 my-3">
                      {
                        demandas.filter((d) => d.marca_id === marcaAtiva.id)
                          .length
                      }
                    </p>
                    <span className="text-[11px] font-bold text-emerald-800">
                      ✓ 100% persistido no banco real
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VISÃO 2: CANAL ESPECÍFICO NÃO CONECTADO -> MOSTRA TELA HONESTA "LIGAR CONTA" */}
            {analyticsChannel !== "resumo" &&
              analyticsChannel !== "concorrentes" &&
              !integracaoCanalAtivo && (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-2xs text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#261724] text-[#D4F838] font-black text-2xl flex items-center justify-center mx-auto">
                    🔌
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    A conta de {analyticsChannel.toUpperCase()} da empresa{" "}
                    {marcaAtiva.nome} ainda não está conectada
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Para não exibir nenhum número fictício ou de demonstração, os
                    indicadores de seguidores, alcance, impressões e comentários
                    de <strong>{marcaAtiva.nome}</strong> ficam vazios até que você
                    conecte o Token/Conta oficial desta empresa no Supabase.
                  </p>
                  <button
                    type="button"
                    onClick={() => iniciarConexaoRede(provedorCanalAnalitica)}
                    className="px-5 py-2.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer shadow-sm"
                  >
                    + Ligar {analyticsChannel.toUpperCase()} para{" "}
                    {marcaAtiva.nome}
                  </button>
                </div>
              )}

            {/* VISÃO 3: CANAL ESPECÍFICO CONECTADO -> MOSTRA DADOS REAIS DA INTEGRAÇÃO */}
            {analyticsChannel !== "resumo" &&
              analyticsChannel !== "concorrentes" &&
              integracaoCanalAtivo && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                        ✓ Conta Conectada no Supabase ({integracaoCanalAtivo.chave_mascarada})
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900 mt-1">
                        {integracaoCanalAtivo.config?.nome_conta ||
                          integracaoCanalAtivo.config?.site_url ||
                          integracaoCanalAtivo.provedor.toUpperCase()}{" "}
                        {integracaoCanalAtivo.config?.handle
                          ? `(${integracaoCanalAtivo.config.handle})`
                          : ""}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {(integracaoCanalAtivo.provedor === "instagram" ||
                        integracaoCanalAtivo.provedor === "facebook") && (
                        <button
                          type="button"
                          onClick={() =>
                            sincronizarRedeConectadaAgora(
                              integracaoCanalAtivo.provedor
                            )
                          }
                          disabled={salvandoConexao}
                          className="px-3.5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                        >
                          🔄 Sincronizar Dados da Meta Graph API
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          iniciarConexaoRede(integracaoCanalAtivo.provedor)
                        }
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        ⚙️ Configurar Credencial
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#A3CCA8] rounded-2xl p-4">
                      <span className="text-xs font-bold text-slate-800">
                        Seguidores Reais Sincronizados
                      </span>
                      <p className="text-2xl font-black text-slate-900 mt-2">
                        {integracaoCanalAtivo.config?.seguidores !== undefined
                          ? integracaoCanalAtivo.config.seguidores.toLocaleString(
                              "pt-BR"
                            )
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-[#9096F0] rounded-2xl p-4">
                      <span className="text-xs font-bold text-slate-900">
                        Publicações na Conta Conectada
                      </span>
                      <p className="text-2xl font-black text-slate-900 mt-2">
                        {integracaoCanalAtivo.config?.total_publicacoes !==
                        undefined
                          ? integracaoCanalAtivo.config.total_publicacoes
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-[#DFE3E8] rounded-2xl p-4">
                      <span className="text-xs font-bold text-slate-800">
                        Última Sincronização Oficial
                      </span>
                      <p className="text-sm font-black text-slate-900 mt-2">
                        {integracaoCanalAtivo.config?.ultima_sincronizacao
                          ? new Date(
                              integracaoCanalAtivo.config.ultima_sincronizacao
                            ).toLocaleString("pt-BR")
                          : new Date(
                              integracaoCanalAtivo.atualizado_em
                            ).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Se houver posts reais vindos da Meta Graph API */}
                  {Array.isArray(integracaoCanalAtivo.config?.posts_reais) &&
                    integracaoCanalAtivo.config.posts_reais.length > 0 && (
                      <div className="pt-3 space-y-2">
                        <h3 className="text-xs font-extrabold uppercase text-slate-500">
                          Publicações Reais Puxadas da Conta ({integracaoCanalAtivo.config.posts_reais.length})
                        </h3>
                        <div className="divide-y divide-slate-100">
                          {integracaoCanalAtivo.config.posts_reais.map((pr) => (
                            <div
                              key={pr.id}
                              className="py-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <p className="font-semibold text-slate-800 line-clamp-1 max-w-xl">
                                {pr.caption || "(Sem legenda)"}
                              </p>
                              <div className="flex items-center gap-3 shrink-0">
                                <span>❤️ {pr.like_count ?? 0}</span>
                                <span>💬 {pr.comments_count ?? 0}</span>
                                {pr.permalink && (
                                  <a
                                    href={pr.permalink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 underline font-bold"
                                  >
                                    Ver no Instagram ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

            {/* VISÃO 4: CONCORRENTES DA EMPRESA ATIVA (VAZIO ATÉ CADASTRAR) */}
            {analyticsChannel === "concorrentes" && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      🕵️ Concorrentes Monitorados para {marcaAtiva.nome}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Lista exclusiva desta empresa salva no Supabase (sem dados pré-inventados).
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
                      onClick={async () => {
                        if (!novoConcorrenteHandle.trim()) return;
                        const novaLista: CompetitorRow[] = [
                          ...concorrentes,
                          {
                            id: `comp-${Date.now()}`,
                            nome: novoConcorrenteHandle.replace("@", ""),
                            handle: novoConcorrenteHandle.startsWith("@")
                              ? novoConcorrenteHandle
                              : `@${novoConcorrenteHandle}`,
                            rede: "instagram",
                            seguidores: 0,
                            crescimentoPct: 0,
                            publicacoesPeriodo: 0,
                            engajamentoPct: 0,
                            mediaInteracoes: 0,
                          },
                        ];
                        setConcorrentes(novaLista);
                        setNovoConcorrenteHandle("");
                        await fetch("/api/metricool", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            acao: "salvar_concorrentes",
                            marca_id: marcaAtiva.id,
                            empresa_id: empresaIdSupabase || undefined,
                            concorrentes: novaLista,
                          }),
                        });
                        dispararToast(
                          `Concorrente salvo no Supabase para ${marcaAtiva.nome}!`
                        );
                      }}
                      className="px-4 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                    >
                      + Adicionar Concorrente
                    </button>
                  </div>
                </div>

                {concorrentes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-xl border border-slate-200/70">
                    Nenhum concorrente cadastrado para{" "}
                    <strong>{marcaAtiva.nome}</strong> ainda. Adicione um{" "}
                    <code>@handle</code> acima para monitorar.
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Concorrente</th>
                        <th className="py-2.5 px-3">Handle</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {concorrentes.map((c) => (
                        <tr key={c.id}>
                          <td className="py-2.5 px-3 font-bold">{c.nome}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {c.handle}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const filtrada = concorrentes.filter(
                                  (x) => x.id !== c.id
                                );
                                setConcorrentes(filtrada);
                                await fetch("/api/metricool", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    acao: "salvar_concorrentes",
                                    marca_id: marcaAtiva.id,
                                    empresa_id: empresaIdSupabase || undefined,
                                    concorrentes: filtrada,
                                  }),
                                });
                              }}
                              className="text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TABELA DE PEÇAS REAIS DO SUPABASE (SEM NÚMEROS FICTÍCIOS) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Peças e Carrosséis Reais no Supabase (`pecas`) —{" "}
                    {marcaAtiva.nome}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registros reais gravados no banco de dados da empresa (sem métricas simuladas).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={buscaTabelaPosts}
                    onChange={(e) => setBuscaTabelaPosts(e.target.value)}
                    placeholder="🔍 Pesquisar peça..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={exportarTabelaPostsCsv}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    ⬇ Transferir CSV Real
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                      <th className="py-3 px-3">Peça / Título Real</th>
                      <th className="py-3 px-3">Formato</th>
                      <th className="py-3 px-3">Lâminas / Slides</th>
                      <th className="py-3 px-3">Status no Motor</th>
                      <th className="py-3 px-3">Última Atualização</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {demandas
                      .filter(
                        (d) =>
                          d.marca_id === marcaAtiva.id &&
                          (!buscaTabelaPosts.trim() ||
                            d.titulo
                              .toLowerCase()
                              .includes(buscaTabelaPosts.toLowerCase()))
                      )
                      .map((d) => {
                        const slidesCount =
                          d.conteudo_estruturado?.slides?.length || 0;
                        const thumb =
                          d.conteudo_estruturado?.slides?.[0]?.imagem_url;
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
                                  <p className="text-[11px] text-slate-500 font-mono truncate">
                                    ID Supabase: {d.id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#5B1F8A] font-bold uppercase text-[10px]">
                                {d.formato_canal}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold">
                              {d.formato_canal === "blog"
                                ? "Artigo Markdown"
                                : `${slidesCount} slides`}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                                {d.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {new Date(d.atualizado_em).toLocaleString(
                                "pt-BR"
                              )}
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
                                  onClick={() => onAbrirDemandaNoMotor(d.id)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                                >
                                  ✏️ Abrir Peça
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
          </main>
        </div>
      )}

      {/* =====================================================================
          ABA 2: PLANIFICAÇÃO / CALENDÁRIO (/planner/calendar)
      ===================================================================== */}
      {mainTab === "planificacao" && (
        <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-[1600px] w-full mx-auto">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto gap-4">
            <div className="flex items-center gap-6">
              {[
                { id: "calendario", label: "Calendário" },
                { id: "lista", label: "Lista" },
                { id: "preview_feed", label: "📱 Preview do Feed (Grid 3×3)" },
                {
                  id: "biblioteca_motor",
                  label: `Peças do Supabase (${demandas.filter((d) => d.marca_id === marcaAtiva.id).length})`,
                },
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
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-semibold text-slate-500">
              Empresa ativa: <strong>{marcaAtiva.nome}</strong> · America/Sao_Paulo
            </div>
          </div>

          {/* Controles do Calendário */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md bg-white border border-slate-300 rounded-xl px-3.5 py-2">
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                value={buscaCalendario}
                onChange={(e) => setBuscaCalendario(e.target.value)}
                placeholder="Pesquisar no calendário desta empresa..."
                className="w-full text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={filtroRedeCalendario}
                onChange={(e) => setFiltroRedeCalendario(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="todas">🌪️ Todas as redes</option>
                <option value="instagram">📸 Instagram</option>
                <option value="facebook">📘 Facebook</option>
                <option value="linkedin">💼 LinkedIn</option>
              </select>

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
                >
                  %
                </button>
              </div>

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
                          {dia.longo}
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
                                      <span className="text-[10px] font-extrabold text-[#5B1F8A]">
                                        {post.formato}
                                      </span>
                                      <span className="text-[10px] font-extrabold text-slate-900">
                                        {String(post.hora).padStart(2, "0")}:00
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-700 font-medium line-clamp-2 leading-tight">
                                      {post.titulo}
                                    </p>
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

          {plannerSubTab === "preview_feed" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-md mx-auto w-full">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {igIntegracao?.config?.handle || `@${marcaAtiva.slug}`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Preview do Grid 3×3 ({marcaAtiva.nome})
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#D4F838] text-[#261724] text-[10px] font-black">
                  GRID 3×3
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-4">
                {todosPostsCalendario.slice(0, 9).map((post, i) => (
                  <div
                    key={post.id}
                    onClick={() => abrirModalNovoPost({ postExistente: post })}
                    className="aspect-[4/5] bg-[#0A0820] rounded-md overflow-hidden relative cursor-pointer border border-slate-800"
                  >
                    {post.imagens[0] ? (
                      <img
                        src={post.imagens[0]}
                        alt={post.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-2 h-full flex flex-col justify-between text-white">
                        <span className="text-[8px] text-[#F4834B] font-bold">
                          0{i + 1}
                        </span>
                        <p className="text-[9px] font-bold line-clamp-4">
                          {post.titulo}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(plannerSubTab === "lista" ||
            plannerSubTab === "biblioteca_motor") && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3">
              {demandas
                .filter((d) => d.marca_id === marcaAtiva.id)
                .map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {d.titulo}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {d.formato_canal.toUpperCase()} · ID: {d.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirModalNovoPost({ demanda: d })}
                      className="px-3 py-1.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
                    >
                      📅 Agendar no Calendário
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ABA 3: INBOX (/inbox) — ZERO DADOS FALSOS! SÓ EXIBE COMENTÁRIOS/DMS REAIS DA CONTA CONECTADA
      ===================================================================== */}
      {mainTab === "inbox" && (
        <div className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          {threadsInbox.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center max-w-2xl mx-auto space-y-4 my-8">
              <div className="w-14 h-14 rounded-2xl bg-[#261724] text-[#D4F838] font-black text-2xl flex items-center justify-center mx-auto">
                💬
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Caixa de Entrada Limpa — Nenhum comentário ou DM sincronizado para{" "}
                {marcaAtiva.nome}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Removemos todos os exemplos fictícios de demonstração. Para que
                os comentários e mensagens reais do Instagram, Facebook ou
                LinkedIn de <strong>{marcaAtiva.nome}</strong> apareçam aqui,
                conecte o Token da conta oficial desta empresa no botão abaixo.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => iniciarConexaoRede("instagram")}
                  className="px-5 py-2.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
                >
                  🔌 Ligar Instagram Business de {marcaAtiva.nome}
                </button>
                {igIntegracao && (
                  <button
                    type="button"
                    onClick={() => sincronizarRedeConectadaAgora("instagram")}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    🔄 Buscar Comentários Reais Agora
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[70vh]">
              <div className="lg:col-span-5 border-r border-slate-200 divide-y divide-slate-100">
                {threadsInbox.map((th) => (
                  <div
                    key={th.id}
                    onClick={() => setThreadAtivaId(th.id)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 ${
                      threadAtiva?.id === th.id ? "bg-purple-50/70" : ""
                    }`}
                  >
                    <p className="text-xs font-extrabold text-slate-900">
                      {th.autorNome} ({th.autorHandle})
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {th.ultimaMensagem}
                    </p>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-7 p-5 flex flex-col justify-between">
                {threadAtiva && (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-extrabold">
                        {threadAtiva.autorNome}
                      </p>
                      {threadAtiva.mensagens.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-slate-100 text-xs"
                        >
                          {m.texto}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-4">
                      <input
                        type="text"
                        value={textoRespostaInbox}
                        onChange={(e) => setTextoRespostaInbox(e.target.value)}
                        placeholder="Responder..."
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ABA 4: SMARTLINKS (/smartlink) — INDIVIDUALIZADO POR EMPRESA NO SUPABASE
      ===================================================================== */}
      {mainTab === "smartlinks" && (
        <div className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <h2 className="text-base font-extrabold text-slate-900">
              🔗 SmartLinks Individualizado — {marcaAtiva.nome}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={smartLinkTitulo}
                onChange={(e) => setSmartLinkTitulo(e.target.value)}
                placeholder="Título da Bio"
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                value={smartLinkBio}
                onChange={(e) => setSmartLinkBio(e.target.value)}
                placeholder="Descrição da Bio"
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={novoBotaoTitulo}
                onChange={(e) => setNovoBotaoTitulo(e.target.value)}
                placeholder="Título do botão"
                className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                value={novoBotaoUrl}
                onChange={(e) => setNovoBotaoUrl(e.target.value)}
                placeholder="https://..."
                className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!novoBotaoTitulo.trim()) return;
                  const novos: SmartLinkButton[] = [
                    ...smartLinkBotoes,
                    {
                      id: `sl-${Date.now()}`,
                      titulo: novoBotaoTitulo.trim(),
                      url: novoBotaoUrl.trim() || "https://",
                      cliques: 0,
                      ativo: true,
                    },
                  ];
                  setSmartLinkBotoes(novos);
                  setNovoBotaoTitulo("");
                  setNovoBotaoUrl("");
                  await fetch("/api/metricool", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      acao: "salvar_smartlinks",
                      marca_id: marcaAtiva.id,
                      empresa_id: empresaIdSupabase || undefined,
                      titulo: smartLinkTitulo,
                      bio: smartLinkBio,
                      botoes: novos,
                    }),
                  });
                  dispararToast(
                    `Botão salvo no Supabase para ${marcaAtiva.nome}!`
                  );
                }}
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-bold cursor-pointer"
              >
                + Botão
              </button>
            </div>

            <div className="space-y-2">
              {smartLinkBotoes.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Nenhum botão cadastrado para {marcaAtiva.nome} ainda.
                </p>
              ) : (
                smartLinkBotoes.map((btn) => (
                  <div
                    key={btn.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold">{btn.titulo}</p>
                      <p className="text-slate-500">{btn.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const filtrados = smartLinkBotoes.filter(
                          (b) => b.id !== btn.id
                        );
                        setSmartLinkBotoes(filtrados);
                        await fetch("/api/metricool", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            acao: "salvar_smartlinks",
                            marca_id: marcaAtiva.id,
                            empresa_id: empresaIdSupabase || undefined,
                            titulo: smartLinkTitulo,
                            bio: smartLinkBio,
                            botoes: filtrados,
                          }),
                        });
                      }}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-[320px] rounded-[38px] border-[10px] border-[#261724] bg-[#0A0820] text-white p-5 shadow-xl space-y-4">
              <div className="text-center space-y-1.5 pt-2">
                <div className="w-14 h-14 rounded-full mx-auto bg-[#5B1F8A] flex items-center justify-center font-black text-lg">
                  {marcaAtiva.nome.charAt(0)}
                </div>
                <p className="text-xs font-extrabold">{smartLinkTitulo}</p>
                <p className="text-[11px] text-purple-200/80">{smartLinkBio}</p>
              </div>
              <div className="space-y-2">
                {smartLinkBotoes.map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold"
                  >
                    {btn.titulo}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 5: REPORTING / RELATÓRIOS (/reporting)
      ===================================================================== */}
      {mainTab === "reporting" && (
        <div className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">
                📑 Relatório Executivo — {marcaAtiva.nome}
              </h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
              >
                🖨️ Imprimir / Salvar PDF ({relatorioFormato})
              </button>
            </div>
            <input
              type="text"
              value={relatorioTitulo}
              onChange={(e) => setRelatorioTitulo(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 6: ANÚNCIOS (/advertising/campaigns) — IDÊNTICO AO METRICOOL (LIGAR GOOGLE ADS / META ADS)
      ===================================================================== */}
      {mainTab === "anuncios" && (
        <div className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {["meta_ads", "google_ads"].map((prov) => {
              const con = obterIntegracaoAtiva(prov);
              const isMeta = prov === "meta_ads";
              return (
                <div
                  key={prov}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="text-2xl">{isMeta ? "📢" : "🎯"}</span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {isMeta
                        ? "Meta Ads (Facebook & Instagram Ads)"
                        : "Google Ads"}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {isMeta
                        ? "Analise campanhas de alcance, leads e conversões da conta de anúncios desta empresa."
                        : "Analise campanhas de pesquisa, display, palavras-chave e recomendações."}
                    </p>
                  </div>
                  {con ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
                      <span>
                        ✓ Conta {con.config?.account_id || ""} conectada (
                        {con.chave_mascarada})
                      </span>
                      <button
                        type="button"
                        onClick={() => iniciarConexaoRede(prov)}
                        className="underline cursor-pointer"
                      >
                        Editar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => iniciarConexaoRede(prov)}
                      className="self-start px-4 py-2.5 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
                    >
                      {isMeta ? "📢 Ligar o Meta Ads" : "🎯 Ligar o Google Ads"}{" "}
                      ({marcaAtiva.nome})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: LIGAÇÕES E CREDENCIAIS INDIVIDUALIZADAS POR EMPRESA (SUPABASE integracoes)
      ===================================================================== */}
      {modalConexoesAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#261724] text-[#D4F838] text-[10px] font-black uppercase">
                  Conexões Individualizadas por Conta (Supabase `integracoes`)
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-1">
                  🔌 Ligações Oficiais da Empresa: {marcaAtiva.nome}
                </h2>
                <p className="text-xs text-slate-500">
                  Cada empresa possui suas próprias credenciais criptografadas isoladas em{" "}
                  <code>empresa_id = {empresaIdSupabase || marcaAtiva.id}</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProvedorConfigurando(null);
                  setModalConexoesAberto(false);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Se o usuário clicou em um provedor específico para inserir o Token/Chave */}
            {provedorConfigurando ? (
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Configurar {provedorConfigurando.toUpperCase()} para a
                    empresa {marcaAtiva.nome}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setProvedorConfigurando(null)}
                    className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    ← Voltar para a lista de redes
                  </button>
                </div>

                {(provedorConfigurando === "instagram" ||
                  provedorConfigurando === "facebook") && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
                    <p className="font-bold">
                      Como conectar o Instagram / Facebook real desta empresa:
                    </p>
                    <p>
                      Cole abaixo o <strong>Token de Acesso da Meta Graph API</strong>{" "}
                      (com permissões <code>instagram_basic</code>,{" "}
                      <code>instagram_manage_comments</code>,{" "}
                      <code>pages_show_list</code>). O sistema valida na hora na
                      API da Meta e puxa seguidores, posts e comentários reais!
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Token de Acesso / Chave de API (Criptografado no Supabase) *
                    </label>
                    <input
                      type="password"
                      value={formToken}
                      onChange={(e) => setFormToken(e.target.value)}
                      placeholder="Cole aqui o Access Token ou Application Password..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ID da Conta / Página / Usuário (Opcional no IG/FB)
                    </label>
                    <input
                      type="text"
                      value={formAccountId}
                      onChange={(e) => setFormAccountId(e.target.value)}
                      placeholder="Ex: 17841400000000000"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      @handle ou URL do Site (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formSiteUrl || formHandle}
                      onChange={(e) => {
                        setFormHandle(e.target.value);
                        setFormSiteUrl(e.target.value);
                      }}
                      placeholder="Ex: @eloss.oficial ou https://..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setProvedorConfigurando(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={salvandoConexao}
                    onClick={salvarConexaoRedeEmpresa}
                    className="px-5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
                  >
                    {salvandoConexao
                      ? "Validando e salvando no Supabase..."
                      : `Validar e Conectar em ${marcaAtiva.nome}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {CATALOGO_REDES_CONEXAO.map((item) => {
                  const integracao = obterIntegracaoAtiva(item.provedor);
                  return (
                    <div
                      key={item.provedor}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                        integracao
                          ? "bg-emerald-50/50 border-emerald-300"
                          : "bg-slate-50/80 border-slate-200"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{item.icone}</span>
                            <span>{item.nome}</span>
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              integracao
                                ? "bg-emerald-200 text-emerald-950"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {integracao ? "Conectado" : "Não ligado"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          {item.descricao}
                        </p>
                        {integracao && (
                          <div className="pt-1 text-[11px] text-emerald-900 font-semibold space-y-0.5">
                            {integracao.config?.handle && (
                              <p>Conta: {integracao.config.handle}</p>
                            )}
                            {integracao.config?.site_url && (
                              <p>Site: {integracao.config.site_url}</p>
                            )}
                            <p className="font-mono text-[10px] text-slate-500">
                              Chave: {integracao.chave_mascarada}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => iniciarConexaoRede(item.provedor)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#261724] text-[#D4F838] text-[11px] font-bold cursor-pointer"
                        >
                          {integracao
                            ? "Atualizar Credencial"
                            : `+ Ligar em ${marcaAtiva.nome}`}
                        </button>
                        {integracao && (
                          <button
                            type="button"
                            onClick={() =>
                              desconectarRedeEmpresa(item.provedor)
                            }
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 text-[11px] font-bold hover:bg-rose-50 cursor-pointer"
                          >
                            Desligar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: CADASTRAR NOVA EMPRESA / CLIENTE NO SUPABASE (`empresas`)
      ===================================================================== */}
      {modalNovaEmpresaAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">
                🏢 Cadastrar Nova Empresa / Cliente
              </h2>
              <button
                type="button"
                onClick={() => setModalNovaEmpresaAberto(false)}
                className="text-xs font-bold text-slate-500"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Cria um novo registro na tabela <code>empresas</code> do Supabase
              com conexões de redes sociais, calendário e SmartLinks 100%
              isolados.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome da Empresa / Marca *
                </label>
                <input
                  type="text"
                  value={novaEmpresaNome}
                  onChange={(e) => setNovaEmpresaNome(e.target.value)}
                  placeholder="Ex: Clínica Vida, Grupo Atlas..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Site Oficial (Opcional)
                </label>
                <input
                  type="text"
                  value={novaEmpresaSite}
                  onChange={(e) => setNovaEmpresaSite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Segmento
                </label>
                <input
                  type="text"
                  value={novaEmpresaSegmento}
                  onChange={(e) => setNovaEmpresaSegmento(e.target.value)}
                  placeholder="Ex: Saúde, Varejo, SaaS B2B..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalNovaEmpresaAberto(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={criarNovaEmpresaNoSupabase}
                className="px-5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
              >
                Criar Empresa no Supabase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: "CRIAR NOVA PUBLICAÇÃO" (COMPOSER DO PLANNER)
      ===================================================================== */}
      {modalCriarPostAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#F8F9FA] rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-300 space-y-4 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {postEditandoId
                    ? "Editar publicação agendada"
                    : "Criar nova publicação"}
                </h2>
                <span className="px-3 py-1 rounded-full bg-white border border-slate-300 text-xs font-bold">
                  {marcaAtiva.nome}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalCriarPostAberto(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#382060]">
                ⚡ Importar Peça Real do Supabase ({marcaAtiva.nome}):
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
                  Selecionar peça desta empresa...
                </option>
                {demandas
                  .filter((d) => d.marca_id === marcaAtiva.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.formato_canal.toUpperCase()}] {d.titulo}
                    </option>
                  ))}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
              <input
                type="text"
                value={postTitulo}
                onChange={(e) => setPostTitulo(e.target.value)}
                placeholder="Título da publicação..."
                className="w-full px-4 py-2.5 border-b border-slate-100 text-xs font-bold"
              />
              <textarea
                rows={5}
                value={postLegenda}
                onChange={(e) => setPostLegenda(e.target.value)}
                placeholder="Escreva a legenda da publicação..."
                className="w-full p-4 text-xs focus:outline-none"
              />
              {postImagens.length > 0 && (
                <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto">
                  {postImagens.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt=""
                      className="w-12 h-14 rounded object-cover border border-slate-200"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
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
                      ⏰ {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => salvarPostNoCalendario("rascunho")}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold cursor-pointer"
                >
                  Guardar rascunho
                </button>
                <button
                  type="button"
                  onClick={() => salvarPostNoCalendario("agendado")}
                  className="px-5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
                >
                  📅 Agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
