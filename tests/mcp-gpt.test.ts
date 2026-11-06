import { beforeEach, describe, expect, it, vi } from "vitest";
const store = vi.hoisted(() => ({ db: {} as any, write: vi.fn() }));
vi.mock("@/lib/store/motor-db", () => ({
  readMotorDb: () => structuredClone(store.db),
  writeMotorDb: (db: unknown) => { store.write(db); store.db = structuredClone(db); },
}));
vi.mock("@/lib/engine/ai-malha-gpt", () => ({ rodarChecagensMalha: () => [] }));
import { GET, POST } from "../src/app/api/mcp-gpt/route";
const rpc = (method: string, params = {}, id: string | number = 42) => POST(new Request(
  "http://localhost/api/mcp-gpt", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) }
));
beforeEach(() => {
  store.write.mockClear();
  store.db = { demandas: [{ id: "draft-1", titulo: "Teste", marca_id: "eloss", formato_canal: "carrossel", briefing: {},
    conteudo_estruturado: { slides: [], legenda: "Antes" } }], temas_editoriais: [], artigos_blog_ancora: [], trilha_proveniencia: [] };
});
describe("Conexão MCP do Motor", () => {
  it("inicializa, lista ferramentas e responde a ping", async () => {
    expect((await (await rpc("initialize")).json()).result.capabilities).toHaveProperty("tools");
    expect((await (await rpc("tools/list")).json()).result.tools).toHaveLength(2);
    expect(await (await rpc("ping", {}, 0)).json()).toEqual({ jsonrpc: "2.0", id: 0, result: {} });
  });
  it("aceita notificação sem emitir resposta JSON-RPC", async () => {
    const res = await POST(new Request("http://localhost/api/mcp-gpt", { method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }));
    expect(res.status).toBe(202); expect(await res.text()).toBe("");
  });
  it("não entrega a primeira peça quando o ID não existe", async () => {
    const res = await GET(new Request("http://localhost/api/mcp-gpt?demanda_id=inexistente"));
    expect(res.status).toBe(400);
    const result = await (await rpc("tools/call", { name: "obter_contexto_peca_eloss", arguments: { demanda_id: "inexistente" } })).json();
    expect(result.id).toBe(42); expect(result.result.isError).toBe(true);
    expect(store.write).not.toHaveBeenCalled();
  });
  it("salva oito slides e permite reler slides e legenda exatamente", async () => {
    const slides = Array.from({ length: 8 }, (_, i) => ({ ordem: i + 1, tipo: i === 0 ? "capa" : "conteudo", headline: `Slide ${i+1}`, corpo: "Texto", prompt_imagem: "Arte" }));
    const result = await (await rpc("tools/call", { name: "atualizar_post_no_sistema_eloss", arguments: { demanda_id: "draft-1", slides, legenda: "Legenda revisada" } })).json();
    expect(result.result.isError).toBeUndefined(); expect(store.write).toHaveBeenCalledOnce();
    const response = await (await rpc("tools/call", { name: "obter_contexto_peca_eloss", arguments: { demanda_id: "draft-1" } })).json();
    const saved = JSON.parse(response.result.content[0].text);
    expect(saved.legenda).toBe("Legenda revisada"); expect(saved.slides).toHaveLength(8);
    expect(saved.slides.map((s: any) => s.headline)).toEqual(slides.map(s => s.headline));
  });
  it("rejeita gravação MCP sem ID ou sem slides", async () => {
    for (const args of [{ slides: [] }, { demanda_id: "draft-1", slides: [] }]) {
      const res = await (await rpc("tools/call", { name: "atualizar_post_no_sistema_eloss", arguments: args })).json();
      expect(res.result.isError).toBe(true);
    }
    expect(store.write).not.toHaveBeenCalled();
  });
  it("não deixa método MCP desconhecido executar ação legada", async () => {
    const res = await POST(new Request("http://localhost/api/mcp-gpt", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 5, method: "unknown", slides: [{ headline: "X" }], demanda_id: "draft-1" }) }));
    expect((await res.json()).error.code).toBe(-32601); expect(store.write).not.toHaveBeenCalled();
  });
});
