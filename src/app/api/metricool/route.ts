import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { EMPRESA_ELOSS_SUPABASE_ID } from "@/lib/engine/mcp-auth";
import {
  MARCA_AGENTFAZ_ID,
  MARCA_ELOSS_ID,
  MARCA_TRAMPO_ID,
  readMotorDb,
  writeMotorDb,
} from "@/lib/store/motor-db";
import { sincronizarDemandasComSupabase } from "@/lib/store/supabase-pecas";

export const dynamic = "force-dynamic";

const ORGANIZACAO_PADRAO_ID = "54ad1645-b296-4a3a-8420-e4ac6b7dcd1e";

export function mapearMarcaParaEmpresaSupabaseId(marcaId: string): string {
  if (!marcaId || marcaId === MARCA_ELOSS_ID) return EMPRESA_ELOSS_SUPABASE_ID;
  if (marcaId === MARCA_TRAMPO_ID) return "00000000-0000-0000-0000-000000000002";
  if (marcaId === MARCA_AGENTFAZ_ID) return "00000000-0000-0000-0000-000000000003";
  return marcaId;
}

export interface IntegracaoEmpresaPublica {
  id: string;
  empresa_id: string;
  provedor: string;
  chave_mascarada: string;
  ativa: boolean;
  atualizado_em: string;
  config: {
    handle?: string;
    nome_conta?: string;
    account_id?: string;
    page_id?: string;
    site_url?: string;
    usuario?: string;
    avatar_url?: string;
    seguidores?: number;
    seguindo?: number;
    total_publicacoes?: number;
    impressoes_30d?: number;
    alcance_30d?: number;
    ultima_sincronizacao?: string;
    erro_sincronizacao?: string;
    posts_reais?: Array<{
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    }>;
  };
}

export interface MetricoolPersistedState {
  postsAgendados: Array<{
    id: string;
    marcaId: string;
    empresaId?: string;
    demandaOrigemId?: string;
    titulo: string;
    legenda: string;
    primeiroComentario?: string;
    redes: ("instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "blog")[];
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
    permalinkPublicado?: string;
    atualizadoEm: string;
  }>;
  smartLinks: {
    titulo: string;
    bio: string;
    botoes: Array<{
      id: string;
      titulo: string;
      url: string;
      cliques: number;
      ativo: boolean;
      destaque?: boolean;
    }>;
  };
  concorrentes: Array<{
    id: string;
    nome: string;
    handle: string;
    rede: "instagram" | "linkedin" | "facebook";
    seguidores: number;
    crescimentoPct: number;
    publicacoesPeriodo: number;
    engajamentoPct: number;
    mediaInteracoes: number;
  }>;
  threadsInbox: Array<{
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
    mensagens: Array<{
      id: string;
      remetente: "usuario" | "marca";
      texto: string;
      horario: string;
    }>;
  }>;
}

function criarEstadoInicialLimpo(nomeEmpresa: string): MetricoolPersistedState {
  return {
    postsAgendados: [],
    smartLinks: {
      titulo: `${nomeEmpresa}`,
      bio: `Links oficiais e materiais de ${nomeEmpresa}`,
      botoes: [],
    },
    concorrentes: [],
    threadsInbox: [],
  };
}

function getSupabaseCreds(): { url: string; key: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return { url, key };
}

function mascararChave(raw: string): string {
  const clean = raw.trim();
  if (clean.length <= 8) return "••••••••";
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

function criptografarChave(raw: string): string {
  const secretHex = (process.env.ENCRYPTION_KEY || "").trim();
  if (secretHex.length === 64) {
    try {
      const key = Buffer.from(secretHex, "hex");
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([
        cipher.update(raw, "utf8"),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();
      return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
    } catch {
      // fallback base64
    }
  }
  return `b64:${Buffer.from(raw, "utf8").toString("base64")}`;
}

function descriptografarChave(stored: string): string {
  if (!stored) return "";
  if (stored.startsWith("b64:")) {
    return Buffer.from(stored.slice(4), "base64").toString("utf8");
  }
  if (stored.startsWith("v1:")) {
    const secretHex = (process.env.ENCRYPTION_KEY || "").trim();
    if (secretHex.length === 64) {
      try {
        const [, ivHex, tagHex, encHex] = stored.split(":");
        const key = Buffer.from(secretHex, "hex");
        const decipher = crypto.createDecipheriv(
          "aes-256-gcm",
          key,
          Buffer.from(ivHex, "hex")
        );
        decipher.setAuthTag(Buffer.from(tagHex, "hex"));
        const dec = Buffer.concat([
          decipher.update(Buffer.from(encHex, "hex")),
          decipher.final(),
        ]);
        return dec.toString("utf8");
      } catch {
        return "";
      }
    }
  }
  return "";
}

async function listarEmpresasSupabase(): Promise<
  Array<{
    id: string;
    nome: string;
    slug: string;
    site_url: string | null;
    segmento: string | null;
    canais_ativos: string[];
  }>
> {
  const creds = getSupabaseCreds();
  if (!creds) return [];
  try {
    const res = await fetch(
      `${creds.url}/rest/v1/empresas?ativa=eq.true&select=id,nome,site_url,segmento,canais_ativos&order=criado_em.asc`,
      {
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      id: string;
      nome: string;
      site_url: string | null;
      segmento: string | null;
      canais_ativos: string[] | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      slug: r.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      site_url: r.site_url,
      segmento: r.segmento,
      canais_ativos: Array.isArray(r.canais_ativos) ? r.canais_ativos : [],
    }));
  } catch {
    return [];
  }
}

async function listarIntegracoesEmpresaSupabase(
  empresaId: string
): Promise<{
  publicas: IntegracaoEmpresaPublica[];
  rawRows: Array<{
    id: string;
    empresa_id: string;
    provedor: string;
    chave_criptografada: string;
    chave_mascarada: string;
    ativa: boolean;
    atualizado_em: string;
    config: Record<string, unknown> | null;
  }>;
}> {
  const creds = getSupabaseCreds();
  if (!creds) return { publicas: [], rawRows: [] };

  try {
    const res = await fetch(
      `${creds.url}/rest/v1/integracoes?empresa_id=eq.${encodeURIComponent(
        empresaId
      )}&select=*&order=atualizado_em.desc`,
      {
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return { publicas: [], rawRows: [] };
    const rows = (await res.json()) as Array<{
      id: string;
      empresa_id: string;
      provedor: string;
      chave_criptografada: string;
      chave_mascarada: string;
      ativa: boolean;
      atualizado_em: string;
      config: Record<string, unknown> | null;
    }>;

    const publicas: IntegracaoEmpresaPublica[] = rows
      .filter(
        (r) =>
          r.provedor !== "openai" &&
          r.provedor !== "anthropic" &&
          r.provedor !== "metricool_state"
      )
      .map((r) => ({
        id: r.id,
        empresa_id: r.empresa_id,
        provedor: r.provedor,
        chave_mascarada: r.chave_mascarada,
        ativa: Boolean(r.ativa),
        atualizado_em: r.atualizado_em,
        config: (r.config || {}) as IntegracaoEmpresaPublica["config"],
      }));

    return { publicas, rawRows: rows };
  } catch {
    return { publicas: [], rawRows: [] };
  }
}

async function lerEstadoMetricoolEmpresa(
  empresaId: string,
  nomeEmpresa = "Empresa"
): Promise<MetricoolPersistedState> {
  const padrao = criarEstadoInicialLimpo(nomeEmpresa);
  const creds = getSupabaseCreds();
  if (creds) {
    try {
      const res = await fetch(
        `${creds.url}/rest/v1/integracoes?empresa_id=eq.${encodeURIComponent(
          empresaId
        )}&provedor=eq.metricool_state&select=id,config&limit=1`,
        {
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id: string;
          config?: { state?: MetricoolPersistedState } | null;
        }>;
        if (rows[0]?.config?.state) {
          const st = rows[0].config.state;
          return {
            postsAgendados: Array.isArray(st.postsAgendados)
              ? st.postsAgendados
              : [],
            smartLinks: st.smartLinks || padrao.smartLinks,
            concorrentes: Array.isArray(st.concorrentes)
              ? st.concorrentes
              : [],
            threadsInbox: Array.isArray(st.threadsInbox)
              ? st.threadsInbox
              : [],
          };
        }
      }
    } catch {
      // fallback local
    }
  }
  return padrao;
}

async function salvarEstadoMetricoolEmpresa(
  empresaId: string,
  state: MetricoolPersistedState
): Promise<boolean> {
  const creds = getSupabaseCreds();
  if (!creds) return false;

  try {
    const getRes = await fetch(
      `${creds.url}/rest/v1/integracoes?empresa_id=eq.${encodeURIComponent(
        empresaId
      )}&provedor=eq.metricool_state&select=id&limit=1`,
      {
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
        },
        cache: "no-store",
      }
    );
    if (!getRes.ok) return false;
    const rows = (await getRes.json()) as Array<{ id: string }>;
    const agora = new Date().toISOString();

    if (rows[0]?.id) {
      const patchRes = await fetch(
        `${creds.url}/rest/v1/integracoes?id=eq.${encodeURIComponent(
          rows[0].id
        )}`,
        {
          method: "PATCH",
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: { state, atualizado_em: agora },
            atualizado_em: agora,
          }),
          cache: "no-store",
        }
      );
      return patchRes.ok;
    } else {
      const postRes = await fetch(`${creds.url}/rest/v1/integracoes`, {
        method: "POST",
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          provedor: "metricool_state",
          chave_criptografada: "state",
          chave_mascarada: "metricool_state",
          ativa: true,
          config: { state, atualizado_em: agora },
          atualizado_em: agora,
        }),
        cache: "no-store",
      });
      return postRes.ok;
    }
  } catch {
    return false;
  }
}

/**
 * Conecta ao Meta Graph API (Instagram Business / Facebook Page) para validar o token,
 * descobrir a conta vinculada e puxar seguidores, posts e comentários reais da empresa!
 */
async function sincronizarDadosReaisMetaGraph(params: {
  provedor: "instagram" | "facebook";
  accessToken: string;
  accountIdInformado?: string;
}): Promise<{
  ok: boolean;
  config: IntegracaoEmpresaPublica["config"];
  comentariosReaisInbox: MetricoolPersistedState["threadsInbox"];
  error?: string;
}> {
  const { provedor, accessToken, accountIdInformado } = params;
  const cleanToken = accessToken.trim();
  const comentariosReaisInbox: MetricoolPersistedState["threadsInbox"] = [];

  try {
    if (provedor === "instagram") {
      let igUserId = (accountIdInformado || "").trim();

      // Se o usuário não informou o ID numérico do Instagram Business, descobre via /me/accounts
      if (!igUserId) {
        const accRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,followers_count,follows_count,media_count,profile_picture_url}&access_token=${encodeURIComponent(
            cleanToken
          )}`,
          { cache: "no-store" }
        );
        const accData = await accRes.json();
        if (!accRes.ok || accData.error) {
          return {
            ok: false,
            config: {},
            comentariosReaisInbox: [],
            error:
              accData?.error?.message ||
              "Token da Meta inválido ou sem permissão pages_show_list / instagram_basic.",
          };
        }
        const paginaComIg = (accData.data || []).find(
          (p: Record<string, unknown>) => p.instagram_business_account
        );
        if (!paginaComIg?.instagram_business_account?.id) {
          return {
            ok: false,
            config: {},
            comentariosReaisInbox: [],
            error:
              "Nenhuma conta Instagram Business vinculada às Páginas deste Token da Meta. Informe o Instagram Business Account ID ou vincule a página no Facebook Business.",
          };
        }
        igUserId = paginaComIg.instagram_business_account.id;
      }

      // Buscar dados reais da conta Instagram Business + últimas mídias e comentários reais
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(
          igUserId
        )}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count,media.limit(12){id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,comments.limit(10){id,text,username,timestamp}}&access_token=${encodeURIComponent(
          cleanToken
        )}`,
        { cache: "no-store" }
      );
      const igData = await igRes.json();
      if (!igRes.ok || igData.error) {
        return {
          ok: false,
          config: {},
          comentariosReaisInbox: [],
          error:
            igData?.error?.message ||
            "Falha ao consultar conta Instagram Business na Meta Graph API.",
        };
      }

      const postsReais = Array.isArray(igData.media?.data)
        ? igData.media.data.map((m: Record<string, unknown>) => {
            const commentsList = Array.isArray(
              (m.comments as { data?: unknown[] })?.data
            )
              ? ((m.comments as { data: Array<Record<string, unknown>> }).data)
              : [];
            for (const c of commentsList) {
              comentariosReaisInbox.push({
                id: `ig-comm-${String(c.id)}`,
                rede: "instagram",
                tipo: "comentario",
                status: "nao_resolvido",
                naoLida: true,
                autorNome: String(c.username || "Seguidor Instagram"),
                autorHandle: `@${String(c.username || "instagram")}`,
                autorAvatarBg: "#E1306C",
                pecaRelacionada: String(m.caption || "Post Instagram").slice(
                  0,
                  70
                ),
                permalinkPost: String(m.permalink || ""),
                ultimaMensagem: String(c.text || ""),
                horario: c.timestamp
                  ? new Date(String(c.timestamp)).toLocaleDateString("pt-BR")
                  : "Recente",
                mensagens: [
                  {
                    id: String(c.id),
                    remetente: "usuario",
                    texto: String(c.text || ""),
                    horario: c.timestamp
                      ? new Date(String(c.timestamp)).toLocaleTimeString(
                          "pt-BR",
                          { hour: "2-digit", minute: "2-digit" }
                        )
                      : "",
                  },
                ],
              });
            }
            return {
              id: String(m.id),
              caption: String(m.caption || ""),
              media_type: String(m.media_type || "IMAGE"),
              media_url: m.media_url ? String(m.media_url) : undefined,
              permalink: m.permalink ? String(m.permalink) : undefined,
              timestamp: m.timestamp ? String(m.timestamp) : undefined,
              like_count: Number(m.like_count || 0),
              comments_count: Number(m.comments_count || 0),
            };
          })
        : [];

      return {
        ok: true,
        config: {
          account_id: String(igData.id),
          handle: `@${String(igData.username || "")}`,
          nome_conta: String(igData.name || igData.username || "Instagram"),
          avatar_url: igData.profile_picture_url
            ? String(igData.profile_picture_url)
            : undefined,
          seguidores: Number(igData.followers_count ?? 0),
          seguindo: Number(igData.follows_count ?? 0),
          total_publicacoes: Number(igData.media_count ?? postsReais.length),
          ultima_sincronizacao: new Date().toISOString(),
          posts_reais: postsReais,
        },
        comentariosReaisInbox,
      };
    }

    // Facebook Page
    let pageId = (accountIdInformado || "").trim();
    if (!pageId) {
      const accRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count&access_token=${encodeURIComponent(
          cleanToken
        )}`,
        { cache: "no-store" }
      );
      const accData = await accRes.json();
      if (!accRes.ok || accData.error || !accData.data?.[0]?.id) {
        return {
          ok: false,
          config: {},
          comentariosReaisInbox: [],
          error:
            accData?.error?.message ||
            "Nenhuma Página do Facebook encontrada para este Token.",
        };
      }
      pageId = String(accData.data[0].id);
    }

    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(
        pageId
      )}?fields=id,name,fan_count,followers_count&access_token=${encodeURIComponent(
        cleanToken
      )}`,
      { cache: "no-store" }
    );
    const fbData = await fbRes.json();
    if (!fbRes.ok || fbData.error) {
      return {
        ok: false,
        config: {},
        comentariosReaisInbox: [],
        error:
          fbData?.error?.message ||
          "Falha ao validar Página do Facebook na Meta Graph API.",
      };
    }

    return {
      ok: true,
      config: {
        page_id: String(fbData.id),
        nome_conta: String(fbData.name || "Facebook Page"),
        handle: String(fbData.name || ""),
        seguidores: Number(fbData.followers_count ?? fbData.fan_count ?? 0),
        ultima_sincronizacao: new Date().toISOString(),
      },
      comentariosReaisInbox: [],
    };
  } catch (err) {
    return {
      ok: false,
      config: {},
      comentariosReaisInbox: [],
      error:
        err instanceof Error
          ? err.message
          : "Erro de rede ao consultar Meta Graph API.",
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const marcaId =
      request.nextUrl.searchParams.get("marca_id") || MARCA_ELOSS_ID;
    const empresaId =
      request.nextUrl.searchParams.get("empresa_id") ||
      mapearMarcaParaEmpresaSupabaseId(marcaId);

    let db = readMotorDb();
    if (empresaId === EMPRESA_ELOSS_SUPABASE_ID) {
      db = await sincronizarDemandasComSupabase(db, empresaId);
    }

    const [empresasSupabase, { publicas: integracoesEmpresa }] =
      await Promise.all([
        listarEmpresasSupabase(),
        listarIntegracoesEmpresaSupabase(empresaId),
      ]);

    const empresaAtual = empresasSupabase.find((e) => e.id === empresaId);
    const state = await lerEstadoMetricoolEmpresa(
      empresaId,
      empresaAtual?.nome || "Empresa"
    );

    return Response.json(
      {
        ok: true,
        empresa_id: empresaId,
        empresas_supabase: empresasSupabase,
        integracoes_empresa: integracoesEmpresa,
        state,
        total_demandas_supabase: db.demandas.filter(
          (d) => d.marca_id === marcaId
        ).length,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro ao carregar dados do Metricool Suite.",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { acao, marca_id } = body;
    const empresaId =
      body.empresa_id || mapearMarcaParaEmpresaSupabaseId(marca_id || "");

    const creds = getSupabaseCreds();

    // ========================================================================
    // 1. CRIAR NOVA EMPRESA / CLIENTE NO SUPABASE (MULTI-TENANT REAL)
    // ========================================================================
    if (acao === "criar_nova_empresa") {
      if (!creds) {
        return Response.json(
          { error: "Supabase não configurado no servidor." },
          { status: 500 }
        );
      }
      const nome = String(body.nome || "").trim();
      const siteUrl = String(body.site_url || "").trim();
      const segmento = String(body.segmento || "Operação B2B").trim();
      if (!nome) {
        return Response.json(
          { error: "Informe o nome da nova empresa/cliente." },
          { status: 400 }
        );
      }

      const novaId = crypto.randomUUID();
      const res = await fetch(`${creds.url}/rest/v1/empresas`, {
        method: "POST",
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id: novaId,
          nome,
          organizacao_id: ORGANIZACAO_PADRAO_ID,
          ativa: true,
          site_url: siteUrl || null,
          segmento,
          canais_ativos: ["instagram", "blog"],
        }),
      });
      if (!res.ok) {
        const errTxt = await res.text();
        return Response.json(
          { error: `Erro ao criar empresa no Supabase: ${errTxt}` },
          { status: 400 }
        );
      }
      const criadas = await res.json();
      const emp = criadas[0];

      // Também registra na lista local de marcas do Motor para aparecer no seletor global
      const db = readMotorDb();
      const slug = nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!db.marcas.some((m) => m.id === emp.id)) {
        db.marcas.push({
          id: emp.id,
          slug,
          nome: emp.nome,
          tipo_marca: "cliente",
          fonte_conhecimento: "supabase",
          config_fonte: {
            tabela: "empresas + integracoes (Supabase)",
            empresa_id_supabase: emp.id,
            modo: "ao_vivo",
          },
          ativa: true,
          criado_em: emp.criado_em || new Date().toISOString(),
          atualizado_em: emp.atualizado_em || new Date().toISOString(),
        });
        writeMotorDb(db);
      }

      return Response.json({ ok: true, empresa: emp }, { status: 201 });
    }

    // ========================================================================
    // 2. CONECTAR E VALIDAR CREDENCIAL INDIVIDUALIZADA POR EMPRESA (SUPABASE integracoes)
    // ========================================================================
    if (acao === "conectar_integracao_empresa") {
      if (!creds) {
        return Response.json(
          { error: "Supabase não configurado no servidor." },
          { status: 500 }
        );
      }

      const provedor = String(body.provedor || "").trim().toLowerCase();
      const tokenOuChave = String(body.token || "").trim();
      const accountId = String(body.account_id || "").trim();
      const handleInformado = String(body.handle || "").trim();
      const siteUrl = String(body.site_url || "").trim();
      const usuario = String(body.usuario || "").trim();

      if (!provedor || !tokenOuChave) {
        return Response.json(
          {
            error:
              "Informe o provedor e o Token/Chave de acesso oficial desta empresa.",
          },
          { status: 400 }
        );
      }

      let configFinal: IntegracaoEmpresaPublica["config"] = {
        handle: handleInformado || undefined,
        account_id: accountId || undefined,
        site_url: siteUrl || undefined,
        usuario: usuario || undefined,
        ultima_sincronizacao: new Date().toISOString(),
      };

      const state = await lerEstadoMetricoolEmpresa(empresaId);

      // Se for Instagram ou Facebook, valida de verdade na Meta Graph API e já puxa métricas, posts e comentários reais!
      if (provedor === "instagram" || provedor === "facebook") {
        const syncMeta = await sincronizarDadosReaisMetaGraph({
          provedor,
          accessToken: tokenOuChave,
          accountIdInformado: accountId,
        });
        if (!syncMeta.ok) {
          return Response.json(
            {
              error: `Falha na validação com a API oficial da Meta (${provedor}): ${syncMeta.error}`,
            },
            { status: 400 }
          );
        }
        configFinal = {
          ...configFinal,
          ...syncMeta.config,
        };
        if (syncMeta.comentariosReaisInbox.length > 0) {
          const idsNovos = new Set(
            syncMeta.comentariosReaisInbox.map((c) => c.id)
          );
          state.threadsInbox = [
            ...syncMeta.comentariosReaisInbox,
            ...state.threadsInbox.filter((t) => !idsNovos.has(t.id)),
          ];
          await salvarEstadoMetricoolEmpresa(empresaId, state);
        }
      }

      const chaveCriptografada = criptografarChave(tokenOuChave);
      const chaveMascarada = mascararChave(tokenOuChave);
      const agora = new Date().toISOString();

      // Verifica se já existe linha para (empresa_id, provedor)
      const checkRes = await fetch(
        `${creds.url}/rest/v1/integracoes?empresa_id=eq.${encodeURIComponent(
          empresaId
        )}&provedor=eq.${encodeURIComponent(provedor)}&select=id&limit=1`,
        {
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
          },
          cache: "no-store",
        }
      );
      const existentes = checkRes.ok
        ? ((await checkRes.json()) as Array<{ id: string }>)
        : [];

      if (existentes[0]?.id) {
        await fetch(
          `${creds.url}/rest/v1/integracoes?id=eq.${encodeURIComponent(
            existentes[0].id
          )}`,
          {
            method: "PATCH",
            headers: {
              apikey: creds.key,
              Authorization: `Bearer ${creds.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chave_criptografada: chaveCriptografada,
              chave_mascarada: chaveMascarada,
              ativa: true,
              config: configFinal,
              atualizado_em: agora,
            }),
          }
        );
      } else {
        await fetch(`${creds.url}/rest/v1/integracoes`, {
          method: "POST",
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            empresa_id: empresaId,
            provedor,
            chave_criptografada: chaveCriptografada,
            chave_mascarada: chaveMascarada,
            ativa: true,
            config: configFinal,
            atualizado_em: agora,
          }),
        });
      }

      const { publicas } = await listarIntegracoesEmpresaSupabase(empresaId);
      return Response.json(
        {
          ok: true,
          integracoes_empresa: publicas,
          state,
        },
        { status: 200 }
      );
    }

    // ========================================================================
    // 3. SINCRONIZAR NOVAMENTE DADOS REAIS DE UMA REDE JÁ CONECTADA
    // ========================================================================
    if (acao === "sincronizar_rede_conectada") {
      const provedor = String(body.provedor || "instagram")
        .trim()
        .toLowerCase();
      const { rawRows } = await listarIntegracoesEmpresaSupabase(empresaId);
      const row = rawRows.find((r) => r.provedor === provedor && r.ativa);
      if (!row) {
        return Response.json(
          {
            error: `A rede ${provedor} não está conectada para esta empresa.`,
          },
          { status: 404 }
        );
      }
      const tokenDec = descriptografarChave(row.chave_criptografada);
      if (!tokenDec) {
        return Response.json(
          {
            error:
              "Não foi possível descriptografar o token salvo. Reconecte a credencial.",
          },
          { status: 400 }
        );
      }

      if (provedor === "instagram" || provedor === "facebook") {
        const accountId = String(
          (row.config as Record<string, unknown>)?.account_id ||
            (row.config as Record<string, unknown>)?.page_id ||
            ""
        );
        const syncMeta = await sincronizarDadosReaisMetaGraph({
          provedor,
          accessToken: tokenDec,
          accountIdInformado: accountId,
        });
        if (!syncMeta.ok) {
          return Response.json({ error: syncMeta.error }, { status: 400 });
        }

        if (creds) {
          await fetch(
            `${creds.url}/rest/v1/integracoes?id=eq.${encodeURIComponent(
              row.id
            )}`,
            {
              method: "PATCH",
              headers: {
                apikey: creds.key,
                Authorization: `Bearer ${creds.key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                config: { ...(row.config || {}), ...syncMeta.config },
                atualizado_em: new Date().toISOString(),
              }),
            }
          );
        }

        const state = await lerEstadoMetricoolEmpresa(empresaId);
        if (syncMeta.comentariosReaisInbox.length > 0) {
          const idsNovos = new Set(
            syncMeta.comentariosReaisInbox.map((c) => c.id)
          );
          state.threadsInbox = [
            ...syncMeta.comentariosReaisInbox,
            ...state.threadsInbox.filter((t) => !idsNovos.has(t.id)),
          ];
          await salvarEstadoMetricoolEmpresa(empresaId, state);
        }

        const { publicas } = await listarIntegracoesEmpresaSupabase(empresaId);
        return Response.json(
          { ok: true, integracoes_empresa: publicas, state },
          { status: 200 }
        );
      }

      return Response.json({ ok: true }, { status: 200 });
    }

    // ========================================================================
    // 4. DESCONECTAR UMA INTEGRAÇÃO DA EMPRESA
    // ========================================================================
    if (acao === "desconectar_integracao_empresa") {
      if (!creds) {
        return Response.json(
          { error: "Supabase não configurado." },
          { status: 500 }
        );
      }
      const provedor = String(body.provedor || "").trim().toLowerCase();
      await fetch(
        `${creds.url}/rest/v1/integracoes?empresa_id=eq.${encodeURIComponent(
          empresaId
        )}&provedor=eq.${encodeURIComponent(provedor)}`,
        {
          method: "DELETE",
          headers: {
            apikey: creds.key,
            Authorization: `Bearer ${creds.key}`,
          },
        }
      );
      const { publicas } = await listarIntegracoesEmpresaSupabase(empresaId);
      return Response.json(
        { ok: true, integracoes_empresa: publicas },
        { status: 200 }
      );
    }

    // ========================================================================
    // 5. SALVAR AGENDAMENTOS, SMARTLINKS, CONCORRENTES E INBOX POR EMPRESA
    // ========================================================================
    const state = await lerEstadoMetricoolEmpresa(empresaId);

    if (acao === "salvar_post_calendario") {
      const post = body.post;
      if (!post || !post.id) {
        return Response.json(
          { error: "Dados da publicação inválidos." },
          { status: 400 }
        );
      }
      const atualizado = {
        ...post,
        empresaId,
        atualizadoEm: new Date().toISOString(),
      };
      state.postsAgendados = [
        atualizado,
        ...state.postsAgendados.filter((p) => p.id !== post.id),
      ];
      const persistidoSupabase = await salvarEstadoMetricoolEmpresa(
        empresaId,
        state
      );
      return Response.json(
        {
          ok: true,
          persistido_supabase: persistidoSupabase,
          post: atualizado,
          state,
        },
        { status: 200 }
      );
    }

    if (acao === "salvar_smartlinks") {
      state.smartLinks = {
        titulo: body.titulo || state.smartLinks.titulo,
        bio: body.bio || state.smartLinks.bio,
        botoes: Array.isArray(body.botoes)
          ? body.botoes
          : state.smartLinks.botoes,
      };
      const persistidoSupabase = await salvarEstadoMetricoolEmpresa(
        empresaId,
        state
      );
      return Response.json(
        { ok: true, persistido_supabase: persistidoSupabase, state },
        { status: 200 }
      );
    }

    if (acao === "salvar_concorrentes") {
      state.concorrentes = Array.isArray(body.concorrentes)
        ? body.concorrentes
        : [];
      const persistidoSupabase = await salvarEstadoMetricoolEmpresa(
        empresaId,
        state
      );
      return Response.json(
        { ok: true, persistido_supabase: persistidoSupabase, state },
        { status: 200 }
      );
    }

    if (acao === "salvar_threads_inbox") {
      state.threadsInbox = Array.isArray(body.threads) ? body.threads : [];
      const persistidoSupabase = await salvarEstadoMetricoolEmpresa(
        empresaId,
        state
      );
      return Response.json(
        { ok: true, persistido_supabase: persistidoSupabase, state },
        { status: 200 }
      );
    }

    return Response.json(
      { error: "Ação Metricool desconhecida." },
      { status: 400 }
    );
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro ao processar operação no Metricool Suite.",
      },
      { status: 400 }
    );
  }
}
