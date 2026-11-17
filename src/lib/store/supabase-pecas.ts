import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  ChecagemMarcaEloss,
  ConteudoEstruturadoPeca,
  Demanda,
  FormatoCanal,
  SlideCarrosselEloss,
} from "@/lib/types";
import { addHoursToClock, getExplicitClock } from "@/lib/clock";
import {
  IMAGENS_REAIS_SUPABASE_POR_TEMA,
  rodarChecagensMalha,
} from "@/lib/engine/ai-malha-gpt";
import { EMPRESA_ELOSS_SUPABASE_ID } from "@/lib/engine/mcp-auth";
import {
  MARCA_ELOSS_ID,
  MotorDatabaseState,
  TEMPLATE_REELS_SEMANAL_ID,
  buildSixStepsForFormato,
  criarAdaptacoesPadraoParaTema,
  readMotorDb,
  writeMotorDb,
} from "@/lib/store/motor-db";

export const RASCUNHO_TESTE_MCP_ID = "00000000-0000-4000-8000-00000000e105";

export interface PecaSupabaseRow {
  id: string;
  empresa_id: string;
  tema_id: string | null;
  canal: string;
  formato: string | null;
  estado: string;
  conteudo: string | null;
  imagens: Array<{
    url: string;
    ordem: number;
    prompt?: string;
    refsUsadas?: unknown[];
  }> | null;
  checagens: ChecagemMarcaEloss[] | null;
  autor: string | null;
  motivo_rejeicao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export class ErroPersistenciaSupabase extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ErroPersistenciaSupabase";
    this.status = status;
  }
}

function getSupabaseCredentials(): { url: string; key: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return { url, key };
}

function isUnitTestWithoutSupabase(): boolean {
  return Boolean(process.env.VITEST) && !getSupabaseCredentials();
}

function mapearFormatoSupabaseParaMotor(
  canal: string,
  formato: string | null
): FormatoCanal {
  if (canal === "blog" || formato === "artigo" || formato === "blog") {
    return "blog";
  }
  if (formato === "carrossel") return "carrossel";
  if (formato === "post" || formato === "post_simples") return "post_simples";
  if (canal === "reels" || formato === "reels") return "reels";
  if (canal === "stories" || formato === "story") return "story";
  return "carrossel";
}

function mapearEstadoSupabaseParaStatusDemanda(
  estado: string
): Demanda["status"] {
  if (estado === "aprovada" || estado === "publicada") return "peca_pronta";
  if (estado === "rejeitada") return "reprovada_em_ajuste";
  return "em_gate";
}

function mapearStatusDemandaParaEstadoSupabase(
  novoStatus: Demanda["status"] | undefined,
  estadoAtual: string
): string {
  if (!novoStatus) return estadoAtual;
  if (novoStatus === "peca_pronta") return "aprovada";
  if (novoStatus === "reprovada_em_ajuste") return "rejeitada";
  if (novoStatus === "em_gate") {
    return estadoAtual === "rascunho" ? "rascunho" : "aguardando_aprovacao";
  }
  return estadoAtual;
}

export function converterConteudoSupabaseParaEstruturado(
  row: PecaSupabaseRow
): ConteudoEstruturadoPeca {
  const formato = mapearFormatoSupabaseParaMotor(row.canal, row.formato);
  if (formato === "blog") {
    const markdown = row.conteudo || "";
    return {
      metodo_geracao: "malha_blog",
      modelo_ia: "Supabase Oficial Eloss (pecas)",
      artigo_markdown: markdown,
      checagens:
        Array.isArray(row.checagens) && row.checagens.length > 0
          ? row.checagens
          : rodarChecagensMalha(markdown, "blog"),
    };
  }

  let parsed: Record<string, unknown> = {};
  if (row.conteudo) {
    try {
      parsed = JSON.parse(row.conteudo) as Record<string, unknown>;
    } catch {
      parsed = { legenda: row.conteudo };
    }
  }

  const rawSlides = Array.isArray(parsed.slides)
    ? (parsed.slides as Record<string, unknown>[])
    : [];
  const rowImagens = Array.isArray(row.imagens) ? row.imagens : [];
  const fallbackUrls =
    (row.tema_id && IMAGENS_REAIS_SUPABASE_POR_TEMA[row.tema_id]) || [];

  const slides: SlideCarrosselEloss[] = rawSlides.map((s, idx) => {
    const ordem = Number(s.ordem || idx + 1);
    const tipo =
      ((s.tipo || s.template_tipo) as "capa" | "conteudo" | "dado" | "cta") ||
      (idx === 0
        ? "capa"
        : idx === rawSlides.length - 1
          ? "cta"
          : "conteudo");

    const imgFromRow =
      rowImagens.find((im) => im.ordem === idx)?.url ||
      rowImagens.find((im) => im.ordem === ordem)?.url ||
      fallbackUrls[idx];

    const imagemUrl =
      (typeof s.imagem_url === "string" && s.imagem_url) ||
      (typeof s.composto_url === "string" && s.composto_url) ||
      (typeof s.autoral_url === "string" && s.autoral_url) ||
      imgFromRow ||
      undefined;

    const promptImg = String(
      s.prompt_imagem ?? s.prompt_fundo ?? s.direcao_visual ?? ""
    );
    const dirVisual = String(
      s.direcao_visual ?? s.prompt_fundo ?? s.prompt_imagem ?? ""
    );

    return {
      ...(s as unknown as SlideCarrosselEloss),
      ordem,
      tipo,
      headline: String(s.headline ?? ""),
      headline_destaque: String(s.headline_destaque ?? ""),
      corpo: String(s.corpo ?? ""),
      cta: String(s.cta ?? ""),
      direcao_visual: dirVisual,
      prompt_imagem: promptImg,
      prompt_fundo: s.prompt_fundo ? String(s.prompt_fundo) : promptImg,
      imagem_url: imagemUrl,
    };
  });

  const legenda = String(parsed.legenda ?? "");
  const textoChecagem = [
    legenda,
    ...slides.map((sl) => `${sl.headline} ${sl.corpo}`),
  ].join("\n");

  return {
    metodo_geracao:
      (parsed.metodo_geracao as "gpt" | "malha_legado" | "malha_blog") || "gpt",
    modelo_ia: String(
      parsed.modelo_ia || "Supabase Oficial Eloss (Sincronizado via MCP / UI)"
    ),
    direcao_peca: parsed.direcao_peca
      ? String(parsed.direcao_peca)
      : "Carrossel Instagram Dark Tech Eloss (#0A0820 / #382060)",
    legenda,
    slides,
    headline_arte: parsed.headline_arte
      ? String(parsed.headline_arte)
      : undefined,
    destaque_gradiente: parsed.destaque_gradiente
      ? String(parsed.destaque_gradiente)
      : undefined,
    subtitulo_arte: parsed.subtitulo_arte
      ? String(parsed.subtitulo_arte)
      : undefined,
    prompt_imagem: parsed.prompt_imagem
      ? String(parsed.prompt_imagem)
      : undefined,
    agendado_para:
      typeof parsed.agendado_para === "string" ? parsed.agendado_para : null,
    publicado_em:
      typeof parsed.publicado_em === "string" ? parsed.publicado_em : null,
    url_publicada:
      typeof parsed.url_publicada === "string" ? parsed.url_publicada : null,
    metricas_reais:
      parsed.metricas_reais && typeof parsed.metricas_reais === "object"
        ? (parsed.metricas_reais as ConteudoEstruturadoPeca["metricas_reais"])
        : undefined,
    checagens:
      Array.isArray(row.checagens) && row.checagens.length > 0
        ? row.checagens
        : rodarChecagensMalha(textoChecagem, formato, slides),
  };
}

export function converterPecaSupabaseParaDemanda(
  row: PecaSupabaseRow,
  db: MotorDatabaseState,
  tituloTemaOverride?: string
): Demanda {
  const existente = db.demandas.find((d) => d.id === row.id);
  const formato = mapearFormatoSupabaseParaMotor(row.canal, row.formato);
  const tema = db.temas_editoriais.find((t) => t.id === row.tema_id);
  const artigo = db.artigos_blog_ancora.find((a) => a.tema_id === row.tema_id);
  const conteudoEstruturado = converterConteudoSupabaseParaEstruturado(row);

  if (existente) {
    return {
      ...existente,
      formato_canal: formato,
      tema_origem_id: row.tema_id || existente.tema_origem_id,
      conteudo_estruturado: conteudoEstruturado,
      status: mapearEstadoSupabaseParaStatusDemanda(row.estado),
      atualizado_em: row.atualizado_em || existente.atualizado_em,
    };
  }

  const codigo =
    row.id === RASCUNHO_TESTE_MCP_ID
      ? "RASCUNHO-TESTE-MCP"
      : tema?.codigo_tema || "T1";
  const baseTitulo =
    row.id === RASCUNHO_TESTE_MCP_ID
      ? "[RASCUNHO DE TESTE MCP] O que é MMN e Distribuição Estruturada"
      : tema?.titulo_tema ||
        tituloTemaOverride ||
        "Peça Editorial Eloss (Supabase)";

  const adaptacoes = tema?.adaptacoes_canais ||
    criarAdaptacoesPadraoParaTema({
      titulo_tema: baseTitulo,
      dor_do_publico:
        tema?.dor_do_publico ||
        "Operação comercial em crescimento buscando infraestrutura auditável.",
      palavra_chave_foco_seo:
        tema?.palavra_chave_foco_seo ||
        "plataforma operacional de crescimento eloss",
      pergunta_direta_aeo:
        tema?.pergunta_direta_aeo ||
        "Como estruturar distribuição através de pessoas com controle de margem?",
      tese_autoridade_geo:
        tema?.tese_autoridade_geo ||
        "Plataforma Operacional de Crescimento Eloss",
    });
  const adapt = adaptacoes[formato] || adaptacoes.carrossel;

  const clock = row.criado_em || getExplicitClock().iso;
  return {
    id: row.id,
    marca_id: MARCA_ELOSS_ID,
    formato_canal: formato,
    template_fluxo_id: TEMPLATE_REELS_SEMANAL_ID,
    template_nome:
      formato === "blog"
        ? "Matéria de Blog Âncora (Padrão AEO Eloss)"
        : "Carrossel Instagram (8 Lâminas — Dark Tech Eloss)",
    tipo_fluxo: "derivado_ciclo_continuo",
    tema_origem_id: row.tema_id,
    artigo_blog_origem_id: artigo?.id ?? null,
    titulo: `${codigo} — ${baseTitulo}`,
    briefing: {
      pauta_central: adapt.angulo_adaptado,
      dor_ou_situacao_real:
        tema?.dor_do_publico ||
        "Escala de representantes e canais com governança operacional.",
      objetivo_peca: adapt.proposito_no_canal,
      cta_desejado: adapt.cta_especifico,
      referencias_ou_insumos: adapt.estrutura_sugerida,
      autor_briefing: row.autor || "Supabase Oficial Eloss",
      adaptacao_canal: {
        formato,
        nome_canal: adapt.nome_canal,
        proposito_no_canal: adapt.proposito_no_canal,
        estrutura_sugerida: adapt.estrutura_sugerida,
      },
      origem_ciclo: {
        pesquisa_id: tema?.pesquisa_id,
        tema_id: row.tema_id || undefined,
        artigo_blog_id: artigo?.id,
        titulo_blog_ancora: artigo?.titulo_blog || baseTitulo,
        foco_seo_aeo_geo: tema
          ? `SEO: ${tema.palavra_chave_foco_seo} | AEO: ${tema.pergunta_direta_aeo}`
          : "Base Oficial Eloss (Supabase)",
        gatilho_pesquisa: "Tabela pecas (Supabase Oficial)",
      },
    },
    conteudo_estruturado: conteudoEstruturado,
    status: mapearEstadoSupabaseParaStatusDemanda(row.estado),
    prazo: addHoursToClock(clock, 48),
    data_retorno: addHoursToClock(clock, 12),
    criado_em: clock,
    atualizado_em: row.atualizado_em || clock,
  };
}

/**
 * Sincroniza as demandas da marca Eloss a partir da tabela real `pecas` no Supabase.
 * Garante que a interface e o endpoint MCP enxerguem exatamente os mesmos registros.
 */
export async function sincronizarDemandasComSupabase(
  db: MotorDatabaseState,
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
): Promise<MotorDatabaseState> {
  const creds = getSupabaseCredentials();
  if (!creds) {
    return db;
  }

  try {
    const [pecasRes, temasRes] = await Promise.all([
      fetch(
        `${creds.url}/rest/v1/pecas?empresa_id=eq.${encodeURIComponent(
          empresaId
        )}&select=*&order=atualizado_em.desc`,
        {
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
          },
          cache: "no-store",
        }
      ),
      fetch(
        `${creds.url}/rest/v1/temas?empresa_id=eq.${encodeURIComponent(
          empresaId
        )}&select=id,nome,descricao`,
        {
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
          },
          cache: "no-store",
        }
      ),
    ]);

    if (!pecasRes.ok) {
      return db;
    }

    const rows = (await pecasRes.json()) as PecaSupabaseRow[];
    const temasRows = temasRes.ok
      ? ((await temasRes.json()) as Array<{
          id: string;
          nome: string;
          descricao: string | null;
        }>)
      : [];
    const mapaNomeTema = new Map(temasRows.map((t) => [t.id, t.nome]));

    // Atualizar demandas existentes que possuem ID correspondente em `pecas`
    // e incluir as peças ativas / rascunho de teste do Supabase
    const idsPrincipais = new Set([
      RASCUNHO_TESTE_MCP_ID,
      "5884ba23-863b-41d8-98aa-b34c445209bd",
      "cbf6f513-ff0f-4599-8dea-845c93557fc0",
      "5bb4fb94-91f3-427b-92e8-7ac4bc62a463",
      "bf9445ca-ecc2-453f-af16-048ff851eeda",
      "5fe6af87-64d4-4d21-96b4-c040da9453e2",
      "dff6260d-97d2-41ef-bc2b-786be49f8f92",
      "9480e0e0-5be0-4b59-a47b-609212905067",
      "ce204fc6-d71b-40b2-a619-68fb1493c9fb",
    ]);

    for (const row of rows) {
      const idxExistente = db.demandas.findIndex((d) => d.id === row.id);
      const deveIncluir =
        idxExistente >= 0 ||
        idsPrincipais.has(row.id) ||
        row.estado !== "rejeitada";

      if (!deveIncluir) continue;

      const demandaConvertida = converterPecaSupabaseParaDemanda(
        row,
        db,
        row.tema_id ? mapaNomeTema.get(row.tema_id) : undefined
      );

      if (idxExistente >= 0) {
        db.demandas[idxExistente] = demandaConvertida;
      } else {
        db.demandas.push(demandaConvertida);
        if (demandaConvertida.formato_canal !== "blog") {
          const temTarefas = db.tarefas_fluxo.some(
            (t) => t.demanda_id === demandaConvertida.id
          );
          if (!temTarefas) {
            db.tarefas_fluxo.push(
              ...buildSixStepsForFormato(
                MARCA_ELOSS_ID,
                demandaConvertida.id,
                demandaConvertida.formato_canal,
                demandaConvertida.briefing,
                demandaConvertida.criado_em
              )
            );
          }
        }
      }

      // Se for blog e existir artigo âncora correspondente, sincroniza o markdown real
      if (
        demandaConvertida.formato_canal === "blog" &&
        demandaConvertida.conteudo_estruturado?.artigo_markdown &&
        row.tema_id
      ) {
        const art = db.artigos_blog_ancora.find(
          (a) => a.tema_id === row.tema_id
        );
        if (art) {
          art.conteudo_completo_markdown =
            demandaConvertida.conteudo_estruturado.artigo_markdown;
        }
      }
    }

    writeMotorDb(db);
    return db;
  } catch {
    return db;
  }
}

/**
 * Busca uma peça diretamente no Supabase (sem depender do cache de processo)
 * e retorna a Demanda mapeada junto ao estado atual do banco para montar o Super-Prompt.
 */
export async function obterDemandaOuPecaDoSupabase(
  demandaId: string,
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
): Promise<{ demanda: Demanda; db: MotorDatabaseState }> {
  const cleanId = (demandaId || "").trim();
  if (!cleanId) {
    throw new ErroPersistenciaSupabase("demanda_id é obrigatório.", 400);
  }

  const db = readMotorDb();

  if (isUnitTestWithoutSupabase()) {
    const local = db.demandas.find((d) => d.id === cleanId);
    if (!local) {
      throw new ErroPersistenciaSupabase("Peça não encontrada no banco.", 404);
    }
    return { demanda: local, db };
  }

  const creds = getSupabaseCredentials();
  if (!creds) {
    throw new ErroPersistenciaSupabase(
      "Configuração do Supabase ausente no servidor (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
      500
    );
  }

  // UUID regex check before querying Postgres UUID column
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cleanId
    );
  if (!isUuid) {
    throw new ErroPersistenciaSupabase(
      `Peça não encontrada no banco (ID inválido: ${cleanId}).`,
      404
    );
  }

  const res = await fetch(
    `${creds.url}/rest/v1/pecas?id=eq.${encodeURIComponent(
      cleanId
    )}&empresa_id=eq.${encodeURIComponent(empresaId)}&select=*&limit=1`,
    {
      headers: {
        apikey: creds.key,
        Authorization: `Bearer ${creds.key}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new ErroPersistenciaSupabase(
      `Falha ao consultar peça no Supabase (HTTP ${res.status}).`,
      502
    );
  }

  const rows = (await res.json()) as PecaSupabaseRow[];
  const row = rows[0];
  if (!row) {
    throw new ErroPersistenciaSupabase(
      "Peça não encontrada no Supabase para a empresa autorizada.",
      404
    );
  }

  let tituloTemaOverride: string | undefined;
  if (row.tema_id) {
    // Carrega também a matéria de blog âncora real desse tema no Supabase, se existir
    const [temaRes, blogRes] = await Promise.all([
      fetch(
        `${creds.url}/rest/v1/temas?id=eq.${encodeURIComponent(
          row.tema_id
        )}&empresa_id=eq.${encodeURIComponent(empresaId)}&select=id,nome&limit=1`,
        {
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
          },
          cache: "no-store",
        }
      ),
      fetch(
        `${creds.url}/rest/v1/pecas?tema_id=eq.${encodeURIComponent(
          row.tema_id
        )}&empresa_id=eq.${encodeURIComponent(
          empresaId
        )}&canal=eq.blog&select=id,conteudo&order=atualizado_em.desc&limit=1`,
        {
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
          },
          cache: "no-store",
        }
      ),
    ]);

    if (temaRes.ok) {
      const tRows = (await temaRes.json()) as Array<{ id: string; nome: string }>;
      if (tRows[0]?.nome) {
        tituloTemaOverride = tRows[0].nome;
      }
    }

    if (blogRes.ok) {
      const bRows = (await blogRes.json()) as Array<{
        id: string;
        conteudo: string | null;
      }>;
      if (bRows[0]?.conteudo) {
        const artExistente = db.artigos_blog_ancora.find(
          (a) => a.tema_id === row.tema_id
        );
        if (artExistente) {
          artExistente.conteudo_completo_markdown = bRows[0].conteudo;
        } else {
          db.artigos_blog_ancora.push({
            id: bRows[0].id,
            marca_id: MARCA_ELOSS_ID,
            pesquisa_id: "33333333-3333-4333-8333-333333333301",
            tema_id: row.tema_id,
            titulo_blog: tituloTemaOverride || "Matéria Âncora Eloss",
            byline: "Por Equipe Editorial Eloss",
            subtitulo_seo: "Artigo canônico da Base Oficial Eloss",
            bloco_resposta_direta_aeo: "",
            dados_e_entidades_geo: "",
            resumo_estrutura_artigo: "",
            conteudo_completo_markdown: bRows[0].conteudo,
            checagens: [],
            status: "aprovado_como_ancora",
            criado_em: row.criado_em,
          });
        }
      }
    }
  }

  const demanda = converterPecaSupabaseParaDemanda(
    row,
    db,
    tituloTemaOverride
  );
  const idx = db.demandas.findIndex((d) => d.id === demanda.id);
  if (idx >= 0) {
    db.demandas[idx] = demanda;
  } else {
    db.demandas.push(demanda);
  }

  return { demanda, db };
}

export interface AtualizarPecaSupabasePayload {
  demanda_id?: string;
  codigo_tema?: string;
  legenda?: string;
  slides?: Partial<SlideCarrosselEloss>[];
  headline_arte?: string;
  destaque_gradiente?: string;
  subtitulo_arte?: string;
  prompt_imagem?: string;
  artigo_markdown?: string;
  novo_status?: Demanda["status"];
  estado_supabase_direto?: "rascunho" | "aguardando_aprovacao" | "aprovada" | "publicada" | "rejeitada";
  agendado_para?: string | null;
  publicado_em?: string | null;
  url_publicada?: string | null;
  metricas_reais?: ConteudoEstruturadoPeca["metricas_reais"];
  esperado_atualizado_em?: string;
  ator?: string;
}

/**
 * Atualiza uma peça de forma persistente na tabela `pecas` do Supabase,
 * preservando todos os campos existentes em `conteudo` e `slides`,
 * tratando conflitos de edição e exigindo confirmação real do Supabase.
 */
export async function atualizarPecaNoSupabase(
  payload: AtualizarPecaSupabasePayload,
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
): Promise<Demanda> {
  const db = readMotorDb();
  let targetId = (payload.demanda_id || "").trim();

  if (!targetId && payload.codigo_tema) {
    const tema = db.temas_editoriais.find(
      (t) =>
        (t.codigo_tema || "").toLowerCase() ===
        payload.codigo_tema?.toLowerCase()
    );
    if (tema) {
      const encontrada = db.demandas.find(
        (d) => d.tema_origem_id === tema.id && d.formato_canal !== "blog"
      );
      if (encontrada) {
        targetId = encontrada.id;
      }
    }
  }

  if (!targetId) {
    throw new ErroPersistenciaSupabase(
      "Peça não localizada para sincronização. Verifique o demanda_id ou codigo_tema.",
      404
    );
  }

  // Fallback exclusivo para testes unitários isolados em memória (Vitest sem Supabase configurado)
  if (isUnitTestWithoutSupabase()) {
    const demanda = db.demandas.find((d) => d.id === targetId);
    if (!demanda) {
      throw new ErroPersistenciaSupabase(
        "Peça não localizada para sincronização. Verifique o demanda_id ou codigo_tema.",
        404
      );
    }
    if (
      payload.esperado_atualizado_em &&
      demanda.atualizado_em &&
      payload.esperado_atualizado_em !== demanda.atualizado_em
    ) {
      throw new ErroPersistenciaSupabase(
        "Conflito de edição detectado: a peça foi modificada recentemente por outro processo.",
        409
      );
    }

    const atual = demanda.conteudo_estruturado || {
      metodo_geracao: "gpt",
      modelo_ia: "ChatGPT (Plano ChatGPT + Sincronização MCP)",
      checagens: [],
    };

    let novosSlides = atual.slides || [];
    if (Array.isArray(payload.slides) && payload.slides.length > 0) {
      novosSlides = payload.slides.map((s, idx) => {
        const anterior = atual.slides?.[idx];
        return {
          ...anterior,
          ...s,
          ordem: Number(s.ordem || idx + 1),
          tipo:
            (s.tipo as "capa" | "conteudo" | "dado" | "cta") ||
            anterior?.tipo ||
            (idx === 0
              ? "capa"
              : idx === payload.slides!.length - 1
                ? "cta"
                : "conteudo"),
          headline: String(s.headline ?? anterior?.headline ?? ""),
          headline_destaque: String(
            s.headline_destaque ?? anterior?.headline_destaque ?? ""
          ),
          corpo: String(s.corpo ?? anterior?.corpo ?? ""),
          cta: String(s.cta ?? anterior?.cta ?? ""),
          direcao_visual: String(
            s.direcao_visual ??
              s.prompt_imagem ??
              anterior?.direcao_visual ??
              ""
          ),
          prompt_imagem: String(
            s.prompt_imagem ??
              anterior?.prompt_imagem ??
              s.direcao_visual ??
              ""
          ),
          imagem_url: s.imagem_url || anterior?.imagem_url,
        };
      });
    }

    const novaLegenda =
      payload.legenda !== undefined ? payload.legenda : atual.legenda;
    const textoParaChecar = [
      novaLegenda || "",
      ...novosSlides.map((sl) => `${sl.headline} ${sl.corpo}`),
    ].join("\n");

    demanda.conteudo_estruturado = {
      ...atual,
      metodo_geracao: "gpt",
      modelo_ia: "Plano ChatGPT (Sincronizado via MCP / Ponte Direta)",
      legenda: novaLegenda,
      slides: novosSlides.length > 0 ? novosSlides : atual.slides,
      headline_arte: payload.headline_arte ?? atual.headline_arte,
      destaque_gradiente:
        payload.destaque_gradiente ?? atual.destaque_gradiente,
      subtitulo_arte: payload.subtitulo_arte ?? atual.subtitulo_arte,
      prompt_imagem: payload.prompt_imagem ?? atual.prompt_imagem,
      artigo_markdown: payload.artigo_markdown ?? atual.artigo_markdown,
      checagens: rodarChecagensMalha(
        textoParaChecar,
        demanda.formato_canal,
        novosSlides
      ),
    };
    if (payload.novo_status) {
      demanda.status = payload.novo_status;
    }
    demanda.atualizado_em = new Date().toISOString();
    writeMotorDb(db);
    return demanda;
  }

  const creds = getSupabaseCredentials();
  if (!creds) {
    throw new ErroPersistenciaSupabase(
      "Persistência indisponível: credenciais do Supabase não configuradas no servidor.",
      500
    );
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      targetId
    );
  if (!isUuid) {
    throw new ErroPersistenciaSupabase(
      `Peça não localizada no Supabase (ID inválido: ${targetId}).`,
      404
    );
  }

  // 1. Ler registro atual no Supabase
  const getRes = await fetch(
    `${creds.url}/rest/v1/pecas?id=eq.${encodeURIComponent(
      targetId
    )}&empresa_id=eq.${encodeURIComponent(empresaId)}&select=*&limit=1`,
    {
      headers: {
        apikey: creds.key,
        Authorization: `Bearer ${creds.key}`,
      },
      cache: "no-store",
    }
  );

  if (!getRes.ok) {
    throw new ErroPersistenciaSupabase(
      `Erro ao verificar peça no Supabase antes de salvar (HTTP ${getRes.status}).`,
      502
    );
  }

  const existingRows = (await getRes.json()) as PecaSupabaseRow[];
  const pecaAtual = existingRows[0];
  if (!pecaAtual) {
    throw new ErroPersistenciaSupabase(
      "Peça não localizada no Supabase para a empresa autorizada.",
      404
    );
  }

  // 2. Verificar conflito de edição caso esperado_atualizado_em tenha sido informado
  if (
    payload.esperado_atualizado_em &&
    pecaAtual.atualizado_em &&
    new Date(payload.esperado_atualizado_em).getTime() !==
      new Date(pecaAtual.atualizado_em).getTime()
  ) {
    throw new ErroPersistenciaSupabase(
      `Conflito de edição detectado: a peça foi atualizada em ${pecaAtual.atualizado_em}, diferente de ${payload.esperado_atualizado_em}. Recarregue antes de salvar.`,
      409
    );
  }

  const formato = mapearFormatoSupabaseParaMotor(
    pecaAtual.canal,
    pecaAtual.formato
  );
  const agoraIso = new Date().toISOString();

  let novoConteudoString: string | null = pecaAtual.conteudo;
  let novasChecagens: ChecagemMarcaEloss[] = Array.isArray(pecaAtual.checagens)
    ? pecaAtual.checagens
    : [];
  let novasImagens = Array.isArray(pecaAtual.imagens)
    ? [...pecaAtual.imagens]
    : [];

  if (formato === "blog") {
    if (typeof payload.artigo_markdown === "string") {
      novoConteudoString = payload.artigo_markdown;
      novasChecagens = rodarChecagensMalha(payload.artigo_markdown, "blog");
    }
  } else {
    let parsedAtual: Record<string, unknown> = {};
    if (pecaAtual.conteudo) {
      try {
        parsedAtual = JSON.parse(pecaAtual.conteudo) as Record<string, unknown>;
      } catch {
        parsedAtual = { legenda: pecaAtual.conteudo };
      }
    }

    const slidesAnteriores = Array.isArray(parsedAtual.slides)
      ? (parsedAtual.slides as Record<string, unknown>[])
      : [];

    let slidesFinais: Record<string, unknown>[] = slidesAnteriores;

    if (Array.isArray(payload.slides) && payload.slides.length > 0) {
      const total = payload.slides.length;
      slidesFinais = payload.slides.map((s, idx) => {
        const anterior =
          slidesAnteriores.find((ant, aIdx) => {
            const antOrdem = Number(ant.ordem || aIdx + 1);
            return antOrdem === Number(s.ordem || idx + 1);
          }) ||
          slidesAnteriores[idx] ||
          {};

        const ordem = Number(s.ordem || idx + 1);
        const tipoSlide =
          (s.tipo as "capa" | "conteudo" | "dado" | "cta") ||
          ((s as Record<string, unknown>).template_tipo as
            | "capa"
            | "conteudo"
            | "dado"
            | "cta") ||
          (anterior.tipo as "capa" | "conteudo" | "dado" | "cta") ||
          (anterior.template_tipo as "capa" | "conteudo" | "dado" | "cta") ||
          (idx === 0 ? "capa" : idx === total - 1 ? "cta" : "conteudo");

        const promptImg = String(
          s.prompt_imagem ??
            s.direcao_visual ??
            anterior.prompt_imagem ??
            anterior.prompt_fundo ??
            anterior.direcao_visual ??
            ""
        );
        const dirVisual = String(
          s.direcao_visual ??
            s.prompt_imagem ??
            anterior.direcao_visual ??
            anterior.prompt_fundo ??
            anterior.prompt_imagem ??
            ""
        );

        const imgUrl =
          s.imagem_url ??
          (typeof anterior.imagem_url === "string"
            ? anterior.imagem_url
            : undefined);

        // Se imagem_url foi definida ou alterada no slide, sincroniza também em pecas.imagens
        if (typeof imgUrl === "string" && imgUrl.trim()) {
          const imgIdx = novasImagens.findIndex(
            (im) => im.ordem === idx || im.ordem === ordem
          );
          if (imgIdx >= 0) {
            novasImagens[imgIdx] = {
              ...novasImagens[imgIdx],
              url: imgUrl,
            };
          } else {
            novasImagens.push({
              url: imgUrl,
              ordem: idx,
              prompt: promptImg || "(arte sincronizada)",
              refsUsadas: [],
            });
          }
        }

        return {
          ...anterior,
          ...s,
          ordem,
          tipo: tipoSlide,
          template_tipo: tipoSlide,
          headline: String(s.headline ?? anterior.headline ?? ""),
          headline_destaque: String(
            s.headline_destaque ?? anterior.headline_destaque ?? ""
          ),
          corpo: String(s.corpo ?? anterior.corpo ?? ""),
          cta: String(s.cta ?? anterior.cta ?? ""),
          direcao_visual: dirVisual,
          prompt_imagem: promptImg,
          prompt_fundo: String(
            (s as Record<string, unknown>).prompt_fundo ??
              promptImg ??
              anterior.prompt_fundo ??
              ""
          ),
          ...(imgUrl ? { imagem_url: imgUrl } : {}),
        };
      });
    }

    const novaLegenda =
      payload.legenda !== undefined
        ? String(payload.legenda)
        : String(parsedAtual.legenda ?? "");

    const slidesTipados = slidesFinais as unknown as SlideCarrosselEloss[];
    const textoParaChecar = [
      novaLegenda,
      ...slidesTipados.map((sl) => `${sl.headline || ""} ${sl.corpo || ""}`),
      payload.headline_arte || "",
      payload.subtitulo_arte || "",
    ].join("\n");

    novasChecagens = rodarChecagensMalha(
      textoParaChecar,
      formato,
      slidesTipados
    );

    const objetoConteudoFinal: Record<string, unknown> = {
      ...parsedAtual,
      metodo_geracao: "gpt",
      modelo_ia: "Plano ChatGPT (Sincronizado via MCP / Supabase)",
      legenda: novaLegenda,
      slides: slidesFinais,
      ...(payload.headline_arte !== undefined
        ? { headline_arte: payload.headline_arte }
        : {}),
      ...(payload.destaque_gradiente !== undefined
        ? { destaque_gradiente: payload.destaque_gradiente }
        : {}),
      ...(payload.subtitulo_arte !== undefined
        ? { subtitulo_arte: payload.subtitulo_arte }
        : {}),
      ...(payload.prompt_imagem !== undefined
        ? { prompt_imagem: payload.prompt_imagem }
        : {}),
      ...(payload.agendado_para !== undefined
        ? { agendado_para: payload.agendado_para }
        : {}),
      ...(payload.publicado_em !== undefined
        ? { publicado_em: payload.publicado_em }
        : {}),
      ...(payload.url_publicada !== undefined
        ? { url_publicada: payload.url_publicada }
        : {}),
      ...(payload.metricas_reais !== undefined
        ? { metricas_reais: payload.metricas_reais }
        : {}),
    };

    novoConteudoString = JSON.stringify(objetoConteudoFinal);
  }

  const novoEstadoSupabase =
    payload.estado_supabase_direto ||
    mapearStatusDemandaParaEstadoSupabase(
      payload.novo_status,
      pecaAtual.estado
    );

  // 3. Persistir no Supabase (PATCH com Prefer: return=representation)
  const patchRes = await fetch(
    `${creds.url}/rest/v1/pecas?id=eq.${encodeURIComponent(
      pecaAtual.id
    )}&empresa_id=eq.${encodeURIComponent(empresaId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: creds.key,
        Authorization: `Bearer ${creds.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        conteudo: novoConteudoString,
        checagens: novasChecagens,
        imagens: novasImagens,
        estado: novoEstadoSupabase,
        atualizado_em: agoraIso,
      }),
      cache: "no-store",
    }
  );

  if (!patchRes.ok) {
    const errText = await patchRes.text().catch(() => "");
    throw new ErroPersistenciaSupabase(
      `Falha ao gravar peça no Supabase (HTTP ${patchRes.status}): ${errText.slice(0, 200)}`,
      502
    );
  }

  const updatedRows = (await patchRes.json()) as PecaSupabaseRow[];
  const pecaSalva = updatedRows[0];
  if (!pecaSalva || !pecaSalva.id) {
    throw new ErroPersistenciaSupabase(
      "O Supabase não confirmou a gravação da peça (nenhum registro retornado).",
      502
    );
  }

  // 4. Atualizar cache local somente após confirmação do Supabase
  const demandaAtualizada = converterPecaSupabaseParaDemanda(pecaSalva, db);
  const idx = db.demandas.findIndex((d) => d.id === demandaAtualizada.id);
  if (idx >= 0) {
    db.demandas[idx] = demandaAtualizada;
  } else {
    db.demandas.push(demandaAtualizada);
  }

  db.trilha_proveniencia.push({
    id: crypto.randomUUID(),
    marca_id: demandaAtualizada.marca_id,
    demanda_id: demandaAtualizada.id,
    tarefa_id: null,
    entrega_id: null,
    decisao_id: null,
    evento: "POST_SINCRONIZADO_E_PERSISTIDO_NO_SUPABASE",
    ator: payload.ator || "ChatGPT (MCP Autenticado) + Isabelle",
    detalhes: {
      slides_atualizados:
        demandaAtualizada.conteudo_estruturado?.slides?.length || 0,
      formato: demandaAtualizada.formato_canal,
      supabase_peca_id: pecaSalva.id,
    },
    timestamp_explicito: pecaSalva.atualizado_em || agoraIso,
  });

  writeMotorDb(db);
  return demandaAtualizada;
}

export async function construirSuperPromptChatGpt(
  demandaId: string,
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
) {
  const { demanda, db } = await obterDemandaOuPecaDoSupabase(
    demandaId,
    empresaId
  );

  const tema = db.temas_editoriais.find(
    (t) => t.id === demanda.tema_origem_id
  );
  const artigo = db.artigos_blog_ancora.find(
    (a) =>
      a.id === demanda.artigo_blog_origem_id ||
      a.tema_id === demanda.tema_origem_id
  );

  const slides = demanda.conteudo_estruturado?.slides || [];
  const legenda = demanda.conteudo_estruturado?.legenda || "";

  const blocoSlidesAtuais =
    slides.length > 0
      ? slides
          .map(
            (s) => `### SLIDE ${s.ordem} de ${slides.length} (${s.tipo.toUpperCase()})
- Headline: ${s.headline}
- Destaque Gradiente (#5B1F8A → #F4834B): ${s.headline_destaque || "(definir)"}
- Corpo: ${s.corpo}
- CTA: ${s.cta || "(sem CTA)"}
- Prompt de Arte 8 Pontos (com Cláusula Anti-Mosaico):
${s.prompt_imagem || s.direcao_visual}`
          )
          .join("\n\n")
      : "(Slides ainda não definidos — gere os 8 slides completos a partir da matéria abaixo)";

  const todosPromptsArte =
    slides.length > 0
      ? slides
          .map(
            (s) =>
              `=== ARTE DO SLIDE ${s.ordem} DE ${slides.length} ===\n${
                s.prompt_imagem ||
                `Crie um slide individual em 1080x1350px, proporção 4:5. Não gere mosaico, não gere grid, não coloque múltiplos slides em uma única imagem. Este é o slide ${s.ordem} de ${slides.length}, gere apenas este slide isolado. a) Formato: Single image, Instagram post, 1080x1350px, 4:5 portrait. b) Fundo: Modo Escuro #0A0820 a #0D0A1A com glows #5B1F8A e #F4834B. c) Marca: ELOSS no topo esquerdo. d) Headline: "${s.headline}" com destaque gradiente em "${s.headline_destaque || ""}". e) Corpo: "${s.corpo}". f) Elemento gráfico central 3D glass: ${s.direcao_visual}. g) Rodapé: 0${s.ordem}/0${slides.length}. h) Estilo: Dark tech editorial, Poppins ExtraBold, DM Sans.`
              }`
          )
          .join("\n\n")
      : "";

  const superPromptCompleto = `# CONTEXTO E COMANDO MESTRE — MOTOR DE MARKETING ELOSS (PLANO CHATGPT)
Você está conectado ao fluxo de produção da **Eloss ("Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas")**.
- **ID da Peça no Sistema (\`demanda_id\`):** \`${demanda.id}\`
- **Tema (\`codigo_tema\`):** ${tema?.codigo_tema || "T1"} — ${tema?.titulo_tema || demanda.titulo}
- **Canal / Formato:** ${demanda.formato_canal.toUpperCase()}

---

## 1. DIRETRIZES INEGOCIÁVEIS DA MARCA ELOSS
- **Tom de Voz:** Afirmativo, direto, técnico e acessível para o dono/sócio da operação. NUNCA use gerúndio no início de frases, nunca use clichês de marketing ("no mundo atual", "revolucionário", "descubra como").
- **Proibições Absolutas:** Zero vocabulário de consultoria ("diagnóstico", "auditoria", "consultoria", "assessoria", "mentoria"). Zero menção a concorrentes.
- **Identidade Visual (Dark Tech Editorial 4:5 — 1080x1350px):**
  - Fundo escuro profundo (\`#0A0820\`, \`#0D0A1A\`, \`#382060\`) com glows sutis em roxo (\`#5B1F8A\`) e laranja coral (\`#F4834B\`).
  - Tipografia: **Poppins ExtraBold** nas headlines (com apenas 1 trecho por slide em gradiente \`#5B1F8A → #F4834B\`) e **DM Sans** no corpo com barra vertical \`#F4834B\` à esquerda.
  - **Cláusula Anti-Mosaico Obrigatória em toda arte:** Cada imagem gerada DEVE ser um slide individual isolado em 1080x1350px (4:5). Proibido gerar grid ou mosaico com vários slides juntos.

---

## 2. MATÉRIA ÂNCORA DO BLOG (BASE TÉCNICA DO POST)
${(artigo?.conteudo_completo_markdown || demanda.briefing.pauta_central || "").slice(0, 7500)}

---

## 3. ESTRUTURA ATUAL DO POST / CARROSSEL (${slides.length || 8} SLIDES) E PROMPTS DE 8 PONTOS
${blocoSlidesAtuais}

### LEGENDA ATUAL:
${legenda}

---

## 4. O QUE VOCÊ DEVE FAZER AGORA NO CHATGPT:
1. **Se eu pedir para refinar ou criar o conteúdo do post/carrossel:** melhore os slides, a legenda e os prompts visuais de 8 pontos mantendo 100% de fidelidade aos dados da Matéria Âncora e às Regras da Eloss.
2. **Se eu pedir para gerar as artes ("Gere a arte do Slide 1", "Gere todas as artes uma a uma"):** gere **uma imagem por vez** em proporção vertical (4:5 / 1024x1536) seguindo fielmente o Prompt de 8 Pontos daquele slide, sem mosaico.
3. **Quando eu pedir para ATUALIZAR NO SISTEMA DA ELOSS:**
   - Se a ferramenta MCP \`atualizar_post_no_sistema_eloss\` (ou Action \`atualizarPostNoSistemaEloss\`) estiver ativa, chame-a diretamente passando \`demanda_id: "${demanda.id}"\`.
   - E também entregue o bloco JSON abaixo pronto para sincronização em 1 clique no painel da Eloss.`;

  const promptSomenteArtes = `# GERAR ARTES DO CARROSSEL ELOSS NO CHATGPT (1 SLIDE POR VEZ — PROPORÇÃO 4:5 VERTICAL)
Peça: ${tema?.codigo_tema || ""} — ${demanda.titulo}
IMPORTANTE: Gere **1 imagem individual por vez** (começando pelo Slide 1). NUNCA gere mosaico ou grid com vários slides na mesma imagem.

${todosPromptsArte}

---
👉 **Comece agora gerando apenas a imagem isolada do SLIDE 1 DE ${slides.length || 8}** seguindo exatamente as instruções do Slide 1 acima.`;

  return {
    demanda_id: demanda.id,
    titulo: demanda.titulo,
    atualizado_em: demanda.atualizado_em,
    slides,
    legenda,
    super_prompt_completo: superPromptCompleto,
    prompt_sequencia_artes: promptSomenteArtes,
  };
}

export async function salvarArteColadaNoSupabase(
  body: {
    demanda_id?: string;
    ordem_slide?: number;
    data_url?: string;
  },
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
) {
  const { demanda_id, ordem_slide, data_url } = body;
  if (!demanda_id || !data_url) {
    throw new ErroPersistenciaSupabase(
      "demanda_id e data_url são obrigatórios.",
      400
    );
  }

  const { demanda } = await obterDemandaOuPecaDoSupabase(
    demanda_id,
    empresaId
  );

  const matches = String(data_url).match(
    /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/
  );
  if (!matches) {
    throw new ErroPersistenciaSupabase("Formato de imagem inválido.", 400);
  }

  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const mimeType = `image/${matches[1]}`;
  const b64Data = matches[2];
  const buffer = Buffer.from(b64Data, "base64");
  const ordemNum = Number(ordem_slide || 1);
  const fileName = `chatgpt-plan-slide-${demanda.id.slice(0, 8)}-${ordemNum}-${Date.now()}.${ext}`;

  let imageUrl = "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const storagePath = `${demanda.id}/${fileName}`;
      const upRes = await fetch(
        `${supabaseUrl}/storage/v1/object/peca-imagens/${storagePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            "Content-Type": mimeType,
            "x-upsert": "true",
          },
          body: buffer,
        }
      );
      if (upRes.ok) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/peca-imagens/${storagePath}`;
      }
    } catch {
      // fallback local
    }
  }

  if (!imageUrl) {
    try {
      const dir = path.join(process.cwd(), "public", "geradas");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, fileName), buffer);
      imageUrl = `/geradas/${fileName}`;
    } catch {
      imageUrl = String(data_url);
    }
  }

  const slidesAtuais = demanda.conteudo_estruturado?.slides || [];
  const slidesAtualizados = slidesAtuais.map((s) =>
    s.ordem === ordemNum ? { ...s, imagem_url: imageUrl } : s
  );

  const demandaSalva = await atualizarPecaNoSupabase(
    {
      demanda_id: demanda.id,
      slides: slidesAtualizados,
      ator: "ChatGPT (Upload Arte Slide) + Isabelle",
    },
    empresaId
  );

  return { imageUrl, demanda: demandaSalva };
}
