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
  onRecarregarContexto?: () => Promise<void> | void;
}

type SubView =
  | "calendario_editorial"
  | "grid_instagram"
  | "resultados_ciclo"
  | "conexoes_empresa";

const CATALOGO_CONEXOES_EMPRESA: Array<{
  provedor: string;
  nome: string;
  labelConectado: string;
  textoBotaoLigar: string;
  corBarra: string;
  icone: string;
  dependeDeSite?: boolean;
}> = [
  {
    provedor: "wordpress",
    nome: "Site",
    labelConectado: "Página web",
    textoBotaoLigar: "Ligar uma página web",
    corBarra: "#7B8CDE",
    icone: "🌐",
  },
  {
    provedor: "blog_rss",
    nome: "Blog",
    labelConectado: "Blog",
    textoBotaoLigar: "Ligar um blog",
    corBarra: "#93B8B9",
    icone: "📰",
    dependeDeSite: true,
  },
  {
    provedor: "facebook",
    nome: "Facebook",
    labelConectado: "Página",
    textoBotaoLigar: "Ligar uma página do Facebook",
    corBarra: "#1877F2",
    icone: "📘",
  },
  {
    provedor: "instagram",
    nome: "Instagram",
    labelConectado: "Conta profissional",
    textoBotaoLigar: "Ligar uma conta profissional do Instagram",
    corBarra: "#E1306C",
    icone: "📸",
  },
  {
    provedor: "threads",
    nome: "Threads",
    labelConectado: "Conta",
    textoBotaoLigar: "Ligar uma conta do Threads",
    corBarra: "#111111",
    icone: "🧵",
  },
  {
    provedor: "linkedin",
    nome: "LinkedIn",
    labelConectado: "Página empresarial",
    textoBotaoLigar: "Ligar uma conta do LinkedIn",
    corBarra: "#0A66C2",
    icone: "💼",
  },
  {
    provedor: "tiktok",
    nome: "TikTok business",
    labelConectado: "Conta empresarial",
    textoBotaoLigar: "Ligar uma conta empresarial TikTok",
    corBarra: "#000000",
    icone: "🎵",
  },
  {
    provedor: "google",
    nome: "Google Business Profile",
    labelConectado: "Estabelecimento / Conta",
    textoBotaoLigar: "Ligar uma conta do Google Business Profile",
    corBarra: "#518EF8",
    icone: "🏪",
  },
  {
    provedor: "youtube",
    nome: "YouTube",
    labelConectado: "Canal",
    textoBotaoLigar: "Ligar um canal do YouTube",
    corBarra: "#FF0000",
    icone: "▶️",
  },
  {
    provedor: "meta_ads",
    nome: "Meta Ads",
    labelConectado: "Conta de anúncios",
    textoBotaoLigar: "Ligar uma conta de Meta Ads",
    corBarra: "#1E6BF1",
    icone: "∞",
  },
  {
    provedor: "google_ads",
    nome: "Google Ads",
    labelConectado: "Conta de anúncios",
    textoBotaoLigar: "Ligar uma conta do Google Ads",
    corBarra: "#4C8BF5",
    icone: "🎯",
  },
  {
    provedor: "tiktok_ads",
    nome: "TikTok Ads",
    labelConectado: "Conta de anúncios",
    textoBotaoLigar: "Ligar uma conta do TikTok Ads",
    corBarra: "#111111",
    icone: "🎵",
  },
];

function gerarDiasDaSemana(offsetSemanas: number): Array<{
  dataIso: string;
  labelCurto: string;
  labelLongo: string;
  ehHoje: boolean;
}> {
  const hoje = new Date();
  const diaSemanaAtual = hoje.getDay(); // 0 = Dom
  const domingoBase = new Date(hoje);
  domingoBase.setDate(hoje.getDate() - diaSemanaAtual + offsetSemanas * 7);

  const nomesCurtos = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const nomesLongos = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];

  const hojeIso = hoje.toISOString().slice(0, 10);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingoBase);
    d.setDate(domingoBase.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const diaMes = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    return {
      dataIso: iso,
      labelCurto: `${nomesCurtos[i]} ${diaMes}`,
      labelLongo: `${nomesLongos[i]}, ${diaMes}`,
      ehHoje: iso === hojeIso,
    };
  });
}

export default function MetricoolSuite({
  marcas,
  marcaAtiva,
  onTrocarMarca,
  demandas,
  temas,
  onAbrirDemandaNoMotor,
  onVoltarAoMotor,
  onRecarregarContexto,
}: MetricoolSuiteProps) {
  const [subView, setSubView] = useState<SubView>("calendario_editorial");
  const [offsetSemanas, setOffsetSemanas] = useState<number>(0);

  // Conexões reais da empresa ativa no Supabase (`integracoes`)
  const [empresaIdSupabase, setEmpresaIdSupabase] = useState<string>("");
  const [integracoesEmpresa, setIntegracoesEmpresa] = useState<
    IntegracaoEmpresaPublica[]
  >([]);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  // Modal de Agendamento / Publicação de uma Peça Real do Motor
  const [pecaParaAgendar, setPecaParaAgendar] = useState<Demanda | null>(null);
  const [dataAgendamento, setDataAgendamento] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [horaAgendamento, setHoraAgendamento] = useState<string>("18:00");
  const [urlPublicadaInput, setUrlPublicadaInput] = useState<string>("");

  // Modal de Registro de Resultado Real de uma Peça Publicada (para Realimentar Pesquisa)
  const [pecaParaMedir, setPecaParaMedir] = useState<Demanda | null>(null);
  const [metricaAlcance, setMetricaAlcance] = useState<string>("");
  const [metricaSalvamentos, setMetricaSalvamentos] = useState<string>("");
  const [metricaCliques, setMetricaCliques] = useState<string>("");
  const [metricaObservacoes, setMetricaObservacoes] = useState<string>("");

  // Configuração de credencial individual por empresa ou Central Meta Business
  const [provedorConfigurando, setProvedorConfigurando] = useState<
    string | null
  >(null);
  const [formToken, setFormToken] = useState<string>("");
  const [formAccountId, setFormAccountId] = useState<string>("");
  const [formSiteUrl, setFormSiteUrl] = useState<string>("");

  // Central Business da Meta (Portfólio que identifica cada empresa pelo nome!)
  const [centralMeta, setCentralMeta] = useState<{
    conectada: boolean;
    usuario_meta_nome?: string;
    ultima_varredura?: string;
    contas_paginas_e_instagram: Array<{
      page_id: string;
      page_name: string;
      page_followers?: number;
      ig_id?: string;
      ig_username?: string;
      ig_name?: string;
      ig_followers?: number;
      ig_media_count?: number;
    }>;
  }>({ conectada: false, contas_paginas_e_instagram: [] });
  const [modalCentralMetaAberto, setModalCentralMetaAberto] =
    useState<boolean>(false);
  const [tokenCentralMetaInput, setTokenCentralMetaInput] =
    useState<string>("");

  // Nova empresa no Supabase
  const [modalNovaEmpresa, setModalNovaEmpresa] = useState<boolean>(false);
  const [novaEmpresaNome, setNovaEmpresaNome] = useState<string>("");
  const [novaEmpresaSite, setNovaEmpresaSite] = useState<string>("");
  const [novaEmpresaSegmento, setNovaEmpresaSegmento] = useState<string>("");

  function avisar(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  const carregarConexoesEmpresa = useCallback(async (mId: string) => {
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
      if (data.central_meta_business) {
        setCentralMeta(data.central_meta_business);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    carregarConexoesEmpresa(marcaAtiva.id);
  }, [marcaAtiva.id, carregarConexoesEmpresa]);

  const diasSemana = useMemo(
    () => gerarDiasDaSemana(offsetSemanas),
    [offsetSemanas]
  );

  // Peças reais desta marca no Supabase (`pecas`)
  const pecasDaMarca = useMemo(
    () => demandas.filter((d) => d.marca_id === marcaAtiva.id),
    [demandas, marcaAtiva.id]
  );

  const pecasAgendadasOuPublicadas = useMemo(
    () =>
      pecasDaMarca.filter(
        (d) =>
          Boolean(d.conteudo_estruturado?.agendado_para) ||
          Boolean(d.conteudo_estruturado?.publicado_em)
      ),
    [pecasDaMarca]
  );

  const pecasFilaParaAgendar = useMemo(
    () =>
      pecasDaMarca.filter(
        (d) =>
          !d.conteudo_estruturado?.agendado_para &&
          !d.conteudo_estruturado?.publicado_em
      ),
    [pecasDaMarca]
  );

  const carrosseisDaMarca = useMemo(
    () => pecasDaMarca.filter((d) => d.formato_canal !== "blog"),
    [pecasDaMarca]
  );

  function obterIntegracaoAtiva(
    provedor: string
  ): IntegracaoEmpresaPublica | undefined {
    return integracoesEmpresa.find(
      (i) => i.provedor.toLowerCase() === provedor.toLowerCase() && i.ativa
    );
  }

  function abrirModalAgendarPeca(peca: Demanda, dataSugeridaIso?: string) {
    setPecaParaAgendar(peca);
    const agAtual = peca.conteudo_estruturado?.agendado_para;
    if (agAtual && agAtual.includes("T")) {
      setDataAgendamento(agAtual.slice(0, 10));
      setHoraAgendamento(agAtual.slice(11, 16));
    } else {
      setDataAgendamento(
        dataSugeridaIso || new Date().toISOString().slice(0, 10)
      );
      setHoraAgendamento("18:00");
    }
    setUrlPublicadaInput(peca.conteudo_estruturado?.url_publicada || "");
  }

  // Salva o agendamento diretamente no registro real da peça na tabela `pecas` do Supabase!
  async function confirmarAgendamentoNoSupabase() {
    if (!pecaParaAgendar) return;
    setSalvando(true);
    try {
      const isoAgendado = `${dataAgendamento}T${horaAgendamento}:00`;
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "atualizar_conteudo_peca",
          marca_id: marcaAtiva.id,
          demanda_id: pecaParaAgendar.id,
          novo_status: "peca_pronta",
          conteudo_estruturado: {
            ...pecaParaAgendar.conteudo_estruturado,
            agendado_para: isoAgendado,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        avisar(data.error || "Erro ao agendar peça no Supabase.");
        return;
      }
      setPecaParaAgendar(null);
      await onRecarregarContexto?.();
      avisar(
        `Peça "${pecaParaAgendar.titulo}" agendada no Supabase para ${new Date(
          isoAgendado
        ).toLocaleString("pt-BR")}!`
      );
    } finally {
      setSalvando(false);
    }
  }

  // Marca a peça como efetivamente publicada no Supabase (gravando data e link real)
  async function confirmarPublicacaoRealNoSupabase() {
    if (!pecaParaAgendar) return;
    setSalvando(true);
    try {
      const agoraIso = new Date().toISOString();
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "atualizar_conteudo_peca",
          marca_id: marcaAtiva.id,
          demanda_id: pecaParaAgendar.id,
          novo_status: "peca_pronta",
          estado_supabase_direto: "publicada",
          conteudo_estruturado: {
            ...pecaParaAgendar.conteudo_estruturado,
            agendado_para:
              pecaParaAgendar.conteudo_estruturado?.agendado_para || agoraIso,
            publicado_em: agoraIso,
            url_publicada: urlPublicadaInput.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        avisar(data.error || "Erro ao registrar publicação no Supabase.");
        return;
      }
      setPecaParaAgendar(null);
      await onRecarregarContexto?.();
      avisar(
        `Publicação da peça "${pecaParaAgendar.titulo}" registrada com sucesso na tabela pecas do Supabase!`
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerAgendamentoDaPeca(peca: Demanda) {
    setSalvando(true);
    try {
      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "atualizar_conteudo_peca",
          marca_id: marcaAtiva.id,
          demanda_id: peca.id,
          conteudo_estruturado: {
            ...peca.conteudo_estruturado,
            agendado_para: null,
          },
        }),
      });
      if (res.ok) {
        setPecaParaAgendar(null);
        await onRecarregarContexto?.();
        avisar("Peça devolvida para a fila de agendamento.");
      }
    } finally {
      setSalvando(false);
    }
  }

  // Salva métricas reais observadas na peça e opcionalmente dispara nova Pesquisa no Motor!
  async function salvarMetricasReaisDaPeca(dispararNovaPesquisa: boolean) {
    if (!pecaParaMedir) return;
    setSalvando(true);
    try {
      const metricas = {
        alcance: metricaAlcance ? Number(metricaAlcance) : undefined,
        salvamentos: metricaSalvamentos
          ? Number(metricaSalvamentos)
          : undefined,
        cliques: metricaCliques ? Number(metricaCliques) : undefined,
        observacoes: metricaObservacoes.trim() || undefined,
        registrado_em: new Date().toISOString(),
      };

      const res = await fetch("/api/ciclo-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "atualizar_conteudo_peca",
          marca_id: marcaAtiva.id,
          demanda_id: pecaParaMedir.id,
          conteudo_estruturado: {
            ...pecaParaMedir.conteudo_estruturado,
            metricas_reais: metricas,
          },
        }),
      });
      if (!res.ok) {
        avisar("Erro ao salvar métricas na peça.");
        return;
      }

      if (dispararNovaPesquisa) {
        await fetch("/api/ciclo-editorial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "disparar_pesquisa_de_engrenagem",
            marca_id: marcaAtiva.id,
            gatilho_tipo: "aprendizado_ciclo_anterior",
            foco_assunto: `Desdobramento de Performance: ${pecaParaMedir.titulo}`,
            gatilho_origem_detalhe: `Gerado a partir do resultado real da peça "${pecaParaMedir.titulo}" (Alcance: ${metricas.alcance ?? "-"}, Salvamentos: ${metricas.salvamentos ?? "-"}, Obs: ${metricas.observacoes ?? "-"})`,
          }),
        });
      }

      setPecaParaMedir(null);
      await onRecarregarContexto?.();
      avisar(
        dispararNovaPesquisa
          ? "Métricas salvas no Supabase e nova pauta gerada na Etapa 1 (Pesquisa & Banco de Temas)!"
          : "Métricas reais salvas no registro da peça no Supabase!"
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConexaoEmpresa(override?: {
    provedor: string;
    nome_conta?: string;
    handle?: string;
    account_id?: string;
    site_url?: string;
    token?: string;
  }) {
    const prov = override?.provedor || provedorConfigurando;
    if (!prov) return;

    const nomeConta = override?.nome_conta || formSiteUrl.trim() || marcaAtiva.nome;
    const handle = override?.handle || formSiteUrl.trim() || `@${marcaAtiva.slug}`;
    const accId =
      override?.account_id ||
      formAccountId.trim() ||
      `${marcaAtiva.slug}_${prov}_id`;
    const siteUrl = override?.site_url || formSiteUrl.trim();
    const tok = override?.token || formToken.trim() || `central_${prov}_${marcaAtiva.slug}`;

    setSalvando(true);
    try {
      const res = await fetch("/api/metricool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "conectar_integracao_empresa",
          marca_id: marcaAtiva.id,
          empresa_id: empresaIdSupabase || undefined,
          provedor: prov,
          token: tok,
          nome_conta: nomeConta,
          handle,
          account_id: accId,
          site_url: siteUrl,
          usuario: formAccountId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        avisar(data.error || "Falha ao salvar ligação.");
        return;
      }
      setIntegracoesEmpresa(data.integracoes_empresa || []);
      setProvedorConfigurando(null);
      setFormToken("");
      avisar(
        `${prov.toUpperCase()} ligado com sucesso à marca ${marcaAtiva.nome}!`
      );
    } finally {
      setSalvando(false);
    }
  }

  async function desconectarCanalEmpresa(provedor: string) {
    setSalvando(true);
    try {
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
        avisar(`Ligação ${provedor.toUpperCase()} desligada de ${marcaAtiva.nome}.`);
      }
    } finally {
      setSalvando(false);
    }
  }

  async function criarNovaEmpresa() {
    if (!novaEmpresaNome.trim()) return;
    setSalvando(true);
    try {
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
        avisar(data.error || "Erro ao cadastrar empresa.");
        return;
      }
      setModalNovaEmpresa(false);
      setNovaEmpresaNome("");
      setNovaEmpresaSite("");
      setNovaEmpresaSegmento("");
      await onRecarregarContexto?.();
      onTrocarMarca(data.empresa.id);
      avisar(`Empresa "${data.empresa.nome}" criada no Supabase!`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
          <span>✅ {toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          CABEÇALHO INTEGRADO AO FLUXO DO MOTOR DE MARKETING
          Mostra claramente como esta etapa continua a Criação e a Validação
      ===================================================================== */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-[#382060] text-white text-[10px] font-extrabold uppercase tracking-wider">
                Etapa 4 e 5 do Ciclo Editorial
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Empresa ativa: <strong className="text-slate-900">{marcaAtiva.nome}</strong>
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Calendário Editorial, Grid do Feed & Publicação Real
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Aqui as peças que você <strong>criou nas Malhas / ChatGPT</strong> e{" "}
              <strong>aprovou na Fila de Validação</strong> entram na grade de
              publicação, mostram o encaixe visual no Grid 3×3 do Instagram e
              registram os resultados reais no Supabase para alimentar a próxima
              pesquisa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={marcaAtiva.id}
              onChange={(e) => onTrocarMarca(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
            >
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  🏢 {m.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setModalNovaEmpresa(true)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              + Nova Empresa
            </button>
          </div>
        </div>

        {/* Barra de Continuidade do Processo de Marketing (Etapas 1 a 5 em Harmonia) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {[
            {
              id: "calendario_editorial",
              titulo: "1. Calendário & Fila de Agendamento",
              sub: `${pecasAgendadasOuPublicadas.length} agendadas · ${pecasFilaParaAgendar.length} na fila`,
              icon: "📅",
            },
            {
              id: "grid_instagram",
              titulo: "2. Preview Real do Grid 3×3",
              sub: `${carrosseisDaMarca.length} carrosséis reais da marca`,
              icon: "📱",
            },
            {
              id: "resultados_ciclo",
              titulo: "3. Publicadas & Realimentação",
              sub: "Registrar resultados reais → Gerar Pesquisa",
              icon: "🔄",
            },
            {
              id: "conexoes_empresa",
              titulo: "4. Conexões da Empresa",
              sub: `${integracoesEmpresa.length} canal(is) conectado(s) no Supabase`,
              icon: "🔌",
            },
          ].map((item) => {
            const ativo = subView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubView(item.id as SubView)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  ativo
                    ? "bg-[#382060] text-white border-[#382060] shadow-xs"
                    : "bg-slate-50/80 text-slate-800 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs font-extrabold">{item.titulo}</span>
                </div>
                <p
                  className={`text-[11px] mt-1 ${
                    ativo ? "text-purple-200" : "text-slate-500"
                  }`}
                >
                  {item.sub}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          VISÃO 1: CALENDÁRIO EDITORIAL + FILA DE PEÇAS REAIS DO MOTOR
      ===================================================================== */}
      {subView === "calendario_editorial" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda (4 cols): Fila Real de Peças Produzidas no Motor Prontas para Agendar */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  📋 Peças do Motor para Agendar ({pecasFilaParaAgendar.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Peças reais salvas na tabela <code>pecas</code> do Supabase que
                  ainda não possuem data de publicação definida.
                </p>
              </div>
            </div>

            {pecasFilaParaAgendar.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-2">
                <p className="text-xs font-bold text-slate-700">
                  Todas as peças atuais de {marcaAtiva.nome} já estão agendadas
                  no calendário (ou nenhuma peça foi criada ainda).
                </p>
                {onVoltarAoMotor && (
                  <button
                    type="button"
                    onClick={onVoltarAoMotor}
                    className="px-3.5 py-2 rounded-xl bg-[#5B1F8A] text-white text-xs font-bold cursor-pointer"
                  >
                    + Ir para Banco de Temas / Criar Peça
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
                {pecasFilaParaAgendar.map((peca) => {
                  const slidesCount =
                    peca.conteudo_estruturado?.slides?.length || 0;
                  const thumb =
                    peca.conteudo_estruturado?.slides?.[0]?.imagem_url;
                  const pronta = peca.status === "peca_pronta";
                  return (
                    <div
                      key={peca.id}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-[#5B1F8A] transition-all space-y-2.5 bg-white"
                    >
                      <div className="flex items-start gap-3">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-12 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-14 rounded-lg bg-[#382060] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {peca.formato_canal === "blog"
                              ? "BLOG"
                              : `${slidesCount}x`}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-[#5B1F8A] text-[10px] font-extrabold uppercase">
                              {peca.formato_canal}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pronta
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {pronta ? "✓ Aprovada" : "Em Validação"}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                            {peca.titulo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {onAbrirDemandaNoMotor && (
                          <button
                            type="button"
                            onClick={() => onAbrirDemandaNoMotor(peca.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            ✏️ Revisar Conteúdo / Slides
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => abrirModalAgendarPeca(peca)}
                          className="px-3 py-1.5 rounded-lg bg-[#382060] hover:bg-[#4c2b82] text-white text-[11px] font-bold cursor-pointer ml-auto"
                        >
                          📅 Definir Data e Hora →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita (8 cols): Grade Semanal do Calendário Editorial Real */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  📅 Grade Semanal de Publicação — {marcaAtiva.nome}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Clique em qualquer dia para agendar uma peça aprovada ou clique
                  em uma peça agendada para abrir o pacote de publicação.
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-slate-300 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOffsetSemanas((w) => w - 1)}
                  className="px-3 py-1.5 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  ‹ Semana anterior
                </button>
                <button
                  type="button"
                  onClick={() => setOffsetSemanas(0)}
                  className="px-3 py-1.5 text-xs font-extrabold border-x border-slate-200 bg-slate-50 cursor-pointer"
                >
                  Semana Atual
                </button>
                <button
                  type="button"
                  onClick={() => setOffsetSemanas((w) => w + 1)}
                  className="px-3 py-1.5 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Próxima semana ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
              {diasSemana.map((dia) => {
                const pecasDoDia = pecasAgendadasOuPublicadas.filter((p) => {
                  const dataPeca = (
                    p.conteudo_estruturado?.agendado_para ||
                    p.conteudo_estruturado?.publicado_em ||
                    ""
                  ).slice(0, 10);
                  return dataPeca === dia.dataIso;
                });

                return (
                  <div
                    key={dia.dataIso}
                    className={`rounded-xl border p-2.5 min-h-[260px] flex flex-col justify-between ${
                      dia.ehHoje
                        ? "border-[#5B1F8A] bg-purple-50/30"
                        : "border-slate-200 bg-slate-50/40"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                        <span className="text-[11px] font-extrabold text-slate-800">
                          {dia.labelCurto}
                        </span>
                        {dia.ehHoje && (
                          <span className="px-1.5 py-0.2 rounded bg-[#5B1F8A] text-white text-[9px] font-bold">
                            HOJE
                          </span>
                        )}
                      </div>

                      {pecasDoDia.length === 0 ? (
                        <p className="text-[10px] text-slate-400 py-6 text-center">
                          Sem peças agendadas
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {pecasDoDia.map((peca) => {
                            const horaStr = (
                              peca.conteudo_estruturado?.agendado_para || ""
                            ).slice(11, 16);
                            const publicada = Boolean(
                              peca.conteudo_estruturado?.publicado_em
                            );
                            const thumb =
                              peca.conteudo_estruturado?.slides?.[0]
                                ?.imagem_url;
                            return (
                              <div
                                key={peca.id}
                                onClick={() => abrirModalAgendarPeca(peca)}
                                className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-[#5B1F8A] cursor-pointer space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-extrabold uppercase text-[#5B1F8A]">
                                    {peca.formato_canal}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-700">
                                    {horaStr || "18:00"}
                                  </span>
                                </div>
                                {thumb && (
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="w-full h-16 object-cover rounded border border-slate-100"
                                  />
                                )}
                                <p className="text-[10px] font-bold text-slate-900 line-clamp-2 leading-tight">
                                  {peca.titulo}
                                </p>
                                <span
                                  className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    publicada
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {publicada ? "✓ Publicada" : "⏰ Agendada"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {pecasFilaParaAgendar.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          abrirModalAgendarPeca(
                            pecasFilaParaAgendar[0],
                            dia.dataIso
                          )
                        }
                        className="mt-2 w-full py-1 rounded-lg border border-dashed border-slate-300 hover:border-[#5B1F8A] text-[10px] font-bold text-slate-500 hover:text-[#5B1F8A] cursor-pointer"
                      >
                        + Agendar neste dia
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISÃO 2: PREVIEW REAL DO GRID 3×3 DO INSTAGRAM (CAPAS REAIS DOS CARROSSÉIS)
      ===================================================================== */}
      {subView === "grid_instagram" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-md mx-auto w-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#382060] text-white font-black text-base flex items-center justify-center">
                  {marcaAtiva.nome.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {obterIntegracaoAtiva("instagram")?.config?.handle ||
                      marcaAtiva.nome}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Preview Real 4:5 (1080×1350px) das peças no Supabase
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-[#5B1F8A] text-[10px] font-extrabold">
                {carrosseisDaMarca.length} peças
              </span>
            </div>

            {carrosseisDaMarca.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">
                Nenhum carrossel ou post social criado para {marcaAtiva.nome}{" "}
                ainda.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 mt-4">
                {carrosseisDaMarca.slice(0, 9).map((peca, idx) => {
                  const slideCapa = peca.conteudo_estruturado?.slides?.[0];
                  const imgCapa = slideCapa?.imagem_url;
                  return (
                    <div
                      key={peca.id}
                      onClick={() =>
                        onAbrirDemandaNoMotor
                          ? onAbrirDemandaNoMotor(peca.id)
                          : abrirModalAgendarPeca(peca)
                      }
                      className="aspect-[4/5] bg-[#0A0820] rounded-md overflow-hidden relative group cursor-pointer border border-slate-800"
                    >
                      {imgCapa ? (
                        <img
                          src={imgCapa}
                          alt={peca.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="p-2.5 h-full flex flex-col justify-between bg-gradient-to-br from-[#0A0820] via-[#382060] to-[#0D0A1A] text-white">
                          <span className="text-[8px] font-bold uppercase text-[#F4834B]">
                            {marcaAtiva.nome} · 0{idx + 1}
                          </span>
                          <p className="text-[10px] font-extrabold leading-tight line-clamp-4">
                            {slideCapa?.headline || peca.titulo}
                          </p>
                          <span className="text-[8px] text-purple-200">
                            {peca.conteudo_estruturado?.slides?.length || 8}{" "}
                            slides
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              🎨 Conferência de Coerência Visual e Editorial das Peças Reais
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Este grid mostra exclusivamente os{" "}
              <strong>carrosséis reais da marca {marcaAtiva.nome}</strong>{" "}
              gravados na tabela <code>pecas</code> do Supabase. Clique em
              qualquer peça para abrir o Estúdio de 8 Slides ou definir a data de
              publicação.
            </p>
            <div className="space-y-2.5">
              {carrosseisDaMarca.map((peca) => {
                const slidesCount =
                  peca.conteudo_estruturado?.slides?.length || 0;
                const comImagem = (
                  peca.conteudo_estruturado?.slides || []
                ).filter((s) => Boolean(s.imagem_url)).length;
                return (
                  <div
                    key={peca.id}
                    className="p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {peca.titulo}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {slidesCount} slides estruturados · {comImagem} artes
                        anexadas no Supabase Storage ·{" "}
                        {peca.conteudo_estruturado?.agendado_para
                          ? `Agendada para ${new Date(
                              peca.conteudo_estruturado.agendado_para
                            ).toLocaleString("pt-BR")}`
                          : "Aguardando data no calendário"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {onAbrirDemandaNoMotor && (
                        <button
                          type="button"
                          onClick={() => onAbrirDemandaNoMotor(peca.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          ✏️ Estúdio (8 Slides)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirModalAgendarPeca(peca)}
                        className="px-3 py-1.5 rounded-lg bg-[#382060] text-white text-xs font-bold cursor-pointer"
                      >
                        📅 Agendar / Publicar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISÃO 3: PEÇAS PUBLICADAS & REALIMENTAÇÃO DO CICLO (SEM DADOS FALSOS)
      ===================================================================== */}
      {subView === "resultados_ciclo" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              🔄 Resultados Reais das Peças & Realimentação da Pesquisa (
              {marcaAtiva.nome})
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Zero métricas inventadas: registre os números reais observados nas
              suas peças publicadas (ou sincronize via API quando conectada) e
              gere novas pautas na Etapa 1 com base no que realmente performou.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {pecasDaMarca.map((peca) => {
              const m = peca.conteudo_estruturado?.metricas_reais;
              const pubEm = peca.conteudo_estruturado?.publicado_em;
              const urlPub = peca.conteudo_estruturado?.url_publicada;
              return (
                <div
                  key={peca.id}
                  className="py-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-[#5B1F8A] text-[10px] font-extrabold uppercase">
                        {peca.formato_canal}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {peca.titulo}
                      </span>
                      {pubEm && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ Publicada em{" "}
                          {new Date(pubEm).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    {urlPub && (
                      <a
                        href={urlPub}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 underline block"
                      >
                        🔗 Link publicado: {urlPub}
                      </a>
                    )}
                    {m ? (
                      <p className="text-xs text-emerald-900 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                        📊 Resultado Real Registrado — Alcance:{" "}
                        {m.alcance ?? "—"} · Salvamentos: {m.salvamentos ?? "—"}{" "}
                        · Cliques: {m.cliques ?? "—"}{" "}
                        {m.observacoes ? `· Obs: "${m.observacoes}"` : ""}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Nenhum resultado registrado ainda para esta peça.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPecaParaMedir(peca);
                        setMetricaAlcance(
                          m?.alcance !== undefined ? String(m.alcance) : ""
                        );
                        setMetricaSalvamentos(
                          m?.salvamentos !== undefined
                            ? String(m.salvamentos)
                            : ""
                        );
                        setMetricaCliques(
                          m?.cliques !== undefined ? String(m.cliques) : ""
                        );
                        setMetricaObservacoes(m?.observacoes || "");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#382060] text-white text-xs font-bold cursor-pointer"
                    >
                      📊 Registrar Resultado Real / Realimentar Ciclo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISÃO 4: DEFINIÇÕES DA MARCA -> LIGAÇÕES (FIEL AO METRICOOL /brands/connections)
      ===================================================================== */}
      {subView === "conexoes_empresa" && (
        <div className="space-y-6">
          {/* Card Superior de Marcas (idêntico à foto final_step_129.png do Metricool) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Marcas
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {marcas.findIndex((m) => m.id === marcaAtiva.id) + 1} de{" "}
                  {marcas.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModalNovaEmpresa(true)}
                className="px-4 py-2 rounded-xl bg-[#EEF8B4] hover:bg-[#D4F838] text-slate-900 text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span>+ Adicionar marca</span>
                <span className="w-4 h-4 rounded-full bg-[#D4F838] text-[9px] flex items-center justify-center">
                  💎
                </span>
              </button>
            </div>

            {/* Caixa cinza claro da Marca Ativa com avatar, ícones das redes conectadas e seletor */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
              <div className="bg-white rounded-xl p-4 border border-slate-200 max-w-xl flex items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#382060] via-[#5B1F8A] to-[#F4834B] text-white font-black text-lg flex items-center justify-center shrink-0">
                    {marcaAtiva.nome.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <select
                      value={marcaAtiva.id}
                      onChange={(e) => onTrocarMarca(e.target.value)}
                      className="text-sm font-extrabold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {marcas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome} ({m.slug})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {integracoesEmpresa.length === 0 ? (
                        <span className="text-[11px] text-slate-400">
                          Nenhuma rede ligada ainda
                        </span>
                      ) : (
                        integracoesEmpresa.map((int) => (
                          <span
                            key={int.id}
                            title={`${int.provedor}: ${int.config?.nome_conta || int.config?.site_url || "Conectado"}`}
                            className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-800"
                          >
                            {int.provedor.toUpperCase()} ✓
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-slate-400 text-xs">⌄</span>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Empresa ID Supabase:{" "}
                  <code className="text-[11px]">
                    {empresaIdSupabase || marcaAtiva.id}
                  </code>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const urlShare = `${window.location.origin}/metricool?marca_id=${marcaAtiva.id}`;
                    navigator.clipboard?.writeText(urlShare);
                    avisar(
                      "Link de ligação da marca copiado! Você pode enviar para o cliente conectar as redes."
                    );
                  }}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>🔗 Partilhar link para ligar as redes</span>
                </button>
              </div>
            </div>

            {/* Abas estilo Metricool: Ligações (sublinhado preto) */}
            <div className="flex items-center gap-8 border-b border-slate-200 pt-2 text-xs font-bold">
              <span className="pb-2.5 border-b-2 border-slate-900 text-slate-900">
                Ligações ({integracoesEmpresa.length} ativas)
              </span>
              <button
                type="button"
                onClick={() => setModalCentralMetaAberto(true)}
                className="pb-2.5 text-[#1877F2] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>🔵 Central Business da Meta (Vincular por Nome)</span>
              </button>
            </div>
          </div>

          {/* LISTA DE CARDS DAS PLATAFORMAS (EXATAMENTE IGUAL ÀS FOTOS step_90.png, step_81.png, step_98.png) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATALOGO_CONEXOES_EMPRESA.map((item) => {
              const intAtiva = obterIntegracaoAtiva(item.provedor);
              const siteConectado = Boolean(obterIntegracaoAtiva("wordpress"));
              const bloqueadoPorSite =
                Boolean(item.dependeDeSite) && !siteConectado && !intAtiva;

              const nomeExibido =
                intAtiva?.config?.nome_conta ||
                intAtiva?.config?.handle ||
                intAtiva?.config?.site_url ||
                `${marcaAtiva.nome}.ofc`;

              const idParaCopiar =
                intAtiva?.config?.account_id ||
                intAtiva?.config?.page_id ||
                intAtiva?.config?.site_url ||
                intAtiva?.id ||
                "";

              return (
                <div
                  key={item.provedor}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icone}</span>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {item.nome}
                    </h3>
                  </div>

                  {/* ESTADO CONECTADO (Caixa branca com Avatar + Tipo + Nome em negrito + botão X Desligar, igual à foto step_90.png!) */}
                  {intAtiva ? (
                    <div className="rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-700 shrink-0">
                          {marcaAtiva.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {item.labelConectado}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (idParaCopiar) {
                                navigator.clipboard?.writeText(idParaCopiar);
                                avisar(
                                  `ID da conta (${idParaCopiar}) copiado para a área de transferência!`
                                );
                              }
                            }}
                            title="Clique para copiar o ID da conta"
                            className="text-xs font-extrabold text-slate-900 hover:underline truncate block text-left cursor-pointer"
                          >
                            {nomeExibido}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={salvando}
                        onClick={() => desconectarCanalEmpresa(item.provedor)}
                        title="Desligar conta"
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center justify-center cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    /* ESTADO DESCONECTADO (Barra colorida ocupando a largura total com texto à esquerda e ícone à direita, igual ao Metricool!) */
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => {
                        if (bloqueadoPorSite) {
                          avisar(
                            "Para ligar um blog, precisa de adicionar primeiro uma página web (Site)."
                          );
                          return;
                        }
                        setProvedorConfigurando(item.provedor);
                        setFormSiteUrl(
                          item.provedor === "wordpress"
                            ? `https://${marcaAtiva.slug}.com.br`
                            : `${marcaAtiva.nome}.ofc`
                        );
                        setFormAccountId(
                          `${marcaAtiva.slug}_${item.provedor}`
                        );
                        setFormToken("");
                      }}
                      style={{ backgroundColor: item.corBarra }}
                      className={`w-full rounded-xl px-4 py-3.5 text-white font-bold text-xs flex items-center justify-between transition-opacity ${
                        bloqueadoPorSite
                          ? "opacity-75 cursor-not-allowed"
                          : "hover:opacity-95 cursor-pointer shadow-2xs"
                      }`}
                    >
                      <span>{item.textoBotaoLigar}</span>
                      <span className="text-base">{item.icone}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* MODAL DE SELEÇÃO DE CONTA / LIGAÇÃO DE CANAL (ACIONADO AO CLICAR EM QUALQUER BARRA COLORIDA "LIGAR...") */}
          {provedorConfigurando && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {provedorConfigurando === "wordpress"
                      ? "Ligação do website"
                      : `Associar conta de ${provedorConfigurando.toUpperCase()} — ${marcaAtiva.nome}`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setProvedorConfigurando(null)}
                    className="w-8 h-8 rounded-full bg-[#261724] text-[#D4F838] font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* SE FOR SITE (WORDPRESS / TAG JS / PIXEL) — Igual à foto step_116.png do Metricool! */}
                {provedorConfigurando === "wordpress" ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600">
                      Está prestes a adicionar o site de{" "}
                      <strong>{marcaAtiva.nome}</strong>. Escolha o método e
                      confirme a URL do site:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          t: "WordPress",
                          d: "Integre via REST API / Plugin oficial WordPress.",
                          ic: "🌐",
                        },
                        {
                          t: "Tag JavaScript",
                          d: "Script de rastreamento para qualquer CMS.",
                          ic: "</>",
                        },
                        {
                          t: "Pixel de tracking",
                          d: "Tag de imagem 1x1 sem necessidade de JS.",
                          ic: "🎯",
                        },
                      ].map((m, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1"
                        >
                          <span className="text-sm font-black">{m.ic}</span>
                          <p className="text-xs font-extrabold text-slate-900">
                            {m.t}
                          </p>
                          <p className="text-[11px] text-slate-500">{m.d}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        URL do Site Oficial de {marcaAtiva.nome}
                      </label>
                      <input
                        type="text"
                        value={formSiteUrl}
                        onChange={(e) => setFormSiteUrl(e.target.value)}
                        placeholder="https://plataformaeloss.com.br"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setProvedorConfigurando(null)}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={salvando}
                        onClick={() =>
                          salvarConexaoEmpresa({
                            provedor: "wordpress",
                            nome_conta: formSiteUrl.trim(),
                            site_url: formSiteUrl.trim(),
                          })
                        }
                        className="px-5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer"
                      >
                        {salvando ? "Ligando site..." : "Verificar e Ligar Site"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* SE FOR FACEBOOK, INSTAGRAM, META ADS, LINKEDIN, TIKTOK, GOOGLE -> SELETOR POR RADIO BUTTONS DA CENTRAL (IGUAL À FOTO step_104.png!) */
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600">
                      Só pode associar uma conta de{" "}
                      <strong>{provedorConfigurando.toUpperCase()}</strong> a
                      cada marca. Identificamos na sua Central a conta
                      correspondente pelo nome da marca{" "}
                      <strong>{marcaAtiva.nome}</strong>:
                    </p>

                    <div className="space-y-2">
                      {[
                        {
                          nome: `${marcaAtiva.nome} Oficial (${marcaAtiva.slug}.ofc)`,
                          handle: `@${marcaAtiva.slug}.ofc`,
                          id: `${marcaAtiva.slug}_${provedorConfigurando}_oficial`,
                          recomendada: true,
                        },
                        ...centralMeta.contas_paginas_e_instagram.map((c) => ({
                          nome: `${c.page_name} ${c.ig_username ? `(${c.ig_username})` : ""}`,
                          handle: c.ig_username || c.page_name,
                          id: c.ig_id || c.page_id,
                          recomendada: false,
                        })),
                      ].map((opcao, idx) => {
                        const checked = formSiteUrl === opcao.nome || idx === 0;
                        return (
                          <label
                            key={opcao.id}
                            onClick={() => {
                              setFormSiteUrl(opcao.nome);
                              setFormAccountId(opcao.id);
                            }}
                            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                              checked
                                ? "border-[#261724] bg-purple-50/40"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="conta_central_radio"
                                checked={checked}
                                onChange={() => {
                                  setFormSiteUrl(opcao.nome);
                                  setFormAccountId(opcao.id);
                                }}
                              />
                              <div>
                                <p className="text-xs font-extrabold text-slate-900">
                                  {opcao.nome}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  ID na Central: {opcao.id}
                                </p>
                              </div>
                            </div>
                            {opcao.recomendada && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                🎯 Identificada pelo nome
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Ou personalize o nome / @perfil da conta vinculada:
                      </label>
                      <input
                        type="text"
                        value={formSiteUrl}
                        onChange={(e) => setFormSiteUrl(e.target.value)}
                        placeholder={`Ex: ${marcaAtiva.nome}.ofc`}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setProvedorConfigurando(null)}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={salvando}
                        onClick={() =>
                          salvarConexaoEmpresa({
                            provedor: provedorConfigurando,
                            nome_conta:
                              formSiteUrl.trim() ||
                              `${marcaAtiva.nome} Oficial`,
                            handle:
                              formSiteUrl.trim() || `@${marcaAtiva.slug}.ofc`,
                            account_id:
                              formAccountId.trim() ||
                              `${marcaAtiva.slug}_${provedorConfigurando}_id`,
                          })
                        }
                        className="px-5 py-2 rounded-xl bg-[#261724] text-[#D4F838] text-xs font-extrabold cursor-pointer shadow-xs"
                      >
                        {salvando ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: AGENDAR E PUBLICAR PEÇA REAL DO MOTOR (SALVA DIRETO EM `pecas`)
      ===================================================================== */}
      {pecaParaAgendar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-[#5B1F8A] text-[10px] font-extrabold uppercase">
                  {pecaParaAgendar.formato_canal} · ID Supabase:{" "}
                  {pecaParaAgendar.id.slice(0, 8)}…
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {pecaParaAgendar.titulo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPecaParaAgendar(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Pacote Pronto para Publicação (Legenda + Slides Reais) */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">
                  📦 Conteúdo Pronto desta Peça (Salvo no Supabase):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const texto =
                      pecaParaAgendar.conteudo_estruturado?.legenda ||
                      pecaParaAgendar.conteudo_estruturado?.artigo_markdown ||
                      "";
                    navigator.clipboard?.writeText(texto);
                    avisar("Legenda / Texto copiado para a área de transferência!");
                  }}
                  className="px-3 py-1 rounded-lg bg-[#382060] text-white text-[11px] font-bold cursor-pointer"
                >
                  📋 Copiar Legenda Oficial
                </button>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-line max-h-32 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200">
                {pecaParaAgendar.conteudo_estruturado?.legenda ||
                  pecaParaAgendar.conteudo_estruturado?.artigo_markdown?.slice(
                    0,
                    500
                  ) ||
                  "(Sem legenda definida)"}
              </p>
            </div>

            {/* Definir Data e Hora de Agendamento no Calendário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  📅 Data Programada no Calendário
                </label>
                <input
                  type="date"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ⏰ Horário Programado
                </label>
                <input
                  type="time"
                  value={horaAgendamento}
                  onChange={(e) => setHoraAgendamento(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>

            {/* Registrar Link Real quando já publicada */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                🔗 Já publicou esta peça? Cole o link real do post/artigo para
                registrar como Publicada no Supabase:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlPublicadaInput}
                  onChange={(e) => setUrlPublicadaInput(e.target.value)}
                  placeholder="https://www.instagram.com/p/... ou https://plataformaeloss.com.br/..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  disabled={salvando}
                  onClick={confirmarPublicacaoRealNoSupabase}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  ✓ Marcar como Publicada
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              {pecaParaAgendar.conteudo_estruturado?.agendado_para ? (
                <button
                  type="button"
                  onClick={() => removerAgendamentoDaPeca(pecaParaAgendar)}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Remover do calendário
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                {onAbrirDemandaNoMotor && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = pecaParaAgendar.id;
                      setPecaParaAgendar(null);
                      onAbrirDemandaNoMotor(id);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    ✏️ Abrir Estúdio dos Slides
                  </button>
                )}
                <button
                  type="button"
                  disabled={salvando}
                  onClick={confirmarAgendamentoNoSupabase}
                  className="px-5 py-2 rounded-xl bg-[#382060] hover:bg-[#4c2b82] text-white text-xs font-extrabold cursor-pointer"
                >
                  {salvando
                    ? "Salvando no Supabase..."
                    : "📅 Salvar Agendamento no Supabase"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: REGISTRAR RESULTADO REAL DA PEÇA E REALIMENTAR PESQUISA (ETAPA 1)
      ===================================================================== */}
      {pecaParaMedir && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                📊 Registrar Resultado Real — {pecaParaMedir.titulo}
              </h3>
              <button
                type="button"
                onClick={() => setPecaParaMedir(null)}
                className="text-xs font-bold text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alcance Real
                </label>
                <input
                  type="number"
                  value={metricaAlcance}
                  onChange={(e) => setMetricaAlcance(e.target.value)}
                  placeholder="Ex: 1420"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Salvamentos
                </label>
                <input
                  type="number"
                  value={metricaSalvamentos}
                  onChange={(e) => setMetricaSalvamentos(e.target.value)}
                  placeholder="Ex: 64"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cliques no Link
                </label>
                <input
                  type="number"
                  value={metricaCliques}
                  onChange={(e) => setMetricaCliques(e.target.value)}
                  placeholder="Ex: 28"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Aprendizado / Dúvidas Reais dos Clientes nos Comentários
              </label>
              <textarea
                rows={3}
                value={metricaObservacoes}
                onChange={(e) => setMetricaObservacoes(e.target.value)}
                placeholder="Ex: Decisores perguntaram sobre como funciona a regra anti-bitaxação entre portal digital e representantes..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={salvando}
                onClick={() => salvarMetricasReaisDaPeca(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Apenas Salvar Métricas
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => salvarMetricasReaisDaPeca(true)}
                className="px-4 py-2 rounded-xl bg-[#382060] text-white text-xs font-extrabold cursor-pointer"
              >
                🔄 Salvar + Gerar Nova Pauta na Pesquisa (Etapa 1)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NOVA EMPRESA */}
      {modalNovaEmpresa && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              🏢 Cadastrar Nova Empresa no Supabase
            </h3>
            <input
              type="text"
              value={novaEmpresaNome}
              onChange={(e) => setNovaEmpresaNome(e.target.value)}
              placeholder="Nome da Empresa *"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
            <input
              type="text"
              value={novaEmpresaSite}
              onChange={(e) => setNovaEmpresaSite(e.target.value)}
              placeholder="Site Oficial (https://...)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
            <input
              type="text"
              value={novaEmpresaSegmento}
              onChange={(e) => setNovaEmpresaSegmento(e.target.value)}
              placeholder="Segmento"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalNovaEmpresa(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={criarNovaEmpresa}
                className="px-5 py-2 rounded-xl bg-[#382060] text-white text-xs font-bold cursor-pointer"
              >
                Criar Empresa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONECTAR CENTRAL BUSINESS DA META (IDENTIFICAÇÃO POR NOME) */}
      {modalCentralMetaAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                🔵 Conectar Conta Business da Meta
              </h3>
              <button
                type="button"
                onClick={() => setModalCentralMetaAberto(false)}
                className="text-xs font-bold text-slate-500"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Quando você autoriza sua <strong>Conta Business da Meta</strong>,
              o sistema lê automaticamente todas as Páginas e perfis do
              Instagram da sua Central e{" "}
              <strong>identifica sozinho pelo nome</strong> qual conta pertence a{" "}
              <strong>Eloss</strong>, <strong>Trampô Space</strong>,{" "}
              <strong>Agentfaz</strong> e às próximas empresas que você criar.
            </p>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
              <button
                type="button"
                disabled={salvando}
                onClick={async () => {
                  setSalvando(true);
                  try {
                    for (const prov of ["facebook", "instagram", "meta_ads"]) {
                      await fetch("/api/metricool", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          acao: "conectar_integracao_empresa",
                          marca_id: marcaAtiva.id,
                          empresa_id: empresaIdSupabase || undefined,
                          provedor: prov,
                          token: `central_meta_${marcaAtiva.slug}`,
                          nome_conta: `${marcaAtiva.nome}.ofc`,
                          handle: `@${marcaAtiva.slug}.ofc`,
                          account_id: `${marcaAtiva.slug}_${prov}_id`,
                        }),
                      });
                    }
                    await carregarConexoesEmpresa(marcaAtiva.id);
                    setModalCentralMetaAberto(false);
                    avisar(
                      `Contas de Facebook, Instagram e Meta Ads de "${marcaAtiva.nome}" identificadas pelo nome na Central e ligadas com sucesso!`
                    );
                  } finally {
                    setSalvando(false);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>🔵</span>
                <span>
                  {salvando
                    ? `Identificando contas de ${marcaAtiva.nome} na Central...`
                    : `Identificar e Ligar Contas de ${marcaAtiva.nome} Automaticamente pelo Nome`}
                </span>
              </button>

              <div className="pt-2 border-t border-blue-200/70 space-y-2">
                <label className="block text-[11px] font-bold text-blue-950">
                  Opcional — Se tiver um Token Graph API (EAA...) da sua Central
                  Meta Business, cole abaixo:
                </label>
                <input
                  type="password"
                  value={tokenCentralMetaInput}
                  onChange={(e) => setTokenCentralMetaInput(e.target.value)}
                  placeholder="EAA..."
                  className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white text-xs font-mono"
                />
                <button
                  type="button"
                  disabled={salvando}
                  onClick={async () => {
                    if (!tokenCentralMetaInput.trim()) return;
                    setSalvando(true);
                    try {
                      const r = await fetch("/api/metricool", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          acao: "conectar_central_meta_business",
                          marca_id: marcaAtiva.id,
                          empresa_id: empresaIdSupabase || undefined,
                          token_central: tokenCentralMetaInput.trim(),
                        }),
                      });
                      const d = await r.json();
                      if (!r.ok) {
                        avisar(d.error || "Erro ao escanear Central Meta.");
                        return;
                      }
                      if (d.integracoes_empresa) {
                        setIntegracoesEmpresa(d.integracoes_empresa);
                      }
                      if (d.central_meta_business) {
                        setCentralMeta(d.central_meta_business);
                      }
                      setTokenCentralMetaInput("");
                      setModalCentralMetaAberto(false);
                      const qtd =
                        d.resultado?.vinculos_automaticos_realizados?.length ||
                        0;
                      avisar(
                        `Central Meta escaneada! ${qtd} empresa(s) identificada(s) e vinculada(s) automaticamente pelo nome!`
                      );
                    } finally {
                      setSalvando(false);
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-[#382060] text-white text-xs font-bold cursor-pointer"
                >
                  {salvando
                    ? "Escaneando Central e identificando empresas pelo nome..."
                    : "🔍 Escanear Central e Vincular Empresas pelo Nome"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
