import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ db: {} as any, write: vi.fn() }));
vi.mock("@/lib/store/motor-db", () => ({
  MARCA_ELOSS_ID: "11111111-1111-4111-8111-111111111101",
  TEMPLATE_REELS_SEMANAL_ID: "22222222-2222-4222-8222-222222222201",
  buildSixStepsForFormato: () => [],
  criarAdaptacoesPadraoParaTema: () => ({
    carrossel: {
      formato: "carrossel",
      nome_canal: "Carrossel Instagram",
      angulo_adaptado: "",
      proposito_no_canal: "",
      estrutura_sugerida: "",
      cta_especifico: "",
    },
  }),
  readMotorDb: () => structuredClone(store.db),
  writeMotorDb: (db: unknown) => {
    store.write(db);
    store.db = structuredClone(db);
  },
}));
vi.mock("@/lib/engine/ai-malha-gpt", () => ({
  IMAGENS_REAIS_SUPABASE_POR_TEMA: {},
  rodarChecagensMalha: () => [],
}));

import { GET, POST } from "../src/app/api/mcp-gpt/route";

const TEST_TOKEN = "eloss_mcp_test_secret_token";
const authHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TEST_TOKEN}`,
};

const rpc = (method: string, params = {}, id: string | number = 42) =>
  POST(
    new Request("http://localhost/api/mcp-gpt", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    })
  );

beforeEach(() => {
  process.env.ELOSS_MCP_TOKEN = TEST_TOKEN;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  store.write.mockClear();
  store.db = {
    demandas: [
      {
        id: "draft-1",
        titulo: "Teste",
        marca_id: "eloss",
        formato_canal: "carrossel",
        atualizado_em: "2026-11-06T12:00:00.000Z",
        briefing: {},
        conteudo_estruturado: {
          slides: [
            {
              ordem: 1,
              tipo: "capa",
              headline: "Inicial",
              corpo: "Corpo inicial",
              prompt_imagem: "Prompt inicial",
              campo_extra: "preservado",
            },
          ],
          legenda: "Antes",
        },
      },
    ],
    temas_editoriais: [],
    artigos_blog_ancora: [],
    trilha_proveniencia: [],
  };
});

describe("Conexão MCP Autenticada e Persistente do Motor", () => {
  it("rejeita acesso sem autenticação ou com token inválido (401)", async () => {
    const unauthGet = await GET(
      new Request("http://localhost/api/mcp-gpt?demanda_id=draft-1")
    );
    expect(unauthGet.status).toBe(401);

    const unauthPost = await POST(
      new Request("http://localhost/api/mcp-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      })
    );
    expect(unauthPost.status).toBe(401);

    const wrongTokenPost = await POST(
      new Request("http://localhost/api/mcp-gpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-incorreto",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      })
    );
    expect(wrongTokenPost.status).toBe(401);
  });

  it("expõe schema OpenAPI 3.1.0 declarando autenticação Bearer", async () => {
    const res = await GET(
      new Request("http://localhost/api/mcp-gpt?schema=openapi")
    );
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  });

  it("inicializa, lista ferramentas e responde a ping quando autenticado", async () => {
    expect(
      (await (await rpc("initialize")).json()).result.capabilities
    ).toHaveProperty("tools");
    expect((await (await rpc("tools/list")).json()).result.tools).toHaveLength(
      2
    );
    expect(await (await rpc("ping", {}, 0)).json()).toEqual({
      jsonrpc: "2.0",
      id: 0,
      result: {},
    });
  });

  it("aceita notificação sem emitir resposta JSON-RPC", async () => {
    const res = await POST(
      new Request("http://localhost/api/mcp-gpt", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      })
    );
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("não entrega a primeira peça quando o ID não existe", async () => {
    const res = await GET(
      new Request("http://localhost/api/mcp-gpt?demanda_id=inexistente", {
        headers: authHeaders,
      })
    );
    expect(res.status).toBe(404);
    const result = await (
      await rpc("tools/call", {
        name: "obter_contexto_peca_eloss",
        arguments: { demanda_id: "inexistente" },
      })
    ).json();
    expect(result.id).toBe(42);
    expect(result.result.isError).toBe(true);
    expect(store.write).not.toHaveBeenCalled();
  });

  it("salva oito slides e permite reler slides e legenda exatamente preservando campos existentes", async () => {
    const slides = Array.from({ length: 8 }, (_, i) => ({
      ordem: i + 1,
      tipo: i === 0 ? "capa" : "conteudo",
      headline: `Slide ${i + 1}`,
      corpo: "Texto",
      prompt_imagem: "Arte",
    }));
    const result = await (
      await rpc("tools/call", {
        name: "atualizar_post_no_sistema_eloss",
        arguments: {
          demanda_id: "draft-1",
          slides,
          legenda: "Legenda revisada",
        },
      })
    ).json();
    expect(result.result.isError).toBeUndefined();
    expect(store.write).toHaveBeenCalledOnce();
    const response = await (
      await rpc("tools/call", {
        name: "obter_contexto_peca_eloss",
        arguments: { demanda_id: "draft-1" },
      })
    ).json();
    const saved = JSON.parse(response.result.content[0].text);
    expect(saved.legenda).toBe("Legenda revisada");
    expect(saved.slides).toHaveLength(8);
    expect(saved.slides.map((s: any) => s.headline)).toEqual(
      slides.map((s) => s.headline)
    );
    expect(saved.slides[0].campo_extra).toBe("preservado");
  });

  it("detecta conflito de edição quando esperado_atualizado_em diverge", async () => {
    const slides = [
      {
        ordem: 1,
        tipo: "capa",
        headline: "Slide 1",
        corpo: "Texto",
        prompt_imagem: "Arte",
      },
    ];
    const result = await (
      await rpc("tools/call", {
        name: "atualizar_post_no_sistema_eloss",
        arguments: {
          demanda_id: "draft-1",
          esperado_atualizado_em: "2020-01-01T00:00:00.000Z",
          slides,
          legenda: "Conflito",
        },
      })
    ).json();
    expect(result.result.isError).toBe(true);
    expect(result.result.content[0].text).toContain("Conflito de edição");
    expect(store.write).not.toHaveBeenCalled();
  });

  it("rejeita gravação MCP sem ID ou sem slides", async () => {
    for (const args of [
      { slides: [] },
      { demanda_id: "draft-1", slides: [] },
    ]) {
      const res = await (
        await rpc("tools/call", {
          name: "atualizar_post_no_sistema_eloss",
          arguments: args,
        })
      ).json();
      expect(res.result.isError).toBe(true);
    }
    expect(store.write).not.toHaveBeenCalled();
  });

  it("não deixa método MCP desconhecido executar ação legada", async () => {
    const res = await POST(
      new Request("http://localhost/api/mcp-gpt", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "unknown",
          slides: [{ headline: "X" }],
          demanda_id: "draft-1",
        }),
      })
    );
    expect((await res.json()).error.code).toBe(-32601);
    expect(store.write).not.toHaveBeenCalled();
  });
});
