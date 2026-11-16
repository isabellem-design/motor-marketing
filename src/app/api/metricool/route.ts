import { NextRequest } from "next/server";
import { EMPRESA_ELOSS_SUPABASE_ID } from "@/lib/engine/mcp-auth";
import { MARCA_ELOSS_ID, readMotorDb, writeMotorDb } from "@/lib/store/motor-db";
import { sincronizarDemandasComSupabase } from "@/lib/store/supabase-pecas";

export const dynamic = "force-dynamic";

export interface MetricoolPersistedState {
  postsAgendados: Array<{
    id: string;
    marcaId: string;
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
    atualizadoEm: string;
  }>;
  smartLinksPorMarca: Record<
    string,
    {
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
    }
  >;
  concorrentesPorMarca: Record<
    string,
    Array<{
      id: string;
      nome: string;
      handle: string;
      rede: "instagram" | "linkedin" | "facebook";
      seguidores: number;
      crescimentoPct: number;
      publicacoesPeriodo: number;
      engajamentoPct: number;
      mediaInteracoes: number;
    }>
  >;
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

const DEFAULT_METRICOOL_STATE: MetricoolPersistedState = {
  postsAgendados: [],
  smartLinksPorMarca: {},
  concorrentesPorMarca: {},
  threadsInbox: [],
};

async function lerEstadoMetricoolSupabase(): Promise<MetricoolPersistedState> {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/integracoes?empresa_id=eq.${EMPRESA_ELOSS_SUPABASE_ID}&select=id,config&limit=5`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id: string;
          config?: { metricool_state?: MetricoolPersistedState } | null;
        }>;
        for (const row of rows) {
          if (row.config?.metricool_state) {
            return {
              ...DEFAULT_METRICOOL_STATE,
              ...row.config.metricool_state,
            };
          }
        }
      }
    } catch {
      // fallback local
    }
  }

  const db = readMotorDb() as unknown as {
    metricool_state?: MetricoolPersistedState;
  };
  return db.metricool_state || DEFAULT_METRICOOL_STATE;
}

async function salvarEstadoMetricoolSupabase(
  novoEstado: MetricoolPersistedState
): Promise<boolean> {
  const db = readMotorDb() as unknown as Record<string, unknown>;
  db.metricool_state = novoEstado;
  writeMotorDb(db as unknown as ReturnType<typeof readMotorDb>);

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

  try {
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/integracoes?empresa_id=eq.${EMPRESA_ELOSS_SUPABASE_ID}&select=id,config&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      }
    );
    if (!getRes.ok) return false;
    const rows = (await getRes.json()) as Array<{
      id: string;
      config?: Record<string, unknown> | null;
    }>;
    const row = rows[0];
    if (!row) return false;

    const mergedConfig = {
      ...(row.config || {}),
      metricool_state: novoEstado,
      metricool_atualizado_em: new Date().toISOString(),
    };

    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/integracoes?id=eq.${encodeURIComponent(row.id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ config: mergedConfig }),
        cache: "no-store",
      }
    );
    return patchRes.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const marcaId =
      request.nextUrl.searchParams.get("marca_id") || MARCA_ELOSS_ID;
    let db = readMotorDb();
    if (marcaId === MARCA_ELOSS_ID) {
      db = await sincronizarDemandasComSupabase(db);
    }
    const state = await lerEstadoMetricoolSupabase();
    return Response.json(
      {
        ok: true,
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
    const { acao } = body;
    const state = await lerEstadoMetricoolSupabase();

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
        atualizadoEm: new Date().toISOString(),
      };
      state.postsAgendados = [
        atualizado,
        ...state.postsAgendados.filter((p) => p.id !== post.id),
      ];
      const persistidoSupabase = await salvarEstadoMetricoolSupabase(state);
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

    if (acao === "excluir_post_calendario") {
      const { post_id } = body;
      state.postsAgendados = state.postsAgendados.filter(
        (p) => p.id !== post_id
      );
      const persistidoSupabase = await salvarEstadoMetricoolSupabase(state);
      return Response.json(
        { ok: true, persistido_supabase: persistidoSupabase, state },
        { status: 200 }
      );
    }

    if (acao === "salvar_smartlinks") {
      const { marca_id, titulo, bio, botoes } = body;
      state.smartLinksPorMarca[marca_id || MARCA_ELOSS_ID] = {
        titulo,
        bio,
        botoes,
      };
      const persistidoSupabase = await salvarEstadoMetricoolSupabase(state);
      return Response.json(
        { ok: true, persistido_supabase: persistidoSupabase, state },
        { status: 200 }
      );
    }

    if (acao === "salvar_concorrentes") {
      const { marca_id, concorrentes } = body;
      state.concorrentesPorMarca[marca_id || MARCA_ELOSS_ID] = concorrentes;
      const persistidoSupabase = await salvarEstadoMetricoolSupabase(state);
      return Response.json(
        { ok: true, persistido_supabase: persistidoSupabase, state },
        { status: 200 }
      );
    }

    if (acao === "salvar_threads_inbox") {
      const { threads } = body;
      state.threadsInbox = threads;
      const persistidoSupabase = await salvarEstadoMetricoolSupabase(state);
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
            : "Erro ao salvar estado no Metricool Suite.",
      },
      { status: 400 }
    );
  }
}
