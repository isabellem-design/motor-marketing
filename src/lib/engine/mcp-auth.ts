import crypto from "node:crypto";
import { MARCA_ELOSS_ID } from "@/lib/store/motor-db";

export const EMPRESA_ELOSS_SUPABASE_ID = "00000000-0000-0000-0000-000000000001";

export interface McpAuthResult {
  ok: boolean;
  status: number;
  empresaId: string;
  marcaId: string;
  error?: string;
}

interface CachedHashEntry {
  sha256Hex: string | null;
  empresaId: string;
  expiresAt: number;
}

let cachedSupabaseHash: CachedHashEntry | null = null;

function sha256Buffer(input: string): Buffer {
  return crypto.createHash("sha256").update(input, "utf8").digest();
}

function safeEqualHexOrString(candidateToken: string, expectedToken: string): boolean {
  const a = sha256Buffer(candidateToken);
  const b = sha256Buffer(expectedToken);
  return crypto.timingSafeEqual(a, b);
}

function safeEqualSha256Hex(candidateToken: string, expectedSha256Hex: string): boolean {
  const normalizedHex = expectedSha256Hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalizedHex)) {
    return false;
  }
  const candidateHash = sha256Buffer(candidateToken);
  const expectedHash = Buffer.from(normalizedHex, "hex");
  if (candidateHash.length !== expectedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateHash, expectedHash);
}

export function extrairTokenMcp(request: Request): string | null {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const customHeader =
    request.headers.get("x-eloss-mcp-token") ||
    request.headers.get("x-api-key") ||
    "";
  if (customHeader.trim()) {
    return customHeader.trim();
  }

  return null;
}

async function obterHashMcpDoSupabase(): Promise<CachedHashEntry | null> {
  const now = Date.now();
  if (cachedSupabaseHash && cachedSupabaseHash.expiresAt > now) {
    return cachedSupabaseHash;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    const url = `${supabaseUrl}/rest/v1/integracoes?empresa_id=eq.${EMPRESA_ELOSS_SUPABASE_ID}&select=empresa_id,config&limit=5`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const rows = (await res.json()) as Array<{
      empresa_id: string;
      config?: { mcp_token_sha256?: string; mcp_empresa_id?: string } | null;
    }>;

    for (const row of rows) {
      const hash = row.config?.mcp_token_sha256;
      if (typeof hash === "string" && /^[0-9a-f]{64}$/i.test(hash.trim())) {
        cachedSupabaseHash = {
          sha256Hex: hash.trim().toLowerCase(),
          empresaId: row.empresa_id || EMPRESA_ELOSS_SUPABASE_ID,
          expiresAt: now + 60_000,
        };
        return cachedSupabaseHash;
      }
    }
  } catch {
    // Ignora falha de rede transitória ao consultar hash
  }

  return null;
}

/**
 * Valida a autenticação da requisição MCP / ChatGPT Action.
 * Aceita Authorization: Bearer <token> ou x-eloss-mcp-token.
 * Compara de forma segura contra ELOSS_MCP_TOKEN / ELOSS_MCP_API_KEY
 * ou contra o hash SHA-256 salvo em integracoes.config no Supabase da Eloss.
 */
export async function verificarAutenticacaoMcp(
  request: Request
): Promise<McpAuthResult> {
  const token = extrairTokenMcp(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      empresaId: EMPRESA_ELOSS_SUPABASE_ID,
      marcaId: MARCA_ELOSS_ID,
      error:
        "Não autorizado. Envie o cabeçalho 'Authorization: Bearer <ELOSS_MCP_TOKEN>'.",
    };
  }

  const envToken = (
    process.env.ELOSS_MCP_TOKEN ||
    process.env.ELOSS_MCP_API_KEY ||
    ""
  ).trim();
  const envTokenSha256 = (process.env.ELOSS_MCP_TOKEN_SHA256 || "").trim();

  if (envToken && safeEqualHexOrString(token, envToken)) {
    return {
      ok: true,
      status: 200,
      empresaId: EMPRESA_ELOSS_SUPABASE_ID,
      marcaId: MARCA_ELOSS_ID,
    };
  }

  if (envTokenSha256 && safeEqualSha256Hex(token, envTokenSha256)) {
    return {
      ok: true,
      status: 200,
      empresaId: EMPRESA_ELOSS_SUPABASE_ID,
      marcaId: MARCA_ELOSS_ID,
    };
  }

  const remoteHash = await obterHashMcpDoSupabase();
  if (
    remoteHash?.sha256Hex &&
    safeEqualSha256Hex(token, remoteHash.sha256Hex)
  ) {
    return {
      ok: true,
      status: 200,
      empresaId: remoteHash.empresaId || EMPRESA_ELOSS_SUPABASE_ID,
      marcaId: MARCA_ELOSS_ID,
    };
  }

  return {
    ok: false,
    status: 401,
    empresaId: EMPRESA_ELOSS_SUPABASE_ID,
    marcaId: MARCA_ELOSS_ID,
    error: "Credencial MCP inválida ou não autorizada para a empresa Eloss.",
  };
}
