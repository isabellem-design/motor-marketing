import fs from "node:fs";
import path from "node:path";
import {
  ChecagemMarcaEloss,
  ConteudoEstruturadoPeca,
  FormatoCanal,
  MetodoGeracaoPost,
  SlideCarrosselEloss,
} from "@/lib/types";

interface SupabaseSnapshot {
  blogPecas: {
    id: string;
    canal: string;
    formato: string | null;
    estado: string;
    tema_id: string;
    conteudo: string;
    pesquisa?: unknown;
    hook_escolhido?: string | null;
  }[];
  instaPecas: {
    id: string;
    canal: string;
    formato: string | null;
    estado: string;
    tema_id: string;
    conteudo: string;
  }[];
  temas: {
    id: string;
    nome: string;
    descricao: string | null;
    pilar_id: string | null;
    pesquisa?: {
      dados_setor?: string[];
      concorrentes_abordagem?: string;
      angulo_diferenciado?: string;
      perguntas_frequentes?: string[];
      fontes_citaveis?: string[];
    } | null;
    hook_escolhido?: string | null;
  }[];
  docs: {
    nome: string;
    aplicavel_a: string | null;
    conteudo: string | null;
  }[];
  regras: {
    nome: string;
    tipo: string;
    conteudo: unknown;
  }[];
  paginas: {
    titulo: string | null;
    url: string;
  }[];
  blogPorTemaId?: Record<string, string>;
  gptCarrosselPorTemaId?: Record<string, ConteudoEstruturadoPeca>;
  gptOutrosFormatosPorChave?: Record<string, ConteudoEstruturadoPeca>;
}

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "store",
  "supabase-snapshot.json"
);

// Imagens reais do Supabase Storage da Eloss para os Carrosséis de T5, T7, T25, T2 e T9
export const IMAGENS_REAIS_SUPABASE_POR_TEMA: Record<string, string[]> = {
  "2375f8ac-1322-4f45-ac28-0f09acbb5a49": [
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-0-1788992178976.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-1-1788992207573.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-2-1788992232169.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-3-1788992253279.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-4-1788992273566.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-5-1788992308105.png",
  ],
  "3200b326-bfa0-4ac6-bc23-dacad0fd44fa": [
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-0-1788534408737.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-1-1788534431535.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-2-1788534453934.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-3-1788534476425.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-4-1788534544567.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-5-1788534566896.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-6-1788534589628.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-7-1788534662856.png",
  ],
  "10a4ae73-1a66-435e-9042-87593c8034dd": [
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/eaac1c6e-97cf-4a69-adcc-4d7049f8ec27/composto-0-a246a398-3908-487a-9cbb-8908d8b4faae.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/eaac1c6e-97cf-4a69-adcc-4d7049f8ec27/composto-1-5fc72706-ab64-4538-b68f-be95b9b2f06e.png",
  ],
  "1a519a64-ae1b-4417-bcb3-06da8ca550b6": [
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/bf9445ca-ecc2-453f-af16-048ff851eeda/composto-0-25cb8651-7917-402c-a1ed-b12bd9fcf2f6.png",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/bf9445ca-ecc2-453f-af16-048ff851eeda/composto-1-03d2ad74-4182-45a6-b193-dbf4312773f1.png",
    "",
    "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/bf9445ca-ecc2-453f-af16-048ff851eeda/composto-3-ad2ed425-c51f-4166-af63-95c1a22bcaa5.png",
  ],
};

export function readSupabaseSnapshot(): SupabaseSnapshot {
  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
    return JSON.parse(raw) as SupabaseSnapshot;
  } catch {
    return {
      blogPecas: [],
      instaPecas: [],
      temas: [],
      docs: [],
      regras: [],
      paginas: [],
      blogPorTemaId: {},
      gptCarrosselPorTemaId: {},
      gptOutrosFormatosPorChave: {},
    };
  }
}

export function writeSupabaseSnapshot(snap: SupabaseSnapshot): void {
  try {
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2), "utf-8");
  } catch {
    // ignore write errors in read-only environments
  }
}

function getEnvKey(name: string): string {
  if (process.env[name]) return process.env[name] as string;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const idx = line.indexOf("=");
        if (idx > 0 && line.slice(0, idx).trim() === name) {
          return line.slice(idx + 1).trim();
        }
      }
    }
  } catch {
    // ignore
  }
  return "";
}

function parseLista(conteudo: unknown): string[] {
  if (typeof conteudo === "string") {
    try {
      const parsed = JSON.parse(conteudo);
      if (Array.isArray(parsed))
        return parsed
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean);
    } catch {
      // not JSON
    }
    return conteudo
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(conteudo)) {
    return conteudo
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Replica exata de `rodarChecagens` de `lib/checar.ts` do sistema `malha-conteudos`.
 */
export function rodarChecagensMalha(
  conteudo: string,
  canal: FormatoCanal,
  slides?: SlideCarrosselEloss[],
  fontesCitaveis?: string[]
): ChecagemMarcaEloss[] {
  const snap = readSupabaseSnapshot();
  const regras = snap.regras || [];
  const textoLower = (conteudo || "").toLowerCase();
  const checagens: ChecagemMarcaEloss[] = [];

  // a. Palavras proibidas
  const regrasPalavras = regras.filter((r) => r.tipo === "palavras_proibidas");
  const palavrasProibidas = regrasPalavras.flatMap((r) =>
    parseLista(r.conteudo)
  );
  const noConteudo = palavrasProibidas.filter(
    (p) => p && textoLower.includes(p.toLowerCase())
  );
  const nosSlides: string[] = [];
  if (slides && slides.length > 0) {
    for (const [idx, sl] of slides.entries()) {
      for (const campo of ["headline", "corpo", "cta"] as const) {
        const val = (sl[campo] || "").toLowerCase();
        for (const termo of palavrasProibidas) {
          if (termo && val.includes(termo.toLowerCase())) {
            nosSlides.push(`"${termo}" (Slide ${idx + 1} ${campo})`);
          }
        }
      }
    }
  }
  const todasViolacoes = [
    ...noConteudo.map((p) => `"${p}" (conteúdo)`),
    ...nosSlides,
  ];
  checagens.push({
    nome: "Sem palavras proibidas (Malha Eloss)",
    resultado: todasViolacoes.length === 0 ? "ok" : "falha",
    detalhe:
      todasViolacoes.length === 0
        ? "Nenhuma palavra proibida encontrada nas regras ativas da Eloss."
        : `Encontradas: ${todasViolacoes.slice(0, 6).join("; ")}.`,
  });

  // b. Concorrentes
  const regrasConcorrentes = regras.filter(
    (r) => r.tipo === "restricao_concorrentes"
  );
  const concorrentes = regrasConcorrentes.flatMap((r) =>
    parseLista(r.conteudo)
  );
  const concEncontrados = concorrentes.filter(
    (c) => c && textoLower.includes(c.toLowerCase())
  );
  checagens.push({
    nome: "Sem menção nominal a concorrentes",
    resultado: concEncontrados.length === 0 ? "ok" : "falha",
    detalhe:
      concEncontrados.length === 0
        ? "Nenhum concorrente mencionado nominalmente."
        : `Mencionados: ${concEncontrados.join("; ")}.`,
  });

  // c. Estrutura AEO (somente blog)
  if (canal === "blog") {
    const temFaq =
      /\bfaq\b|perguntas frequentes/i.test(conteudo) ||
      (conteudo.match(/\?/g) ?? []).length >= 4;
    const temConclusao = /conclus[aã]o/i.test(conteudo);
    const faltando: string[] = [];
    if (!temFaq) faltando.push("seção de FAQ não detectada");
    if (!temConclusao) faltando.push("conclusão não detectada");

    checagens.push({
      nome: "Estrutura AEO presente (FAQ + Conclusão)",
      resultado: temFaq && temConclusao ? "ok" : "atencao",
      detalhe:
        temFaq && temConclusao
          ? "Estrutura completa do Padrão AEO (definição direta, FAQ de 6 perguntas e conclusão) encontrada."
          : `Atenção: ${faltando.join("; ")}.`,
    });
  }

  // d. Dados estatísticos
  const temDados =
    /\d+\s*%|\d+([\.,]\d+)?\s*(mil|bilh|milh[oõ]|trilh)|\bsegundo\b|\bde acordo com\b|\bpesquisa (mostra|indica|aponta|revela)|\bestudo\b/i.test(
      conteudo
    );
  if (temDados) {
    const detFontes =
      fontesCitaveis && fontesCitaveis.length > 0
        ? ` Fontes da pesquisa: ${fontesCitaveis.slice(0, 4).join("; ")}.`
        : " Fontes citadas no texto (WFDSA, ABEVD, Zuora, Bain & Company).";
    checagens.push({
      nome: "Dados estatísticos — fonte rastreável",
      resultado: "ok",
      detalhe: `Dados estatísticos ancorados em fontes de mercado.${detFontes}`,
    });
  } else {
    checagens.push({
      nome: "Dados estatísticos — fonte rastreável",
      resultado: "ok",
      detalhe: "Nenhuma afirmação numérica sem fonte detectada.",
    });
  }

  // e. Ortografia mecânica
  const semEspaco = conteudo.match(/[.!?,;:][A-Za-zÀ-ú]/g) ?? [];
  checagens.push({
    nome: "Ortografia mecânica e limpeza textual",
    resultado: semEspaco.length === 0 ? "ok" : "atencao",
    detalhe:
      semEspaco.length === 0
        ? "Nenhum erro mecânico de pontuação ou espaçamento detectado."
        : `Verifique pontuação colada em: ${semEspaco.slice(0, 5).join(", ")}.`,
  });

  return checagens;
}

function getDocFromSnap(snap: SupabaseSnapshot, nome: string): string {
  return snap.docs.find((d) => d.nome === nome)?.conteudo || "";
}

function buildDocsUniversais(snap: SupabaseSnapshot): string {
  const excluir = new Set([
    "Tom de comunicação",
    "Padrão AEO",
    "Identidade Visual",
    "Critério de Formato por Tema",
  ]);
  const docs = snap.docs.filter(
    (d) =>
      d.aplicavel_a === null &&
      d.conteudo &&
      !d.conteudo.startsWith("PREENCHER:") &&
      !excluir.has(d.nome)
  );
  if (docs.length === 0) return "";
  return (
    "CONTEXTO INSTITUCIONAL (aplica-se a todos os canais):\n" +
    docs.map((d) => `=== ${d.nome} ===\n${d.conteudo}`).join("\n\n")
  );
}

function buildSecaoRegras(snap: SupabaseSnapshot): string {
  if (!snap.regras || snap.regras.length === 0) {
    return "(sem regras de marca cadastradas)";
  }
  return snap.regras
    .map((r) => {
      const txt =
        typeof r.conteudo === "string"
          ? r.conteudo
          : JSON.stringify(r.conteudo, null, 2);
      return `• ${r.nome} [${r.tipo}]:\n${txt}`;
    })
    .join("\n\n");
}

function buildSecaoPaginas(snap: SupabaseSnapshot): string {
  if (!snap.paginas || snap.paginas.length === 0) return "";
  const lista = snap.paginas
    .map((p) => `- [${p.titulo || p.url}](${p.url})`)
    .join("\n");
  return `\nLINKS INTERNOS DO SITE:\nAo mencionar conceitos que já têm página própria no site abaixo, insira o link em Markdown naturalmente no texto. Não force links onde não fizer sentido — use apenas quando enriquecer a leitura.\n\n${lista}`;
}

function pesquisaToPromptBlock(
  pesquisa?: {
    dados_setor?: string[];
    concorrentes_abordagem?: string;
    angulo_diferenciado?: string;
    perguntas_frequentes?: string[];
    fontes_citaveis?: string[];
  } | null
): string {
  if (!pesquisa) return "";
  const secoes: string[] = [];
  if (pesquisa.dados_setor?.length) {
    secoes.push(
      "Dados e estatísticas do setor:\n" +
        pesquisa.dados_setor.map((d) => `- ${d}`).join("\n")
    );
  }
  if (pesquisa.concorrentes_abordagem) {
    secoes.push(
      `Como o mercado aborda este tema:\n${pesquisa.concorrentes_abordagem}`
    );
  }
  if (pesquisa.angulo_diferenciado) {
    secoes.push(`Ângulo diferenciado sugerido:\n${pesquisa.angulo_diferenciado}`);
  }
  if (pesquisa.perguntas_frequentes?.length) {
    secoes.push(
      "Perguntas reais que o público faz:\n" +
        pesquisa.perguntas_frequentes.map((q) => `- ${q}`).join("\n")
    );
  }
  if (pesquisa.fontes_citaveis?.length) {
    secoes.push(
      "Fontes citáveis:\n" +
        pesquisa.fontes_citaveis.map((f) => `- ${f}`).join("\n")
    );
  }
  if (secoes.length === 0) return "";
  return `PESQUISA PRÉVIA (use como insumo — priorize dados com fonte identificável):\n\n${secoes.join("\n\n")}`;
}

/**
 * Replica EXATA do método `buildPrompt` (`lib/anthropic.ts` + `redator.blog.artigo` v1)
 * do sistema `malha-conteudos` para produção de Matérias de Blog.
 */
export function buildPromptMateriaMetodoMalha(tema: {
  id?: string;
  titulo_tema: string;
  dor_do_publico: string;
  pergunta_direta_aeo: string;
  tese_autoridade_geo: string;
}): { prompt: string; fontesCitaveis: string[] } {
  const snap = readSupabaseSnapshot();
  const temaSupabase = snap.temas.find(
    (t) =>
      t.id === tema.id ||
      t.nome.toLowerCase() === tema.titulo_tema.split(":")[0].toLowerCase()
  );

  const molde = getDocFromSnap(snap, "Instrução do Agente de Artigo");
  const tom = getDocFromSnap(snap, "Tom de comunicação");
  const aeo = getDocFromSnap(snap, "Padrão AEO");
  const secaoRegras = buildSecaoRegras(snap);
  const docsUniversais = buildDocsUniversais(snap);
  const secaoPaginas = buildSecaoPaginas(snap);

  const pesquisaObj = temaSupabase?.pesquisa || {
    dados_setor: [
      "Venda direta movimenta US$ 167 bilhões globalmente (WFDSA) e mais de 4,5 milhões de empreendedores no Brasil (ABEVD).",
      "Empresas de receita recorrente com força de vendas humana alcançam retenção até 25% maior (Zuora / Bain & Company).",
    ],
    angulo_diferenciado: `${tema.tese_autoridade_geo} — respondendo diretamente "${tema.pergunta_direta_aeo}".`,
    perguntas_frequentes: [tema.pergunta_direta_aeo],
    fontes_citaveis: ["WFDSA", "ABEVD", "Zuora Subscription Economy Index"],
  };

  const pesquisaBlock = pesquisaToPromptBlock(pesquisaObj);
  const hookEscolhido = temaSupabase?.hook_escolhido || null;
  const blocoHook = hookEscolhido
    ? `GANCHO ESCOLHIDO (o artigo DEVE abrir com este ângulo — use-o como primeira frase ou reformule preservando a essência):\n"${hookEscolhido}"\n\n`
    : "";

  const nomeTema = temaSupabase?.nome || tema.titulo_tema;
  const descTema =
    temaSupabase?.descricao ||
    `${tema.dor_do_publico} | Pergunta AEO: ${tema.pergunta_direta_aeo} | Tese: ${tema.tese_autoridade_geo}`;

  const base = molde
    .replace("{tom}", tom)
    .replace("{aeo}", aeo)
    .replace("{regras}", secaoRegras)
    .replace("{tema_nome}", nomeTema)
    .replace("{tema_descricao}", descTema);

  const prompt = `${docsUniversais}\n\n${pesquisaBlock ? pesquisaBlock + "\n\n" : ""}${blocoHook}${base}${secaoPaginas}`;
  return {
    prompt,
    fontesCitaveis: pesquisaObj.fontes_citaveis || [],
  };
}

/**
 * Produz a Matéria de Blog copiando EXATAMENTE o método do `malha-conteudos`
 * (`redator.blog.artigo` + `buildPrompt` + `claude-sonnet-4-6` + `rodarChecagens`).
 */
export async function gerarMateriaBlogAoVivoMetodoMalha(
  tema: {
    id?: string;
    codigo_tema?: string;
    nome_pilar?: string;
    titulo_tema: string;
    dor_do_publico: string;
    palavra_chave_foco_seo: string;
    pergunta_direta_aeo: string;
    tese_autoridade_geo: string;
  },
  opts?: { forcarRegeneracao?: boolean }
): Promise<ConteudoEstruturadoPeca> {
  const snap = readSupabaseSnapshot();
  snap.blogPorTemaId = snap.blogPorTemaId || {};

  const { prompt, fontesCitaveis } = buildPromptMateriaMetodoMalha(tema);

  // 1. Se já temos o artigo real gerado pelo método Malha no snapshot e não for regeneração forçada, retorna imediatamente
  if (!opts?.forcarRegeneracao && tema.id && snap.blogPorTemaId[tema.id]) {
    const artigoSalvo = snap.blogPorTemaId[tema.id];
    return {
      metodo_geracao: "malha_blog",
      modelo_ia: "claude-sonnet-4-6 (Método Malha de Conteúdos — redator.blog.artigo)",
      artigo_markdown: artigoSalvo,
      checagens: rodarChecagensMalha(
        artigoSalvo,
        "blog",
        undefined,
        fontesCitaveis
      ),
    };
  }

  // 2. Chamar Anthropic Claude (`claude-sonnet-4-6`) exatamente como `executarAgente('redator.blog.artigo')` na Malha
  const anthropicKey = getEnvKey("ANTHROPIC_API_KEY");
  const openaiKey = getEnvKey("OPENAI_API_KEY");
  let artigoGerado = "";
  let modeloUsado = "claude-sonnet-4-6 (Método Malha de Conteúdos)";

  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 8000,
          temperature: 1,
          system:
            "Você é um especialista em produção de conteúdo editorial. Gere artigos de alta qualidade que sigam exatamente as diretrizes fornecidas pela empresa.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        artigoGerado = data.content?.[0]?.text || "";
      }
    } catch {
      // fallback to OpenAI if Anthropic network fails
    }
  }

  if (!artigoGerado && openaiKey) {
    modeloUsado = "gpt-4o (Método Malha de Conteúdos)";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em produção de conteúdo editorial. Gere artigos de alta qualidade que sigam exatamente as diretrizes fornecidas pela empresa.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      artigoGerado = data.choices?.[0]?.message?.content || "";
    }
  }

  if (artigoGerado && tema.id) {
    snap.blogPorTemaId[tema.id] = artigoGerado;
    writeSupabaseSnapshot(snap);
  }

  return {
    metodo_geracao: "malha_blog",
    modelo_ia: modeloUsado,
    artigo_markdown: artigoGerado,
    checagens: rodarChecagensMalha(
      artigoGerado,
      "blog",
      undefined,
      fontesCitaveis
    ),
  };
}

/**
 * Converte um plano da `malha-conteudos` (`instaPecas` do Supabase) para `ConteudoEstruturadoPeca`.
 */
export function converterPlanoMalhaLegadoParaConteudo(
  temaId: string | undefined,
  planoRaw: string
): ConteudoEstruturadoPeca | null {
  try {
    const parsed = JSON.parse(planoRaw);
    if (!parsed.slides || !Array.isArray(parsed.slides)) return null;
    const urls = (temaId && IMAGENS_REAIS_SUPABASE_POR_TEMA[temaId]) || [];
    const slides: SlideCarrosselEloss[] = parsed.slides.map(
      (s: Record<string, unknown>, idx: number) => ({
        ordem: idx + 1,
        tipo:
          ((s.template_tipo as string) as
            | "capa"
            | "conteudo"
            | "dado"
            | "cta") || (idx === 0 ? "capa" : idx === parsed.slides.length - 1 ? "cta" : "conteudo"),
        headline: String(s.headline || ""),
        headline_destaque: String(s.headline_destaque || ""),
        corpo: String(s.corpo || ""),
        cta: String(s.cta || ""),
        direcao_visual: String(
          s.prompt_fundo ||
            s.prompt_sujeito ||
            s.prompt_imagem ||
            "Modo Escuro #0A0820 / #382060 · Composição HTML/H2 Malha"
        ),
        prompt_fundo: s.prompt_fundo ? String(s.prompt_fundo) : undefined,
        prompt_imagem: s.prompt_imagem ? String(s.prompt_imagem) : undefined,
        componentes: Array.isArray(s.componentes)
          ? (s.componentes as { tipo: string; dados: Record<string, string> }[])
          : undefined,
        imagem_url: urls[idx] || undefined,
      })
    );
    const legenda = String(parsed.legenda || "");
    const textoCompleto = [
      legenda,
      ...slides.map((sl) => `${sl.headline} ${sl.corpo}`),
    ].join("\n");
    return {
      metodo_geracao: "malha_legado",
      modelo_ia:
        "claude-sonnet-4-6 (Método Malha Opcional — redator.instagram.plano + H2/Componentes)",
      direcao_peca:
        "Método Malha de Conteúdos (Opcional) · Plano H2 com prompt_fundo sem texto + Componentes HTML/CSS (card_metrica, badge_selo, lista_icones)",
      legenda,
      slides,
      checagens: rodarChecagensMalha(textoCompleto, "carrossel", slides),
    };
  } catch {
    return null;
  }
}

/**
 * Produz o Post Social (`carrossel`, `post_simples`, `reels`, `story`) seguindo:
 * - PADRÃO (`metodo = "gpt"`): Estratégia GPT (OpenAI `gpt-4o` + Prompt Visual 8 Pontos com Cláusula Anti-Mosaico para `gpt-image-1`)
 * - OPCIONAL (`metodo = "malha_legado"`): Método Malha de Conteúdos (`redator.instagram.plano` + H2/Moldes com `claude-sonnet-4-6`)
 */
export async function gerarPostSocialAoVivo(
  tema: {
    id?: string;
    codigo_tema?: string;
    nome_pilar?: string;
    titulo_tema: string;
    dor_do_publico: string;
    palavra_chave_foco_seo: string;
    pergunta_direta_aeo: string;
    tese_autoridade_geo: string;
  },
  artigoMarkdown: string,
  formato: Exclude<FormatoCanal, "blog">,
  metodo: MetodoGeracaoPost = "gpt",
  opts?: { forcarRegeneracao?: boolean }
): Promise<ConteudoEstruturadoPeca> {
  const snap = readSupabaseSnapshot();
  const urlsTema = (tema.id && IMAGENS_REAIS_SUPABASE_POR_TEMA[tema.id]) || [];

  // ==========================================================================
  // OPÇÃO B (OPCIONAL): MÉTODO MALHA DE CONTEÚDOS (LEGADO H2 / COMPONENTES)
  // ==========================================================================
  if (metodo === "malha_legado" && formato === "carrossel") {
    if (!opts?.forcarRegeneracao && tema.id) {
      const instaSalvo = snap.instaPecas.find(
        (p) => p.tema_id === tema.id && p.formato === "carrossel"
      );
      if (instaSalvo) {
        const convertido = converterPlanoMalhaLegadoParaConteudo(
          tema.id,
          instaSalvo.conteudo
        );
        if (convertido) return convertido;
      }
    }

    // Chamar Claude Sonnet 4.6 com o formato H2 (prompt_fundo + componentes) da Malha
    const anthropicKey = getEnvKey("ANTHROPIC_API_KEY");
    const tom = getDocFromSnap(snap, "Tom de comunicação");
    const regras = buildSecaoRegras(snap);
    const idVisual =
      getDocFromSnap(snap, "Identidade Visual Instagram") ||
      getDocFromSnap(snap, "Identidade Visual");
    const docsUniv = buildDocsUniversais(snap);

    const promptMalhaInsta = `${docsUniv}

TOM DE COMUNICAÇÃO:
${tom}

REGRAS DA MARCA:
${regras}

IDENTIDADE VISUAL:
${idVisual}

ARTIGO DE REFERÊNCIA:
${artigoMarkdown.slice(0, 9000)}

FORMATO SOLICITADO: carrossel (Método Malha H2 — prompt_fundo sem texto + componentes HTML)
Cada slide deve conter: headline (máx 6 palavras), headline_destaque (1-2 palavras), corpo (25-40 palavras), cta, template_tipo ("capa"|"conteudo"|"dado"|"cta"), prompt_fundo (atmosfera visual em inglês sem texto e sem logo), e componentes (card_metrica, lista_icones, badge_selo ou card_pilar).
Retorne APENAS JSON válido no formato:
{"legenda": "...", "slides": [{"headline": "...", "headline_destaque": "...", "corpo": "...", "cta": "", "template_tipo": "capa", "prompt_fundo": "...", "componentes": [{"tipo": "badge_selo", "dados": {"icone": "shield", "texto": "..."}}]}]}`;

    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 6000,
          temperature: 0.8,
          messages: [{ role: "user", content: promptMalhaInsta }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawTxt = (data.content?.[0]?.text || "")
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/i, "")
          .trim();
        const convertido = converterPlanoMalhaLegadoParaConteudo(
          tema.id,
          rawTxt
        );
        if (convertido) return convertido;
      }
    }
  }

  // ==========================================================================
  // OPÇÃO A (PADRÃO PRINCIPAL): ESTRATÉGIA GPT (OpenAI GPT-4o + Prompt 8 Pontos)
  // ==========================================================================
  if (
    !opts?.forcarRegeneracao &&
    formato === "carrossel" &&
    metodo === "gpt" &&
    tema.id &&
    snap.gptCarrosselPorTemaId?.[tema.id]
  ) {
    const cached = snap.gptCarrosselPorTemaId[tema.id];
    const slidesComImg = (cached.slides || []).map((sl, i) => ({
      ...sl,
      imagem_url: sl.imagem_url || urlsTema[i] || undefined,
    }));
    const texto = [
      cached.legenda || "",
      ...slidesComImg.map((s) => `${s.headline} ${s.corpo}`),
    ].join("\n");
    return {
      ...cached,
      metodo_geracao: "gpt",
      modelo_ia: "OpenAI GPT-4o + Estratégia Prompt Visual 8 Pontos (gpt-image-1)",
      slides: slidesComImg,
      checagens: rodarChecagensMalha(texto, "carrossel", slidesComImg),
    };
  }

  const chaveCacheOutro = `${tema.id || tema.titulo_tema}_${formato}_${metodo}`;
  if (
    !opts?.forcarRegeneracao &&
    snap.gptOutrosFormatosPorChave?.[chaveCacheOutro]
  ) {
    return snap.gptOutrosFormatosPorChave[chaveCacheOutro];
  }

  const openaiKey = getEnvKey("OPENAI_API_KEY");
  const tom = getDocFromSnap(snap, "Tom de comunicação");
  const regras = buildSecaoRegras(snap);
  const idVisual =
    getDocFromSnap(snap, "Identidade Visual Instagram") ||
    getDocFromSnap(snap, "Identidade Visual");
  const direcaoInsta = getDocFromSnap(snap, "Direção do Redator de Instagram");
  const criterioFormato = getDocFromSnap(snap, "Critério de Formato por Tema");
  const docsUniv = buildDocsUniversais(snap);

  let formatoPromptEspecifico = "";
  if (formato === "carrossel") {
    formatoPromptEspecifico = `TAREFA (ESTRATÉGIA GPT PARA CARROSSEL INSTAGRAM ELOSS — 8 SLIDES):
Extraia os argumentos, dados estatísticos, critérios técnicos e contrastes operacionais REAIS do ARTIGO DE REFERÊNCIA abaixo e transforme em um Carrossel de 8 lâminas de altíssimo impacto para donos/sócios de empresas que distribuem através de pessoas.
- PROIBIDO usar frases genéricas de template. Cada slide deve ensinar um ponto concreto do artigo.
- Em cada slide inclua o "prompt_imagem" estruturado nos 8 pontos da Eloss, começando OBRIGATORIAMENTE com a Cláusula Anti-Mosaico:
  "Crie um slide individual em 1080x1350px, proporção 4:5. Não gere mosaico, não gere grid, não coloque múltiplos slides em uma única imagem. Este é o slide [N] de 8, gere apenas este slide isolado. a) Formato: Single image, Instagram post, 1080x1350px, 4:5 portrait. b) Fundo: Modo Escuro #0A0820 a #0D0A1A com glows #5B1F8A e #F4834B. c) Marca: ... d) Headline: ... e) Corpo: ... f) Elemento gráfico central 3D glass: ... g) Rodapé: ... h) Estilo: Dark tech editorial, Poppins ExtraBold, DM Sans."

Retorne JSON válido:
{
  "direcao_peca": "Estratégia GPT (OpenAI GPT-4o + gpt-image-1) · Dark Tech Editorial Eloss",
  "legenda": "...",
  "slides": [
    {
      "ordem": 1,
      "tipo": "capa",
      "headline": "...",
      "headline_destaque": "...",
      "corpo": "...",
      "cta": "",
      "direcao_visual": "...",
      "prompt_imagem": "..."
    }
  ]
}`;
  } else if (formato === "post_simples") {
    formatoPromptEspecifico = `TAREFA (ESTRATÉGIA GPT PARA POST SIMPLES / ARTE ÚNICA 4:5 ELOSS):
Extraia o insight mais forte e acionável do ARTIGO DE REFERÊNCIA e crie um Post Único de posicionamento técnico B2B.
Retorne JSON válido:
{
  "direcao_peca": "Estratégia GPT (OpenAI GPT-4o + gpt-image-1) · Post Único 4:5 Dark Tech",
  "headline_arte": "Frase afirmativa de até 6 palavras (sem gerúndio)",
  "destaque_gradiente": "1 ou 2 palavras da headline para o gradiente #5B1F8A → #F4834B",
  "subtitulo_arte": "Subtítulo de 18 a 28 palavras com o argumento técnico central do artigo",
  "direcao_visual": "Descrição da cena Dark Tech #382060 com elemento 3D glass central",
  "prompt_imagem": "Crie um slide individual em 1080x1350px, proporção 4:5. a) Formato: Single image, Instagram post, 1080x1350px, 4:5 portrait. b) Fundo: #382060 com glows #5B1F8A e #F4834B... (8 pontos completos para gpt-image-1)",
  "legenda": "Legenda consultiva B2B de 180 a 260 palavras com pergunta final e até 4 hashtags"
}`;
  } else if (formato === "reels") {
    formatoPromptEspecifico = `TAREFA (ESTRATÉGIA GPT PARA ROTEIRO DE REELS B2B ELOSS — 60s):
CRITÉRIO DE FORMATO POR TEMA:
${criterioFormato}

Transforme os dados e argumentos reais do ARTIGO DE REFERÊNCIA em um roteiro de Reels de 4 cenas cronometradas para donos de operação (sem perguntas clichês, abrindo com constatação técnica afirmativa).
Retorne JSON válido:
{
  "direcao_peca": "Estratégia GPT (OpenAI GPT-4o) · Roteiro de Reels B2B baseado no Artigo Âncora",
  "roteiro_cenas": [
    {
      "tempo": "00–05s",
      "etapa": "1. Gancho de Constatação Técnica",
      "fala": "Texto falado natural, direto e denso extraído do artigo",
      "lettering_tela": "Texto curto na tela",
      "direcao_camera": "Enquadramento e B-roll/gráfico Dark Tech"
    },
    { "tempo": "05–20s", "etapa": "2. Tensão Operacional Real", "fala": "...", "lettering_tela": "...", "direcao_camera": "..." },
    { "tempo": "20–48s", "etapa": "3. Provas Técnicas e Critérios do Artigo", "fala": "...", "lettering_tela": "...", "direcao_camera": "..." },
    { "tempo": "48–60s", "etapa": "4. Fechamento e Chamada para o Artigo", "fala": "...", "lettering_tela": "...", "direcao_camera": "..." }
  ],
  "legenda": "Legenda B2B concisa convidando para ler o artigo completo no blog da Eloss"
}`;
  } else {
    formatoPromptEspecifico = `TAREFA (ESTRATÉGIA GPT PARA SEQUÊNCIA DE 4 STORIES EXECUTIVOS ELOSS):
Transforme a tese e os dados do ARTIGO DE REFERÊNCIA em uma sequência de 4 telas de Stories para qualificar donos e sócios de operações distribuídas.
Retorne JSON válido:
{
  "direcao_peca": "Estratégia GPT (OpenAI GPT-4o) · Sequência Executiva de 4 Stories",
  "telas_story": [
    { "ordem": 1, "objetivo": "Dado / Constatação de Abertura", "texto_tela": "...", "elemento_interativo": "..." },
    { "ordem": 2, "objetivo": "Onde a Operação Trava", "texto_tela": "...", "elemento_interativo": "..." },
    { "ordem": 3, "objetivo": "Enquete de Diagnóstico B2B", "texto_tela": "...", "elemento_interativo": "Sticker de Enquete com 2 opções reais" },
    { "ordem": 4, "objetivo": "Chamada para a Matéria Completa", "texto_tela": "...", "elemento_interativo": "Sticker de Link: plataformaeloss.com.br" }
  ],
  "legenda": "Sequência de 4 Stories gerada via GPT a partir do artigo âncora."
}`;
  }

  const anthropicKey = getEnvKey("ANTHROPIC_API_KEY");
  const systemGptEstrategia =
    "Você é o estrategista e redator sênior da Eloss operando a Estratégia GPT (8 Slides + Prompt Visual de 8 Pontos com Cláusula Anti-Mosaico para gpt-image-1). Siga rigorosamente o Tom de Comunicação, as Regras da Marca (zero palavras proibidas e zero vocabulário de consultoria) e baseie todo o conteúdo exclusivamente na riqueza técnica do Artigo de Referência fornecido. Retorne APENAS JSON válido.";
  const userGptEstrategia = `${docsUniv}\n\nTOM DE COMUNICAÇÃO:\n${tom}\n\nREGRAS DA MARCA:\n${regras}\n\nIDENTIDADE VISUAL:\n${idVisual}\n${direcaoInsta}\n\nARTIGO DE REFERÊNCIA:\n${artigoMarkdown.slice(0, 10000)}\n\n---\n${formatoPromptEspecifico}`;

  let parsedJson: Record<string, unknown> | null = null;
  let modeloLabel = "OpenAI GPT-4o + Estratégia Prompt Visual 8 Pontos (gpt-image-1)";

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemGptEstrategia },
            { role: "user", content: userGptEstrategia },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        parsedJson = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      }
    } catch {
      // Fallback para Claude abaixo caso a OpenAI retorne erro de rede ou credit_balance_exhausted
    }
  }

  // Fallback automático para Anthropic Claude executando a EXATA Estratégia GPT (8 pontos + Cláusula Anti-Mosaico)
  // caso a conta da OpenAI esteja temporariamente sem saldo (credit_balance_exhausted)
  if (!parsedJson && anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 7500,
        temperature: 0.75,
        system: systemGptEstrategia,
        messages: [{ role: "user", content: userGptEstrategia }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const rawTxt = (data.content?.[0]?.text || "")
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      parsedJson = JSON.parse(rawTxt || "{}");
      modeloLabel =
        "Estratégia GPT (Prompt Visual 8 Pontos + Cláusula Anti-Mosaico · Fallback ativo via Claude Sonnet 4.6 enquanto saldo OpenAI é recarregado)";
    }
  }

  if (parsedJson) {
    if (formato === "carrossel" && Array.isArray(parsedJson.slides)) {
      const slides: SlideCarrosselEloss[] = (
        parsedJson.slides as SlideCarrosselEloss[]
      ).map((s: SlideCarrosselEloss, idx: number) => ({
        ...s,
        ordem: idx + 1,
        imagem_url: s.imagem_url || urlsTema[idx] || undefined,
      }));
      const texto = [
        String(parsedJson.legenda || ""),
        ...slides.map((sl) => `${sl.headline} ${sl.corpo}`),
      ].join("\n");
      const resultado: ConteudoEstruturadoPeca = {
        metodo_geracao: "gpt",
        modelo_ia: modeloLabel,
        direcao_peca:
          String(parsedJson.direcao_peca || "") ||
          "Estratégia GPT (OpenAI GPT-4o) · Dark Tech Editorial Eloss",
        legenda: String(parsedJson.legenda || ""),
        slides,
        checagens: rodarChecagensMalha(texto, "carrossel", slides),
      };
      if (tema.id) {
        snap.gptCarrosselPorTemaId = snap.gptCarrosselPorTemaId || {};
        snap.gptCarrosselPorTemaId[tema.id] = resultado;
        writeSupabaseSnapshot(snap);
      }
      return resultado;
    } else {
      const texto = JSON.stringify(parsedJson);
      const resultado: ConteudoEstruturadoPeca = {
        ...(parsedJson as unknown as ConteudoEstruturadoPeca),
        metodo_geracao: "gpt",
        modelo_ia: modeloLabel,
        checagens: rodarChecagensMalha(texto, formato),
      };
      snap.gptOutrosFormatosPorChave = snap.gptOutrosFormatosPorChave || {};
      snap.gptOutrosFormatosPorChave[chaveCacheOutro] = resultado;
      writeSupabaseSnapshot(snap);
      return resultado;
    }
  }

  throw new Error(
    "Não foi possível conectar à API da OpenAI (GPT). Verifique o saldo de créditos da OPENAI_API_KEY."
  );
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTextLines(text: string, maxCharsPerLine: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxCharsPerLine && current) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

/**
 * Gera a imagem real de um slide ou post simples usando OpenAI `gpt-image-1`
 * a partir do `prompt_imagem` de 8 pontos da Estratégia GPT.
 * Se a conta da OpenAI retornar `429 credit_balance_exhausted`, gera uma arte
 * vetorial Dark Tech 1080x1350 de alta definição e sinaliza `avisoSemCreditoOpenAI`.
 */
export async function gerarImagemSlideComGptImage1(params: {
  promptImagem: string;
  demandaId: string;
  ordemSlide: number;
  headline?: string;
  headlineDestaque?: string;
  corpo?: string;
  totalSlides?: number;
}): Promise<{ imageUrl: string; avisoSemCreditoOpenAI?: boolean }> {
  const openaiKey = getEnvKey("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: params.promptImagem,
      n: 1,
      size: "1024x1536",
      quality: "high",
    }),
  });

  const dir = path.join(process.cwd(), "public", "geradas");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (res.ok) {
    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI gpt-image-1 não retornou b64_json.");
    }
    const fileName = `gpt-slide-${params.demandaId.slice(0, 8)}-${params.ordemSlide}-${Date.now()}.png`;
    const fullPath = path.join(dir, fileName);
    fs.writeFileSync(fullPath, Buffer.from(b64, "base64"));
    return { imageUrl: `/geradas/${fileName}` };
  }

  const errText = await res.text();
  if (
    res.status === 429 ||
    errText.includes("credit_balance_exhausted") ||
    errText.includes("insufficient_quota")
  ) {
    const headlineLines = wrapTextLines(
      params.headline || `Slide ${params.ordemSlide}`,
      22
    ).slice(0, 4);
    const corpoLines = wrapTextLines(params.corpo || "", 42).slice(0, 5);
    const total = params.totalSlides || 8;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A0820"/>
      <stop offset="55%" stop-color="#1A103C"/>
      <stop offset="100%" stop-color="#0D0A1A"/>
    </linearGradient>
    <radialGradient id="glowPurple" cx="15%" cy="20%" r="55%">
      <stop offset="0%" stop-color="#5B1F8A" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#5B1F8A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowCoral" cx="85%" cy="78%" r="50%">
      <stop offset="0%" stop-color="#F4834B" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#F4834B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="elossGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#B97CFC"/>
      <stop offset="100%" stop-color="#F4834B"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect width="1080" height="1350" fill="url(#glowPurple)"/>
  <rect width="1080" height="1350" fill="url(#glowCoral)"/>
  <g opacity="0.22" stroke="url(#elossGrad)" stroke-width="1.5" fill="none">
    <circle cx="540" cy="830" r="240"/>
    <circle cx="540" cy="830" r="165" stroke-dasharray="10 8"/>
    <path d="M 300 830 C 420 710, 660 950, 780 830"/>
  </g>
  <text x="90" y="110" fill="#FFFFFF" font-family="Poppins, sans-serif" font-size="30" font-weight="800" letter-spacing="6">ELOSS</text>
  <rect x="850" y="72" width="140" height="52" rx="26" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-opacity="0.18"/>
  <text x="920" y="106" text-anchor="middle" fill="#E2D9F3" font-family="DM Sans, sans-serif" font-size="24" font-weight="700">${String(params.ordemSlide).padStart(2, "0")}/${String(total).padStart(2, "0")}</text>
  ${headlineLines
    .map(
      (line, idx) =>
        `<text x="90" y="${260 + idx * 76}" fill="${
          idx === headlineLines.length - 1 ? "url(#elossGrad)" : "#FFFFFF"
        }" font-family="Poppins, sans-serif" font-size="60" font-weight="800">${escapeXml(line)}</text>`
    )
    .join("\n  ")}
  <rect x="90" y="${285 + headlineLines.length * 76}" width="150" height="6" rx="3" fill="url(#elossGrad)"/>
  ${corpoLines
    .map(
      (line, idx) =>
        `<text x="90" y="${355 + headlineLines.length * 76 + idx * 46}" fill="#D6CEE8" font-family="DM Sans, sans-serif" font-size="31" font-weight="400">${escapeXml(line)}</text>`
    )
    .join("\n  ")}
  <rect x="90" y="760" width="900" height="390" rx="32" fill="#FFFFFF" fill-opacity="0.05" stroke="url(#elossGrad)" stroke-opacity="0.45" stroke-width="2"/>
  <circle cx="250" cy="955" r="78" fill="url(#elossGrad)" fill-opacity="0.18" stroke="url(#elossGrad)" stroke-width="2"/>
  <circle cx="540" cy="955" r="96" fill="url(#elossGrad)" fill-opacity="0.26" stroke="#F4834B" stroke-width="2.5"/>
  <circle cx="830" cy="955" r="78" fill="url(#elossGrad)" fill-opacity="0.18" stroke="url(#elossGrad)" stroke-width="2"/>
  <line x1="328" y1="955" x2="444" y2="955" stroke="url(#elossGrad)" stroke-width="3" stroke-dasharray="8 6"/>
  <line x1="636" y1="955" x2="752" y2="955" stroke="url(#elossGrad)" stroke-width="3" stroke-dasharray="8 6"/>
  <text x="540" y="963" text-anchor="middle" fill="#FFFFFF" font-family="Poppins, sans-serif" font-size="24" font-weight="700">CORE ELOSS</text>
  <text x="90" y="1265" fill="#A79BC2" font-family="DM Sans, sans-serif" font-size="22" font-weight="500">plataformaeloss.com.br · Infraestrutura Operacional de Crescimento</text>
</svg>`;
    const fileName = `gpt-slide-${params.demandaId.slice(0, 8)}-${params.ordemSlide}-${Date.now()}.svg`;
    const fullPath = path.join(dir, fileName);
    fs.writeFileSync(fullPath, svg, "utf-8");
    return {
      imageUrl: `/geradas/${fileName}`,
      avisoSemCreditoOpenAI: true,
    };
  }

  throw new Error(`Erro OpenAI gpt-image-1 (${res.status}): ${errText}`);
}
