import fs from "node:fs";
import path from "node:path";
import {
  EMPRESA_ELOSS_SUPABASE_ID,
  verificarAutenticacaoMcp,
} from "@/lib/engine/mcp-auth";
import {
  AtualizarPecaSupabasePayload,
  ErroPersistenciaSupabase,
  atualizarPecaNoSupabase,
  obterDemandaOuPecaDoSupabase,
} from "@/lib/store/supabase-pecas";

export const dynamic = "force-dynamic";

/**
 * Monta o Super-Prompt Completo (Zero API — para usar direto no ChatGPT Plus/Pro/Team ou via MCP)
 * lendo diretamente a peça na tabela `pecas` do Supabase da Eloss:
 * 1. Identidade Visual e Regras Oficiais da Eloss
 * 2. Resumo / Texto da Matéria Âncora do Blog
 * 3. Estrutura completa dos Slides (Headline, Gradiente, Corpo) + Legenda
 * 4. Os Prompts Visuais de 8 Pontos (com Cláusula Anti-Mosaico) prontos para o ChatGPT desenhar cada lâmina
 * 5. Instrução MCP / JSON de Sincronização Automática de volta para o sistema
 */
export async function construirSuperPromptChatGpt(
  demandaId: string,
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
) {
  const { demanda, db } = await obterDemandaOuPecaDoSupabase(
    demandaId,
    empresaId
  );

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
- **Tema (\`codigo_tema\`):** ${tema?.codigo_tema || "T1"} — ${tema?.titulo_tema || demanda.titulo}
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
   - Se a ferramenta MCP \`atualizar_post_no_sistema_eloss\` (ou Action \`atualizarPostNoSistemaEloss\`) estiver ativa, chame-a diretamente passando \`demanda_id: "${demanda.id}"\`.
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

export async function aplicarAtualizacaoDoChatGpt(
  payload: AtualizarPecaSupabasePayload,
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
) {
  return atualizarPecaNoSupabase(payload, empresaId);
}

export async function salvarArteColadaNoSupabase(
  body: {
    demanda_id?: string;
    ordem_slide?: number;
    data_url?: string;
  },
  empresaId: string = EMPRESA_ELOSS_SUPABASE_ID
) {
  const { demanda_id, ordem_slide, data_url } = body;
  if (!demanda_id || !data_url) {
    throw new ErroPersistenciaSupabase(
      "demanda_id e data_url são obrigatórios.",
      400
    );
  }

  const { demanda } = await obterDemandaOuPecaDoSupabase(
    demanda_id,
    empresaId
  );

  const matches = String(data_url).match(
    /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/
  );
  if (!matches) {
    throw new ErroPersistenciaSupabase("Formato de imagem inválido.", 400);
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

  if (supabaseUrl && supabaseKey) {
    try {
      const storagePath = `${demanda.id}/${fileName}`;
      const upRes = await fetch(
        `${supabaseUrl}/storage/v1/object/peca-imagens/${storagePath}`,
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
        imageUrl = `${supabaseUrl}/storage/v1/object/public/peca-imagens/${storagePath}`;
      }
    } catch {
      // fallback para disco local ou data_url
    }
  }

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

  const slidesAtuais = demanda.conteudo_estruturado?.slides || [];
  const slidesAtualizados = slidesAtuais.map((s) =>
    s.ordem === ordemNum ? { ...s, imagem_url: imageUrl } : s
  );

  const demandaSalva = await atualizarPecaNoSupabase(
    {
      demanda_id: demanda.id,
      slides: slidesAtualizados,
      ator: "ChatGPT (Upload Arte Slide) + Isabelle",
    },
    empresaId
  );

  return { imageUrl, demanda: demandaSalva };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demandaId = searchParams.get("demanda_id");
  const schemaType = searchParams.get("schema");

  if (schemaType === "openapi") {
    const reqUrl = new URL(request.url);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl =
      forwardedProto && forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : reqUrl.origin;

    return Response.json({
      openapi: "3.1.0",
      info: {
        title: "Motor de Marketing Eloss — Ponte MCP / ChatGPT Actions",
        version: "1.1.0",
        description:
          "Permite ao ChatGPT (Plano Plus/Team/Pro) ler a Matéria Âncora e atualizar de forma autenticada e persistente no Supabase os slides, prompts visuais e legendas de carrosséis da Eloss sem chamadas adicionais a APIs de IA.",
      },
      servers: [{ url: baseUrl }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description:
              "Token de autenticação do Motor de Marketing da Eloss (ELOSS_MCP_TOKEN).",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      paths: {
        "/api/mcp-gpt": {
          get: {
            operationId: "obterContextoPecaEloss",
            summary:
              "Obtém a matéria âncora, regras da Eloss e os slides atuais de uma peça no Supabase.",
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "demanda_id",
                in: "query",
                required: true,
                description: "UUID da peça (pecas.id) no Supabase da Eloss.",
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description:
                  "Dados atuais da peça, slides, legenda e super-prompt.",
              },
              "401": { description: "Token ausente ou inválido." },
              "404": { description: "Peça não encontrada." },
            },
          },
          post: {
            operationId: "atualizarPostNoSistemaEloss",
            summary:
              "Atualiza e persiste no Supabase os slides, prompts de 8 pontos e legenda da peça da Eloss.",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["demanda_id", "slides"],
                    properties: {
                      acao: {
                        type: "string",
                        default: "sincronizar_json_chatgpt",
                      },
                      demanda_id: {
                        type: "string",
                        description: "UUID da peça (pecas.id) no Supabase.",
                      },
                      codigo_tema: { type: "string" },
                      legenda: { type: "string" },
                      esperado_atualizado_em: {
                        type: "string",
                        description:
                          "Timestamp ISO opcional para detecção de conflito de edição.",
                      },
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
                  },
                },
              },
            },
            responses: {
              "200": {
                description:
                  "Peça atualizada e persistida com sucesso no Supabase.",
              },
              "401": { description: "Token ausente ou inválido." },
              "404": { description: "Peça não encontrada." },
              "409": { description: "Conflito de edição detectado." },
            },
          },
        },
      },
    });
  }

  const auth = await verificarAutenticacaoMcp(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  if (demandaId) {
    try {
      const promptData = await construirSuperPromptChatGpt(
        demandaId,
        auth.empresaId
      );
      return Response.json(promptData, { status: 200 });
    } catch (err) {
      const status =
        err instanceof ErroPersistenciaSupabase ? err.status : 400;
      return Response.json(
        { error: err instanceof Error ? err.message : "Erro ao gerar prompt." },
        { status }
      );
    }
  }

  return Response.json({
    nome: "eloss-motor-marketing-mcp",
    versao: "1.1.0",
    status: "ativo",
    autenticado: true,
    empresa_id: auth.empresaId,
    persistencia: "supabase:pecas",
    protocolos_suportados: [
      "MCP JSON-RPC 2.0 Autenticado (POST /api/mcp-gpt)",
      "Servidor MCP Stdio (node mcp-server-eloss.mjs)",
      "OpenAPI 3.1 com Bearer Auth para Custom GPT Actions (GET /api/mcp-gpt?schema=openapi)",
    ],
  });
}

export async function POST(request: Request) {
  const auth = await verificarAutenticacaoMcp(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  let rpcId: string | number | null = null;
  let isRpc = false;
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Objeto JSON obrigatório." },
        { status: 400 }
      );
    }
    isRpc = body.jsonrpc === "2.0";
    rpcId = body.id ?? null;

    // ========================================================================
    // 1. PROTOCOLO MCP JSON-RPC 2.0 (Model Context Protocol)
    // ========================================================================
    if (isRpc) {
      if (typeof body.method !== "string") {
        return Response.json({
          jsonrpc: "2.0",
          id: rpcId,
          error: { code: -32600, message: "Requisição MCP inválida." },
        });
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
              version: "1.1.0",
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
                  "Lê do Supabase do Motor de Marketing da Eloss a Matéria Âncora do Blog, as Regras da Marca e os slides atuais de uma peça para o ChatGPT trabalhar em cima.",
                inputSchema: {
                  type: "object",
                  properties: {
                    demanda_id: {
                      type: "string",
                      description:
                        "ID da peça (demanda_id / pecas.id) no sistema Eloss",
                    },
                  },
                  required: ["demanda_id"],
                },
              },
              {
                name: "atualizar_post_no_sistema_eloss",
                description:
                  "Salva e persiste automaticamente no Supabase do Motor de Marketing da Eloss os slides (headline, destaque, corpo, direcao_visual, prompt_imagem de 8 pontos) e a legenda desenvolvidos no ChatGPT.",
                inputSchema: {
                  type: "object",
                  properties: {
                    demanda_id: { type: "string" },
                    codigo_tema: { type: "string" },
                    legenda: { type: "string" },
                    esperado_atualizado_em: {
                      type: "string",
                      description:
                        "Timestamp ISO opcional para validar ausência de conflito de edição.",
                    },
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
          const info = await construirSuperPromptChatGpt(
            String(args.demanda_id || ""),
            auth.empresaId
          );
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
            throw new ErroPersistenciaSupabase(
              "demanda_id é obrigatório para atualizar via MCP.",
              400
            );
          }
          if (!Array.isArray(args.slides) || args.slides.length === 0) {
            throw new ErroPersistenciaSupabase(
              "Envie todos os slides do carrossel.",
              400
            );
          }
          const atualizada = await aplicarAtualizacaoDoChatGpt(
            args,
            auth.empresaId
          );
          return Response.json({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Peça "${atualizada.titulo}" atualizada e persistida no Supabase do Motor de Marketing da Eloss (${atualizada.conteudo_estruturado?.slides?.length || 0} slides sincronizados)!`,
                },
              ],
            },
          });
        }
      }
      return Response.json({
        jsonrpc: "2.0",
        id: rpcId,
        error: {
          code: -32601,
          message: "Método ou ferramenta MCP desconhecida.",
        },
      });
    }

    // ========================================================================
    // 2. SINCRONIZAR TEXTO / JSON GERADO NO CHATGPT (VIA CUSTOM GPT ACTION)
    // ========================================================================
    if (
      body.acao === "sincronizar_json_chatgpt" ||
      body.slides ||
      body.texto_colado_chatgpt
    ) {
      let payload = body;

      if (typeof body.texto_colado_chatgpt === "string") {
        const raw = body.texto_colado_chatgpt.trim();
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
          esperado_atualizado_em:
            body.esperado_atualizado_em || parsed.esperado_atualizado_em,
        };
      }

      if (!Array.isArray(payload.slides) || payload.slides.length === 0) {
        return Response.json(
          { error: "O campo slides é obrigatório e não pode estar vazio." },
          { status: 400 }
        );
      }

      const demandaAtualizada = await aplicarAtualizacaoDoChatGpt(
        payload,
        auth.empresaId
      );
      return Response.json(
        {
          ok: true,
          demanda: demandaAtualizada,
        },
        { status: 200 }
      );
    }

    // ========================================================================
    // 3. SALVAR ARTE GERADA NO CHATGPT NO SLIDE
    // ========================================================================
    if (body.acao === "salvar_arte_colada_chatgpt") {
      const { imageUrl, demanda } = await salvarArteColadaNoSupabase(
        body,
        auth.empresaId
      );
      return Response.json(
        { ok: true, imagem_url: imageUrl, demanda },
        { status: 200 }
      );
    }

    return Response.json({ error: "Ação MCP desconhecida." }, { status: 400 });
  } catch (err) {
    if (isRpc) {
      return Response.json({
        jsonrpc: "2.0",
        id: rpcId,
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text:
                err instanceof Error
                  ? err.message
                  : "Falha na operação MCP.",
            },
          ],
        },
      });
    }
    const status =
      err instanceof ErroPersistenciaSupabase ? err.status : 400;
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro ao processar sincronização MCP / ChatGPT.",
      },
      { status }
    );
  }
}
