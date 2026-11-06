import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { readMotorDb, writeMotorDb } from "@/lib/store/motor-db";
import { rodarChecagensMalha } from "@/lib/engine/ai-malha-gpt";
import { SlideCarrosselEloss } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Monta o Super-Prompt Completo (Zero API — para usar direto no plano ChatGPT Plus/Pro/Team)
 * contendo:
 * 1. Identidade Visual e Regras Oficiais da Eloss
 * 2. Resumo / Texto da Matéria Âncora do Blog
 * 3. Estrutura completa dos 8 Slides (Headline, Gradiente, Corpo) + Legenda
 * 4. Os 8 Prompts Visuais de 8 Pontos (com Cláusula Anti-Mosaico) prontos para o ChatGPT desenhar cada lâmina
 * 5. Instrução MCP / JSON de Sincronização Automática de volta para o sistema
 */
function construirSuperPromptChatGpt(demandaId: string) {
  const db = readMotorDb();
  const demanda =
    db.demandas.find((d) => d.id === demandaId);
  if (!demanda) {
    throw new Error("Peça não encontrada no banco.");
  }

  const tema = db.temas_editoriais.find(
    (t) => t.id === demanda.tema_origem_id
  );
  const artigo = db.artigos_blog_ancora.find(
    (a) =>
      a.id === demanda.artigo_blog_origem_id ||
      a.tema_id === demanda.tema_origem_id
  );

  const slides = demanda.conteudo_estruturado?.slides || [];
  const legenda = demanda.conteudo_estruturado?.legenda || "";

  const blocoSlidesAtuais =
    slides.length > 0
      ? slides
          .map(
            (s) => `### SLIDE ${s.ordem} de ${slides.length} (${s.tipo.toUpperCase()})
- Headline: ${s.headline}
- Destaque Gradiente (#5B1F8A → #F4834B): ${s.headline_destaque || "(definir)"}
- Corpo: ${s.corpo}
- CTA: ${s.cta || "(sem CTA)"}
- Prompt de Arte 8 Pontos (com Cláusula Anti-Mosaico):
${s.prompt_imagem || s.direcao_visual}`
          )
          .join("\n\n")
      : "(Slides ainda não definidos — gere os 8 slides completos a partir da matéria abaixo)";

  const todosPromptsArte =
    slides.length > 0
      ? slides
          .map(
            (s) =>
              `=== ARTE DO SLIDE ${s.ordem} DE ${slides.length} ===\n${
                s.prompt_imagem ||
                `Crie um slide individual em 1080x1350px, proporção 4:5. Não gere mosaico, não gere grid, não coloque múltiplos slides em uma única imagem. Este é o slide ${s.ordem} de ${slides.length}, gere apenas este slide isolado. a) Formato: Single image, Instagram post, 1080x1350px, 4:5 portrait. b) Fundo: Modo Escuro #0A0820 a #0D0A1A com glows #5B1F8A e #F4834B. c) Marca: ELOSS no topo esquerdo. d) Headline: "${s.headline}" com destaque gradiente em "${s.headline_destaque || ""}". e) Corpo: "${s.corpo}". f) Elemento gráfico central 3D glass: ${s.direcao_visual}. g) Rodapé: 0${s.ordem}/0${slides.length}. h) Estilo: Dark tech editorial, Poppins ExtraBold, DM Sans.`
              }`
          )
          .join("\n\n")
      : "";

  const superPromptCompleto = `# CONTEXTO E COMANDO MESTRE — MOTOR DE MARKETING ELOSS (PLANO CHATGPT)
Você está conectado ao fluxo de produção da **Eloss ("Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas")**.
- **ID da Peça no Sistema (\`demanda_id\`):** \`${demanda.id}\`
- **Tema (\`codigo_tema\`):** ${tema?.codigo_tema || "T5"} — ${tema?.titulo_tema || demanda.titulo}
- **Canal / Formato:** ${demanda.formato_canal.toUpperCase()}

---

## 1. DIRETRIZES INEGOCIÁVEIS DA MARCA ELOSS
- **Tom de Voz:** Afirmativo, direto, técnico e acessível para o dono/sócio da operação. NUNCA use gerúndio no início de frases, nunca use clichês de marketing ("no mundo atual", "revolucionário", "descubra como").
- **Proibições Absolutas:** Zero vocabulário de consultoria ("diagnóstico", "auditoria", "consultoria", "assessoria", "mentoria"). Zero menção a concorrentes.
- **Identidade Visual (Dark Tech Editorial 4:5 — 1080x1350px):**
  - Fundo escuro profundo (\`#0A0820\`, \`#0D0A1A\`, \`#382060\`) com glows sutis em roxo (\`#5B1F8A\`) e laranja coral (\`#F4834B\`).
  - Tipografia: **Poppins ExtraBold** nas headlines (com apenas 1 trecho por slide em gradiente \`#5B1F8A → #F4834B\`) e **DM Sans** no corpo com barra vertical \`#F4834B\` à esquerda.
  - **Cláusula Anti-Mosaico Obrigatória em toda arte:** Cada imagem gerada DEVE ser um slide individual isolado em 1080x1350px (4:5). Proibido gerar grid ou mosaico com vários slides juntos.

---

## 2. MATÉRIA ÂNCORA DO BLOG (BASE TÉCNICA DO POST)
${(artigo?.conteudo_completo_markdown || demanda.briefing.pauta_central || "").slice(0, 7500)}

---

## 3. ESTRUTURA ATUAL DO POST / CARROSSEL (${slides.length || 8} SLIDES) E PROMPTS DE 8 PONTOS
${blocoSlidesAtuais}

### LEGENDA ATUAL:
${legenda}

---

## 4. O QUE VOCÊ DEVE FAZER AGORA NO CHATGPT:
1. **Se eu pedir para refinar ou criar o conteúdo do post/carrossel:** melhore os slides, a legenda e os prompts visuais de 8 pontos mantendo 100% de fidelidade aos dados da Matéria Âncora e às Regras da Eloss.
2. **Se eu pedir para gerar as artes ("Gere a arte do Slide 1", "Gere todas as artes uma a uma"):** gere **uma imagem por vez** em proporção vertical (4:5 / 1024x1536) seguindo fielmente o Prompt de 8 Pontos daquele slide, sem mosaico.
3. **Quando eu pedir para ATUALIZAR NO SISTEMA DA ELOSS:**
   - Se a ferramenta MCP \`atualizar_post_no_sistema_eloss\` estiver ativa, chame-a diretamente passando \`demanda_id: "${demanda.id}"\`.
   - E também entregue o bloco JSON abaixo pronto para sincronização em 1 clique no painel da Eloss:

\`\`\`json
{
  "demanda_id": "${demanda.id}",
  "legenda": "Texto completo da legenda...",
  "slides": [
    {
      "ordem": 1,
      "tipo": "capa",
      "headline": "Headline curta e afirmativa",
      "headline_destaque": "trecho em gradiente",
      "corpo": "Corpo argumentativo em DM Sans",
      "cta": "",
      "direcao_visual": "Resumo da cena Dark Tech",
      "prompt_imagem": "Crie um slide individual em 1080x1350px, proporção 4:5. Não gere mosaico..."
    }
  ]
}
\`\`\``;

  const promptSomenteArtes = `# GERAR ARTES DO CARROSSEL ELOSS NO CHATGPT (1 SLIDE POR VEZ — PROPORÇÃO 4:5 VERTICAL)
Peça: ${tema?.codigo_tema || ""} — ${demanda.titulo}
IMPORTANTE: Gere **1 imagem individual por vez** (começando pelo Slide 1). NUNCA gere mosaico ou grid com vários slides na mesma imagem.

${todosPromptsArte}

---
👉 **Comece agora gerando apenas a imagem isolada do SLIDE 1 DE ${slides.length || 8}** seguindo exatamente as instruções do Slide 1 acima.`;

  return {
    demanda_id: demanda.id,
    titulo: demanda.titulo,
    atualizado_em: demanda.atualizado_em,
    slides,
    legenda,
    super_prompt_completo: superPromptCompleto,
    prompt_sequencia_artes: promptSomenteArtes,
  };
}

/**
 * Atualiza a peça no banco (`motor-db.json`) a partir do JSON gerado pelo ChatGPT
 * (via MCP tool call, GPT Action ou Colar/Sincronizar no Modal).
 */
function aplicarAtualizacaoDoChatGpt(payload: {
  demanda_id?: string;
  codigo_tema?: string;
  legenda?: string;
  slides?: Partial<SlideCarrosselEloss>[];
  headline_arte?: string;
  destaque_gradiente?: string;
  subtitulo_arte?: string;
  prompt_imagem?: string;
}) {
  const db = readMotorDb();
  let demanda = db.demandas.find((d) => d.id === payload.demanda_id);

  if (!payload.demanda_id && payload.codigo_tema) {
    const tema = db.temas_editoriais.find(
      (t) =>
        (t.codigo_tema || "").toLowerCase() ===
        payload.codigo_tema?.toLowerCase()
    );
    if (tema) {
      demanda = db.demandas.find(
        (d) => d.tema_origem_id === tema.id && d.formato_canal !== "blog"
      );
    }
  }

  if (!demanda) {
    throw new Error(
      "Peça não localizada para sincronização. Verifique o demanda_id ou codigo_tema."
    );
  }

  const atual = demanda.conteudo_estruturado || {
    metodo_geracao: "gpt",
    modelo_ia: "ChatGPT (Plano ChatGPT + Sincronização MCP)",
    checagens: [],
  };

  let novosSlides = atual.slides || [];
  if (Array.isArray(payload.slides) && payload.slides.length > 0) {
    novosSlides = payload.slides.map((s, idx) => {
      const anterior = atual.slides?.[idx];
      return {
        ordem: Number(s.ordem || idx + 1),
        tipo:
          (s.tipo as "capa" | "conteudo" | "dado" | "cta") ||
          anterior?.tipo ||
          (idx === 0
            ? "capa"
            : idx === payload.slides!.length - 1
              ? "cta"
              : "conteudo"),
        headline: String(s.headline ?? anterior?.headline ?? ""),
        headline_destaque: String(
          s.headline_destaque ?? anterior?.headline_destaque ?? ""
        ),
        corpo: String(s.corpo ?? anterior?.corpo ?? ""),
        cta: String(s.cta ?? anterior?.cta ?? ""),
        direcao_visual: String(
          s.direcao_visual ??
            s.prompt_imagem ??
            anterior?.direcao_visual ??
            ""
        ),
        prompt_imagem: String(
          s.prompt_imagem ??
            anterior?.prompt_imagem ??
            s.direcao_visual ??
            ""
        ),
        imagem_url: s.imagem_url || anterior?.imagem_url,
      };
    });
  }

  const novaLegenda =
    payload.legenda !== undefined ? payload.legenda : atual.legenda;

  const textoParaChecar = [
    novaLegenda || "",
    ...novosSlides.map((sl) => `${sl.headline} ${sl.corpo}`),
    payload.headline_arte || "",
    payload.subtitulo_arte || "",
  ].join("\n");

  demanda.conteudo_estruturado = {
    ...atual,
    metodo_geracao: "gpt",
    modelo_ia: "Plano ChatGPT (Sincronizado via MCP / Ponte Direta)",
    legenda: novaLegenda,
    slides: novosSlides.length > 0 ? novosSlides : atual.slides,
    headline_arte: payload.headline_arte ?? atual.headline_arte,
    destaque_gradiente: payload.destaque_gradiente ?? atual.destaque_gradiente,
    subtitulo_arte: payload.subtitulo_arte ?? atual.subtitulo_arte,
    prompt_imagem: payload.prompt_imagem ?? atual.prompt_imagem,
    checagens: rodarChecagensMalha(
      textoParaChecar,
      demanda.formato_canal,
      novosSlides
    ),
  };
  demanda.atualizado_em = new Date().toISOString();

  db.trilha_proveniencia.push({
    id: crypto.randomUUID(),
    marca_id: demanda.marca_id,
    demanda_id: demanda.id,
    tarefa_id: null,
    entrega_id: null,
    decisao_id: null,
    evento: "POST_SINCRONIZADO_DO_PLANO_CHATGPT_MCP",
    ator: "ChatGPT (Plano Assinatura) + Isabelle",
    detalhes: {
      slides_atualizados: novosSlides.length,
      formato: demanda.formato_canal,
    },
    timestamp_explicito: demanda.atualizado_em,
  });

  writeMotorDb(db);
  return demanda;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demandaId = searchParams.get("demanda_id");
  const schemaType = searchParams.get("schema");

  if (demandaId) {
    try {
      const promptData = construirSuperPromptChatGpt(demandaId);
      return Response.json(promptData, { status: 200 });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Erro ao gerar prompt." },
        { status: 400 }
      );
    }
  }

  if (schemaType === "openapi") {
    const reqUrl = new URL(request.url);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl =
      forwardedProto && forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : reqUrl.origin;

    return Response.json({
      openapi: "3.1.0",
      info: {
        title: "Motor de Marketing Eloss — Ponte MCP / ChatGPT Actions",
        version: "1.0.0",
        description:
          "Permite ao ChatGPT (Plano Plus/Team/Pro) ler a Matéria Âncora e atualizar automaticamente os slides, prompts visuais e legendas do post no sistema da Eloss sem consumir créditos de API.",
      },
      servers: [{ url: baseUrl }],
      paths: {
        "/api/mcp-gpt": {
          get: {
            operationId: "obterContextoPecaEloss",
            summary:
              "Obtém a matéria âncora, regras da Eloss e os slides atuais de uma peça.",
            parameters: [
              {
                name: "demanda_id",
                in: "query",
                required: true,
                schema: { type: "string" },
              },
            ],
          },
          post: {
            operationId: "atualizarPostNoSistemaEloss",
            summary:
              "Atualiza automaticamente os slides, prompts de 8 pontos e legenda da peça no sistema da Eloss.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      acao: {
                        type: "string",
                        default: "sincronizar_json_chatgpt",
                      },
                      demanda_id: { type: "string" },
                      codigo_tema: { type: "string" },
                      legenda: { type: "string" },
                      slides: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            ordem: { type: "number" },
                            tipo: { type: "string" },
                            headline: { type: "string" },
                            headline_destaque: { type: "string" },
                            corpo: { type: "string" },
                            cta: { type: "string" },
                            prompt_imagem: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  return Response.json({
    nome: "eloss-motor-marketing-mcp",
    versao: "1.0.0",
    status: "ativo",
    protocolos_suportados: [
      "MCP JSON-RPC 2.0 (POST /api/mcp-gpt)",
      "Servidor MCP Stdio (node mcp-server-eloss.mjs)",
      "OpenAPI 3.1 para Custom GPT Actions (GET /api/mcp-gpt?schema=openapi)",
      "Sincronização Direta Plano ChatGPT (1-Click Copy & Paste JSON / Imagens)",
    ],
  });
}

export async function POST(request: Request) {
  let rpcId: string | number | null = null;
  let isRpc = false;
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Objeto JSON obrigatório." }, { status: 400 });
    }
    isRpc = body.jsonrpc === "2.0";
    rpcId = body.id ?? null;

    // ========================================================================
    // 1. PROTOCOLO MCP JSON-RPC 2.0 (Model Context Protocol)
    // ========================================================================
    if (isRpc) {
      if (typeof body.method !== "string") {
        return Response.json({ jsonrpc: "2.0", id: rpcId,
          error: { code: -32600, message: "Requisição MCP inválida." } });
      }
      // Notifications have no response in JSON-RPC (including initialized).
      if (!("id" in body)) return new Response(null, { status: 202 });
      if (body.method === "ping") {
        return Response.json({ jsonrpc: "2.0", id: rpcId, result: {} });
      }
      if (body.method === "initialize") {
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: {
              name: "eloss-motor-marketing-mcp",
              version: "1.0.0",
            },
          },
        });
      }

      if (body.method === "tools/list") {
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [
              {
                name: "obter_contexto_peca_eloss",
                description:
                  "Lê do Motor de Marketing da Eloss a Matéria Âncora do Blog, as Regras da Marca e os 8 slides atuais de uma peça para o ChatGPT trabalhar em cima.",
                inputSchema: {
                  type: "object",
                  properties: {
                    demanda_id: {
                      type: "string",
                      description: "ID da peça (demanda_id) no sistema Eloss",
                    },
                  },
                  required: ["demanda_id"],
                },
              },
              {
                name: "atualizar_post_no_sistema_eloss",
                description:
                  "Salva e atualiza automaticamente no Motor de Marketing da Eloss os slides (headline, destaque, corpo, prompt_imagem de 8 pontos) e a legenda desenvolvidos no ChatGPT.",
                inputSchema: {
                  type: "object",
                  properties: {
                    demanda_id: { type: "string" },
                    codigo_tema: { type: "string" },
                    legenda: { type: "string" },
                    slides: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          ordem: { type: "number" },
                          tipo: { type: "string" },
                          headline: { type: "string" },
                          headline_destaque: { type: "string" },
                          corpo: { type: "string" },
                          cta: { type: "string" },
                          direcao_visual: { type: "string" },
                          prompt_imagem: { type: "string" },
                        },
                      },
                    },
                  },
                  required: ["demanda_id", "slides"],
                },
              },
            ],
          },
        });
      }

      if (body.method === "tools/call") {
        const toolName = body.params?.name;
        const args = body.params?.arguments || {};

        if (toolName === "obter_contexto_peca_eloss") {
          const info = construirSuperPromptChatGpt(String(args.demanda_id));
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(info),
                },
              ],
            },
          });
        }

        if (toolName === "atualizar_post_no_sistema_eloss") {
          if (typeof args.demanda_id !== "string" || !args.demanda_id.trim()) {
            throw new Error("demanda_id é obrigatório para atualizar via MCP.");
          }
          if (!Array.isArray(args.slides) || args.slides.length === 0) {
            throw new Error("Envie todos os slides do carrossel.");
          }
          const atualizada = aplicarAtualizacaoDoChatGpt(args);
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Peça "${atualizada.titulo}" atualizada com sucesso no Motor de Marketing da Eloss (${atualizada.conteudo_estruturado?.slides?.length || 0} slides sincronizados)!`,
                },
              ],
            },
          });
        }
      }
      return Response.json({ jsonrpc: "2.0", id: rpcId,
        error: { code: -32601, message: "Método ou ferramenta MCP desconhecida." } });
    }

    // ========================================================================
    // 2. SINCRONIZAR TEXTO / JSON GERADO NO PLANO CHATGPT DE VOLTA NO SISTEMA
    // ========================================================================
    if (
      body.acao === "sincronizar_json_chatgpt" ||
      body.slides ||
      body.texto_colado_chatgpt
    ) {
      let payload = body;

      if (typeof body.texto_colado_chatgpt === "string") {
        const raw = body.texto_colado_chatgpt.trim();
        // Extrai bloco ```json ... ``` caso a usuária tenha colado a resposta inteira do ChatGPT
        const matchJsonBlock =
          raw.match(/```(?:json)?\s*([\s\S]*?)```/i) ||
          raw.match(/(\{[\s\S]*\})/);
        if (!matchJsonBlock) {
          return Response.json(
            {
              error:
                "Não encontramos um bloco JSON válido na resposta colada. Peça ao ChatGPT: 'Me entregue o bloco JSON de sincronização da Eloss'.",
            },
            { status: 400 }
          );
        }
        const parsed = JSON.parse(matchJsonBlock[1].trim());
        payload = {
          ...parsed,
          demanda_id: body.demanda_id || parsed.demanda_id,
        };
      }

      const demandaAtualizada = aplicarAtualizacaoDoChatGpt(payload);
      return Response.json(
        {
          ok: true,
          demanda: demandaAtualizada,
        },
        { status: 200 }
      );
    }

    // ========================================================================
    // 3. SALVAR ARTE GERADA NO CHATGPT (VIA CTRL+V / UPLOAD BASE64) NO SLIDE
    // ========================================================================
    if (body.acao === "salvar_arte_colada_chatgpt") {
      const { demanda_id, ordem_slide, data_url } = body;
      if (!demanda_id || !data_url) {
        return Response.json(
          { error: "demanda_id e data_url são obrigatórios." },
          { status: 400 }
        );
      }

      const db = readMotorDb();
      const demanda = db.demandas.find((d) => d.id === demanda_id);
      if (!demanda || !demanda.conteudo_estruturado) {
        return Response.json(
          { error: "Peça não encontrada." },
          { status: 404 }
        );
      }

      const matches = String(data_url).match(
        /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/
      );
      if (!matches) {
        return Response.json(
          { error: "Formato de imagem inválido." },
          { status: 400 }
        );
      }

      const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
      const mimeType = `image/${matches[1]}`;
      const b64Data = matches[2];
      const buffer = Buffer.from(b64Data, "base64");
      const ordemNum = Number(ordem_slide || 1);
      const fileName = `chatgpt-plan-slide-${demanda.id.slice(0, 8)}-${ordemNum}-${Date.now()}.${ext}`;

      let imageUrl = "";
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // 1. Tenta salvar no bucket oficial "imagens" do Supabase da Eloss (permanente na nuvem/Vercel)
      if (supabaseUrl && supabaseKey) {
        try {
          const storagePath = `motor-slides/${fileName}`;
          const upRes = await fetch(
            `${supabaseUrl}/storage/v1/object/imagens/${storagePath}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                apikey: supabaseKey,
                "Content-Type": mimeType,
                "x-upsert": "true",
              },
              body: buffer,
            }
          );
          if (upRes.ok) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/imagens/${storagePath}`;
          }
        } catch {
          // fallback para disco local ou data_url
        }
      }

      // 2. Fallback: salva localmente em public/geradas (no localhost) ou usa data_url (em serverless)
      if (!imageUrl) {
        try {
          const dir = path.join(process.cwd(), "public", "geradas");
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(path.join(dir, fileName), buffer);
          imageUrl = `/geradas/${fileName}`;
        } catch {
          imageUrl = String(data_url);
        }
      }

      if (demanda.conteudo_estruturado.slides) {
        demanda.conteudo_estruturado.slides =
          demanda.conteudo_estruturado.slides.map((s) =>
            s.ordem === ordemNum ? { ...s, imagem_url: imageUrl } : s
          );
      }
      demanda.atualizado_em = new Date().toISOString();
      writeMotorDb(db);

      return Response.json(
        { ok: true, imagem_url: imageUrl, demanda },
        { status: 200 }
      );
    }

    return Response.json({ error: "Ação MCP desconhecida." }, { status: 400 });
  } catch (err) {
    if (isRpc) {
      return Response.json({ jsonrpc: "2.0", id: rpcId,
        result: { isError: true, content: [{ type: "text",
          text: err instanceof Error ? err.message : "Falha na operação MCP." }] } });
    }
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro ao processar sincronização MCP / ChatGPT.",
      },
      { status: 400 }
    );
  }
}
