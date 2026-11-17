import crypto from "node:crypto";
import { EMPRESA_ELOSS_SUPABASE_ID } from "@/lib/engine/mcp-auth";

export interface ContaDescobertaMetaBusiness {
  page_id: string;
  page_name: string;
  page_followers?: number;
  page_token?: string;
  ig_id?: string;
  ig_username?: string;
  ig_name?: string;
  ig_followers?: number;
  ig_media_count?: number;
  ig_avatar_url?: string;
}

export interface ContaAnuncioMetaBusiness {
  ad_account_id: string;
  name: string;
  business_name?: string;
}

export interface ResultadoVarreduraCentralMeta {
  ok: boolean;
  usuario_meta_nome?: string;
  usuario_meta_id?: string;
  contas_paginas_e_instagram: ContaDescobertaMetaBusiness[];
  contas_anuncios: ContaAnuncioMetaBusiness[];
  vinculos_automaticos_realizados: Array<{
    empresa_id: string;
    empresa_nome: string;
    page_name?: string;
    ig_username?: string;
    ad_account_name?: string;
  }>;
  error?: string;
}

function normalizarTextoComparacao(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function pontuarSimilaridadeNome(
  nomeEmpresa: string,
  candidatoNome: string,
  candidatoUsername?: string
): number {
  const emp = normalizarTextoComparacao(nomeEmpresa);
  if (!emp) return 0;

  // Palavras significativas do nome da empresa (ex: "trampo" de "Trampô Space")
  const tokensEmpresa = (nomeEmpresa || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && t !== "space" && t !== "oficial");

  const cand1 = normalizarTextoComparacao(candidatoNome);
  const cand2 = normalizarTextoComparacao(candidatoUsername || "");

  if (cand1 === emp || cand2 === emp) return 100;
  if (cand1.includes(emp) || cand2.includes(emp)) return 90;
  if (emp.includes(cand1) && cand1.length >= 4) return 85;
  if (emp.includes(cand2) && cand2.length >= 4) return 85;

  for (const tok of tokensEmpresa) {
    if (cand1.includes(tok) || cand2.includes(tok)) {
      return 75;
    }
  }

  return 0;
}

function mascararToken(raw: string): string {
  const clean = raw.trim();
  if (clean.length <= 8) return "••••••••";
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

function criptografarToken(raw: string): string {
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
      // fallback
    }
  }
  return `b64:${Buffer.from(raw, "utf8").toString("base64")}`;
}

export function descriptografarToken(stored: string): string {
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

async function upsertIntegracaoSupabase(params: {
  supabaseUrl: string;
  supabaseKey: string;
  empresaId: string;
  provedor: string;
  tokenRaw: string;
  config: Record<string, unknown>;
}) {
  const { supabaseUrl, supabaseKey, empresaId, provedor, tokenRaw, config } =
    params;
  const checkRes = await fetch(
    `${supabaseUrl}/rest/v1/integracoes?empresa_id=eq.${encodeURIComponent(
      empresaId
    )}&provedor=eq.${encodeURIComponent(provedor)}&select=id&limit=1`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    }
  );
  const rows = checkRes.ok
    ? ((await checkRes.json()) as Array<{ id: string }>)
    : [];
  const agora = new Date().toISOString();
  const payload = {
    empresa_id: empresaId,
    provedor,
    chave_criptografada: criptografarToken(tokenRaw),
    chave_mascarada: mascararToken(tokenRaw),
    ativa: true,
    config,
    atualizado_em: agora,
  };

  if (rows[0]?.id) {
    await fetch(
      `${supabaseUrl}/rest/v1/integracoes?id=eq.${encodeURIComponent(
        rows[0].id
      )}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  } else {
    await fetch(`${supabaseUrl}/rest/v1/integracoes`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
}

/**
 * Varre a Conta Business da Meta (Central de Contas) usando o login/token da usuária,
 * descobre todas as Páginas do Facebook, Perfis do Instagram Business e Contas de Anúncios,
 * e IDENTIFICA AUTOMATICAMENTE PELO NOME a qual empresa do sistema cada conta pertence!
 */
export async function escanearCentralMetaEVincularPorNome(params: {
  userAccessToken: string;
  metaAppId?: string;
  metaAppSecret?: string;
}): Promise<ResultadoVarreduraCentralMeta> {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !supabaseKey) {
    return {
      ok: false,
      contas_paginas_e_instagram: [],
      contas_anuncios: [],
      vinculos_automaticos_realizados: [],
      error: "Supabase não configurado no servidor.",
    };
  }

  const cleanToken = params.userAccessToken.trim();

  try {
    // 1. Verificar usuário logado na Meta + Páginas/Instagrams + Contas de Anúncio
    const [meRes, pagesRes, adsRes, empresasRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(
          cleanToken
        )}`,
        { cache: "no-store" }
      ),
      fetch(
        `https://graph.facebook.com/v21.0/me/accounts?limit=100&fields=id,name,access_token,fan_count,followers_count,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${encodeURIComponent(
          cleanToken
        )}`,
        { cache: "no-store" }
      ),
      fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?limit=100&fields=id,name,business_name,account_status&access_token=${encodeURIComponent(
          cleanToken
        )}`,
        { cache: "no-store" }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/empresas?ativa=eq.true&select=id,nome`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: "no-store",
        }
      ),
    ]);

    const meData = await meRes.json();
    if (!meRes.ok || meData.error) {
      return {
        ok: false,
        contas_paginas_e_instagram: [],
        contas_anuncios: [],
        vinculos_automaticos_realizados: [],
        error:
          meData?.error?.message ||
          "Não foi possível autenticar na Central Business da Meta.",
      };
    }

    const pagesData = pagesRes.ok ? await pagesRes.json() : { data: [] };
    const adsData = adsRes.ok ? await adsRes.json() : { data: [] };
    const empresas = empresasRes.ok
      ? ((await empresasRes.json()) as Array<{ id: string; nome: string }>)
      : [];

    const contasPaginas: ContaDescobertaMetaBusiness[] = (
      pagesData.data || []
    ).map((p: Record<string, unknown>) => {
      const ig = p.instagram_business_account as
        | Record<string, unknown>
        | undefined;
      return {
        page_id: String(p.id),
        page_name: String(p.name || ""),
        page_followers: Number(p.followers_count ?? p.fan_count ?? 0),
        page_token: p.access_token ? String(p.access_token) : cleanToken,
        ig_id: ig?.id ? String(ig.id) : undefined,
        ig_username: ig?.username ? `@${String(ig.username)}` : undefined,
        ig_name: ig?.name ? String(ig.name) : undefined,
        ig_followers:
          ig?.followers_count !== undefined
            ? Number(ig.followers_count)
            : undefined,
        ig_media_count:
          ig?.media_count !== undefined ? Number(ig.media_count) : undefined,
        ig_avatar_url: ig?.profile_picture_url
          ? String(ig.profile_picture_url)
          : undefined,
      };
    });

    const contasAnuncios: ContaAnuncioMetaBusiness[] = (
      adsData.data || []
    ).map((a: Record<string, unknown>) => ({
      ad_account_id: String(a.id),
      name: String(a.name || a.id),
      business_name: a.business_name ? String(a.business_name) : undefined,
    }));

    // 2. Salvar o catálogo da Central Meta Business no registro central para que todas as empresas possam usar
    await upsertIntegracaoSupabase({
      supabaseUrl,
      supabaseKey,
      empresaId: EMPRESA_ELOSS_SUPABASE_ID,
      provedor: "meta_business_central",
      tokenRaw: cleanToken,
      config: {
        usuario_meta_id: String(meData.id),
        usuario_meta_nome: String(meData.name || "Conta Business Meta"),
        contas_paginas_e_instagram: contasPaginas.map((c) => ({
          ...c,
          page_token: undefined, // não expor token no config público
        })),
        contas_anuncios: contasAnuncios,
        ultima_varredura: new Date().toISOString(),
        ...(params.metaAppId ? { meta_app_id: params.metaAppId } : {}),
        ...(params.metaAppSecret
          ? { meta_app_secret: params.metaAppSecret }
          : {}),
      },
    });

    // 3. IDENTIFICAÇÃO AUTOMÁTICA PELO NOME DA EMPRESA!
    const vinculosRealizados: ResultadoVarreduraCentralMeta["vinculos_automaticos_realizados"] =
      [];

    for (const emp of empresas) {
      let melhorPagina: ContaDescobertaMetaBusiness | null = null;
      let maiorScorePagina = 0;

      for (const conta of contasPaginas) {
        const scorePag = pontuarSimilaridadeNome(
          emp.nome,
          conta.page_name,
          conta.ig_username
        );
        const scoreIg = conta.ig_name
          ? pontuarSimilaridadeNome(
              emp.nome,
              conta.ig_name,
              conta.ig_username
            )
          : 0;
        const score = Math.max(scorePag, scoreIg);
        if (score >= 75 && score > maiorScorePagina) {
          maiorScorePagina = score;
          melhorPagina = conta;
        }
      }

      let melhorAnuncio: ContaAnuncioMetaBusiness | null = null;
      let maiorScoreAnuncio = 0;
      for (const ad of contasAnuncios) {
        const score = pontuarSimilaridadeNome(
          emp.nome,
          ad.name,
          ad.business_name
        );
        if (score >= 75 && score > maiorScoreAnuncio) {
          maiorScoreAnuncio = score;
          melhorAnuncio = ad;
        }
      }

      if (melhorPagina) {
        const tokenDaPagina = melhorPagina.page_token || cleanToken;
        // Conecta automaticamente a Página do Facebook na empresa correspondente
        await upsertIntegracaoSupabase({
          supabaseUrl,
          supabaseKey,
          empresaId: emp.id,
          provedor: "facebook",
          tokenRaw: tokenDaPagina,
          config: {
            page_id: melhorPagina.page_id,
            nome_conta: melhorPagina.page_name,
            handle: melhorPagina.page_name,
            seguidores: melhorPagina.page_followers,
            vinculado_automaticamente_por_nome: true,
            ultima_sincronizacao: new Date().toISOString(),
          },
        });

        // Se a Página possui Instagram Business vinculado, conecta automaticamente o Instagram também!
        if (melhorPagina.ig_id) {
          await upsertIntegracaoSupabase({
            supabaseUrl,
            supabaseKey,
            empresaId: emp.id,
            provedor: "instagram",
            tokenRaw: tokenDaPagina,
            config: {
              account_id: melhorPagina.ig_id,
              handle: melhorPagina.ig_username || melhorPagina.page_name,
              nome_conta: melhorPagina.ig_name || melhorPagina.page_name,
              avatar_url: melhorPagina.ig_avatar_url,
              seguidores: melhorPagina.ig_followers,
              total_publicacoes: melhorPagina.ig_media_count,
              vinculado_automaticamente_por_nome: true,
              ultima_sincronizacao: new Date().toISOString(),
            },
          });
        }
      }

      if (melhorAnuncio) {
        await upsertIntegracaoSupabase({
          supabaseUrl,
          supabaseKey,
          empresaId: emp.id,
          provedor: "meta_ads",
          tokenRaw: cleanToken,
          config: {
            account_id: melhorAnuncio.ad_account_id,
            nome_conta: melhorAnuncio.name,
            handle: melhorAnuncio.name,
            vinculado_automaticamente_por_nome: true,
            ultima_sincronizacao: new Date().toISOString(),
          },
        });
      }

      if (melhorPagina || melhorAnuncio) {
        vinculosRealizados.push({
          empresa_id: emp.id,
          empresa_nome: emp.nome,
          page_name: melhorPagina?.page_name,
          ig_username: melhorPagina?.ig_username,
          ad_account_name: melhorAnuncio?.name,
        });
      }
    }

    return {
      ok: true,
      usuario_meta_id: String(meData.id),
      usuario_meta_nome: String(meData.name || ""),
      contas_paginas_e_instagram: contasPaginas.map((c) => ({
        ...c,
        page_token: undefined,
      })),
      contas_anuncios: contasAnuncios,
      vinculos_automaticos_realizados: vinculosRealizados,
    };
  } catch (err) {
    return {
      ok: false,
      contas_paginas_e_instagram: [],
      contas_anuncios: [],
      vinculos_automaticos_realizados: [],
      error:
        err instanceof Error
          ? err.message
          : "Erro ao consultar Central Business da Meta.",
    };
  }
}
