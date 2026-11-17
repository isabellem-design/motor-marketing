import { NextRequest } from "next/server";
import { EMPRESA_ELOSS_SUPABASE_ID } from "@/lib/engine/mcp-auth";
import { escanearCentralMetaEVincularPorNome } from "@/lib/engine/meta-business-central";

export const dynamic = "force-dynamic";

async function obterConfigMetaAppSupabase(): Promise<{
  appId: string;
  appSecret: string;
} | null> {
  const envAppId = (
    process.env.NEXT_PUBLIC_META_APP_ID ||
    process.env.META_APP_ID ||
    ""
  ).trim();
  const envSecret = (process.env.META_APP_SECRET || "").trim();
  if (envAppId && envSecret) {
    return { appId: envAppId, appSecret: envSecret };
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/integracoes?empresa_id=eq.${EMPRESA_ELOSS_SUPABASE_ID}&provedor=eq.meta_business_central&select=config&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      config?: { meta_app_id?: string; meta_app_secret?: string } | null;
    }>;
    const cfg = rows[0]?.config;
    if (cfg?.meta_app_id && cfg?.meta_app_secret) {
      return {
        appId: String(cfg.meta_app_id).trim(),
        appSecret: String(cfg.meta_app_secret).trim(),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || "";
  const stateParam = request.nextUrl.searchParams.get("state") || "";
  const reqUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const baseUrl =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : reqUrl.origin;

  let redirectUri = `${baseUrl}/api/metricool/oauth/meta/callback`;
  try {
    if (stateParam) {
      const parsed = JSON.parse(
        Buffer.from(stateParam, "base64url").toString("utf8")
      );
      if (parsed.redirectUri) redirectUri = parsed.redirectUri;
    }
  } catch {
    // ignore
  }

  const metaApp = await obterConfigMetaAppSupabase();
  if (!code || !metaApp) {
    return Response.redirect(`${baseUrl}/metricool?meta_oauth=erro`);
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${encodeURIComponent(metaApp.appId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${encodeURIComponent(metaApp.appSecret)}` +
        `&code=${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return Response.redirect(`${baseUrl}/metricool?meta_oauth=erro_token`);
    }

    // Troca por long-lived token (60 dias)
    let accessTokenFinal = String(tokenData.access_token);
    try {
      const longRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
          `grant_type=fb_exchange_token` +
          `&client_id=${encodeURIComponent(metaApp.appId)}` +
          `&client_secret=${encodeURIComponent(metaApp.appSecret)}` +
          `&fb_exchange_token=${encodeURIComponent(accessTokenFinal)}`,
        { cache: "no-store" }
      );
      const longData = await longRes.json();
      if (longRes.ok && longData.access_token) {
        accessTokenFinal = String(longData.access_token);
      }
    } catch {
      // mantém token padrão
    }

    // Escanear Central Meta Business e vincular todas as empresas automaticamente pelo nome!
    await escanearCentralMetaEVincularPorNome({
      userAccessToken: accessTokenFinal,
      metaAppId: metaApp.appId,
      metaAppSecret: metaApp.appSecret,
    });

    return Response.redirect(
      `${baseUrl}/metricool?meta_oauth=conectado_por_nome`
    );
  } catch {
    return Response.redirect(`${baseUrl}/metricool?meta_oauth=erro`);
  }
}
