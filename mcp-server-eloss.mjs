#!/usr/bin/env node
/** Local stdio bridge. For ChatGPT web, connect through an authenticated HTTPS
 * endpoint (or private tunnel); this command alone does not install a ChatGPT plugin. */
import readline from "node:readline";
import { pathToFileURL } from "node:url";

export async function forwardMessage(line, {
  url = process.env.ELOSS_MOTOR_URL || "http://127.0.0.1:3005/api/mcp-gpt",
  token = process.env.ELOSS_MCP_TOKEN || process.env.ELOSS_MCP_API_KEY || "",
  fetchImpl = fetch,
} = {}) {
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return { jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido." } };
  }
  if (!req || Array.isArray(req) || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return { jsonrpc: "2.0", id: req?.id ?? null,
      error: { code: -32600, message: "Requisição MCP inválida." } };
  }
  // Never forward arbitrary legacy actions to the local API.
  const notification = !Object.hasOwn(req, "id");
  if (notification) return null;
  const headers = { "Content-Type": "application/json" };
  if (typeof token === "string" && token.trim()) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Motor respondeu HTTP ${res.status}.`);
    const data = await res.json();
    if (data?.jsonrpc !== "2.0" || data.id !== req.id || (!data.result && !data.error)) {
      throw new Error("Resposta MCP inválida recebida do Motor.");
    }
    return data;
  } catch (err) {
    return { jsonrpc: "2.0", id: req.id, error: {
      code: -32603,
      message: err instanceof Error ? err.message : "Falha ao acessar o Motor local.",
    } };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  // Serialize calls so initialization and writes cannot overtake one another.
  for await (const line of rl) {
    if (!line.trim()) continue;
    const response = await forwardMessage(line);
    if (response !== null) process.stdout.write(JSON.stringify(response) + "\n");
  }
}
