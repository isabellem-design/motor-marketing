import { NextRequest } from "next/server";
import { EMPRESA_ELOSS_SUPABASE_ID } from "@/lib/engine/mcp-auth";

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
  const marcaId = request.nextUrl.searchParams.get("marca_id") || "";
  const reqUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const baseUrl =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : reqUrl.origin;

  const metaApp = await obterConfigMetaAppSupabase();
  if (!metaApp?.appId) {
    return Response.redirect(
      `${baseUrl}/metricool?configurar_meta_central=1&marca_id=${encodeURIComponent(
        marcaId
      )}`
    );
  }

  const redirectUri = `${baseUrl}/api/metricool/oauth/meta/callback`;
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "ads_read",
    "business_management",
  ].join(",");

  const state = Buffer.from(
    JSON.stringify({ marcaId, redirectUri })
  ).toString("base64url");

  const oauthUrl =
    `https://www.facebook.com/v21.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(metaApp.appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}`;

  return Response.redirect(oauthUrl);
}
