#!/usr/bin/env node
/**
 * Servidor MCP (Model Context Protocol) Stdio do Motor de Marketing Eloss.
 * Encaminha chamadas MCP (initialize, tools/list, tools/call) para http://localhost:3005/api/mcp-gpt
 * permitindo que o ChatGPT (Developer Mode / Desktop) ou qualquer cliente MCP
 * leia a Matéria Âncora e atualize os 8 slides + prompts visuais diretamente no sistema sem gastar API.
 */
import readline from "node:readline";

const MOTOR_URL = process.env.ELOSS_MOTOR_URL || "http://localhost:3005/api/mcp-gpt";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const req = JSON.parse(trimmed);
    const res = await fetch(MOTOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    process.stdout.write(JSON.stringify(data) + "\n");
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : "Erro MCP Eloss",
        },
      }) + "\n"
    );
  }
});
