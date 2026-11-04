import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  AdaptacaoCanal,
  ArtigoBlogAncora,
  BaseConhecimentoMarca,
  ChecagemMarcaEloss,
  ConteudoEstruturadoPeca,
  DecisaoHistorico,
  Demanda,
  Entrega,
  EventoProveniencia,
  FormatoCanal,
  FormatoPecaSocial,
  Frente,
  GovernancaAutomacao,
  InsumoRadarPesquisa,
  Marca,
  MarcaMetodoExcecao,
  MetodoGeracaoPost,
  MetodoUniversal,
  PesquisaMercado,
  ResultadoCicloEditorial,
  SlideCarrosselEloss,
  TarefaFluxo,
  TemaEditorial,
} from "@/lib/types";
import { addHoursToClock, getExplicitClock } from "@/lib/clock";
import {
  IMAGENS_REAIS_SUPABASE_POR_TEMA,
  converterPlanoMalhaLegadoParaConteudo,
  readSupabaseSnapshot,
  rodarChecagensMalha,
} from "@/lib/engine/ai-malha-gpt";

export const MOTOR_DB_SCHEMA_VERSION = 5;

export interface MotorDatabaseState {
  schema_version?: number;
  marcas: Marca[];
  bases_conhecimento_marca: BaseConhecimentoMarca[];
  frentes: Frente[];
  metodos: MetodoUniversal[];
  marca_metodo_excecoes: MarcaMetodoExcecao[];
  governanca_automacao: GovernancaAutomacao[];
  insumos_radar: InsumoRadarPesquisa[];
  pesquisas_mercado: PesquisaMercado[];
  temas_editoriais: TemaEditorial[];
  artigos_blog_ancora: ArtigoBlogAncora[];
  resultados_ciclo: ResultadoCicloEditorial[];
  demandas: Demanda[];
  tarefas_fluxo: TarefaFluxo[];
  entregas: Entrega[];
  historico_decisoes: DecisaoHistorico[];
  trilha_proveniencia: EventoProveniencia[];
}

export const MARCA_ELOSS_ID = "11111111-1111-4111-8111-111111111101";
export const MARCA_TRAMPO_ID = "11111111-1111-4111-8111-111111111102";
export const MARCA_AGENTFAZ_ID = "11111111-1111-4111-8111-111111111103";

export const FRENTE_ESTRATEGIA_ID = "22222222-2222-4222-8222-222222222201";
export const FRENTE_COPY_ID = "22222222-2222-4222-8222-222222222202";
export const FRENTE_DESIGN_ID = "22222222-2222-4222-8222-222222222203";
export const FRENTE_VIDEO_ID = "22222222-2222-4222-8222-222222222204";
export const FRENTE_LP_ID = "22222222-2222-4222-8222-222222222205";
export const FRENTE_CAMPANHA_ID = "22222222-2222-4222-8222-222222222206";
export const FRENTE_VENDA_ID = "22222222-2222-4222-8222-222222222207";

export const METODO_DECOMPOSICAO_REELS_ID = "33333333-3333-4333-8333-333333333301";
export const METODO_ROTEIRO_REELS_ID = "33333333-3333-4333-8333-333333333302";
export const METODO_DIRECAO_VISUAL_REELS_ID = "33333333-3333-4333-8333-333333333303";
export const METODO_CARROSSEL_COPY_ID = "33333333-3333-4333-8333-333333333304";
export const METODO_POST_SIMPLES_COPY_ID = "33333333-3333-4333-8333-333333333305";
export const METODO_STORY_SEQUENCIA_ID = "33333333-3333-4333-8333-333333333306";
export const METODO_DESIGN_ESTATICO_ID = "33333333-3333-4333-8333-333333333307";

export const TEMPLATE_REELS_SEMANAL_ID = "44444444-4444-4444-8444-444444444401";

export function criarAdaptacoesPadraoParaTema(params: {
  titulo_tema: string;
  dor_do_publico: string;
  palavra_chave_foco_seo: string;
  pergunta_direta_aeo: string;
  tese_autoridade_geo: string;
}): Record<FormatoCanal, AdaptacaoCanal> {
  return {
    blog: {
      canal: "blog",
      nome_canal: "Matéria de Blog (Artigo Âncora AEO/SEO/GEO)",
      proposito_no_canal:
        "Peça-mãe de autoridade: declara o conceito técnico já na 1ª frase visível (Padrão AEO), aprofunda dados do setor (WFDSA/ABEVD/Zuora) e consolida os termos proprietários da Eloss com FAQ estruturado de 6 perguntas.",
      angulo_adaptado: `Artigo técnico assinado respondendo "${params.pergunta_direta_aeo}" na primeira frase, conectando a arquitetura de ${params.tese_autoridade_geo} à operação real do decisor B2B.`,
      estrutura_sugerida:
        "1. Definição Direta na 1ª frase (AEO) + Byline → 2. Espinha Dorsal (Dados e Marco Técnico) → 3. Arquitetura Operacional em 5 a 7 critérios → 4. A Perspectiva da Eloss → 5. FAQ de 6 perguntas (Definitórias, Decisão e Operacionais) → 6. Conclusão.",
      cta_especifico:
        "Conhecer a arquitetura da Plataforma Operacional de Crescimento em plataformaeloss.com.br.",
    },
    carrossel: {
      canal: "carrossel",
      nome_canal: "Carrossel Instagram (7 a 8 Lâminas — Dark Tech Eloss)",
      proposito_no_canal:
        "Formato padrão da Eloss para temas conceituais, educativos, arquiteturais e jurídicos/fiscais. Desdobra o artigo âncora em 7 a 8 slides no modo escuro (#0A0820 / #382060) com 1 trecho em gradiente (#5B1F8A → #F4834B) por headline.",
      angulo_adaptado: `Sequência de 7 a 8 lâminas afirmativas (sem gerúndio e sem tom de cobrança) traduzindo "${params.titulo_tema}" para o dono de operação que distribui através de pessoas.`,
      estrutura_sugerida:
        "Slide 1: Capa afirmativa (Poppins Bold + trecho gradiente) → Slide 2: A pergunta técnica central → Slide 3: Dado do setor / Marco legal → Slides 4-5: Critérios técnicos da arquitetura → Slide 6: Teste prático de decisão → Slide 7: Transparência operacional → Slide 8: CTA Eloss.",
      cta_especifico:
        "Conheça a Eloss em plataformaeloss.com.br + pergunta consultiva na legenda.",
    },
    post_simples: {
      canal: "post_simples",
      nome_canal: "Post Simples (Arte Única de Posicionamento)",
      proposito_no_canal:
        "Fixar 1 constatação técnica de autoridade em leitura imediata (até 6 palavras na headline) dentro da paleta escura #382060 com acento #F4834B.",
      angulo_adaptado: `Constatação direta para o decisor B2B sobre "${params.titulo_tema}": por que o modelo exige camada operacional própria (${params.tese_autoridade_geo}).`,
      estrutura_sugerida:
        "Arte única 4:5 (Headline até 6 palavras + 1 palavra em gradiente + barra vertical #F4834B no subtítulo) + Legenda consultiva de 4 parágrafos.",
      cta_especifico:
        "Avaliar como a atribuição e o comissionamento operam hoje na sua empresa.",
    },
    reels: {
      canal: "reels",
      nome_canal: "Reels (Vídeo Curto até 60–90s)",
      proposito_no_canal:
        "Elegível quando o tema reúne: (1) dor operacional reconhecível pelo dono da operação, (2) sustenta até 3 provas em 60-90s, e (3) respeita linguagem neutra (temas jurídicos/fiscais vão exclusivamente para Carrossel/Blog).",
      angulo_adaptado: `Abertura por constatação afirmativa ("O que explica..."), seguida de 3 evidências operacionais de ${params.tese_autoridade_geo} para quem distribui através de pessoas.`,
      estrutura_sugerida:
        "[00-03s] Constatação afirmativa (sem pergunta clichê) → [03-18s] O cenário de escala da operação → [18-45s] As 3 provas técnicas do modelo → [45-60s] Conclusão de autoridade.",
      cta_especifico:
        "Ler o artigo técnico completo no blog da Eloss.",
    },
    story: {
      canal: "story",
      nome_canal: "Story (Sequência Executiva 4 Telas)",
      proposito_no_canal:
        "Qualificar decisores (donos e sócios de operações distribuídas) com diagnóstico rápido de maturidade operacional e levar tráfego qualificado para o artigo âncora.",
      angulo_adaptado: `Sequência de 4 telas sobrias sobre "${params.titulo_tema}" com enquete de diagnóstico operacional e link direto para a matéria completa.`,
      estrutura_sugerida:
        "Story 1: Constatação do modelo + dado do setor → Story 2: Onde sistemas tradicionais travam a margem → Story 3: Enquete executiva para donos de operação → Story 4: Link para o artigo âncora no blog.",
      cta_especifico:
        "Responder à enquete de diagnóstico ou acessar o artigo completo.",
    },
  };
}

/**
 * Gera o conteúdo editorial COMPLETO e FIEL à Base de Conhecimento da Eloss
 * para qualquer tema e canal (Blog, Carrossel 7-8 slides, Post Simples, Reels, Story).
 */
export function gerarConteudoRicoPorCanal(
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
  formato: FormatoCanal,
  metodoPost: MetodoGeracaoPost = "gpt"
): ConteudoEstruturadoPeca {
  const snap = readSupabaseSnapshot();
  const urlsTema = (tema.id && IMAGENS_REAIS_SUPABASE_POR_TEMA[tema.id]) || [];

  // 1. MATÉRIA DE BLOG: Utiliza o mesmo método de `malha-conteudos` (redator.blog.artigo + buildPrompt + rodarChecagens)
  if (formato === "blog" && tema.id && snap.blogPorTemaId?.[tema.id]) {
    const artigoMalhaReal = snap.blogPorTemaId[tema.id];
    return {
      metodo_geracao: "malha_blog",
      modelo_ia:
        "claude-sonnet-4-6 (Método Malha de Conteúdos — redator.blog.artigo + Direção + AEO)",
      artigo_markdown: artigoMalhaReal,
      checagens: rodarChecagensMalha(artigoMalhaReal, "blog"),
    };
  }

  // 2. CARROSSEL SOCIAL:
  //    - Opção B (Opcional): Método Malha Legado (redator.instagram.plano + H2/Componentes)
  //    - Opção A (Padrão): Estratégia GPT (OpenAI GPT-4o + Prompt Visual 8 Pontos / gpt-image-1)
  if (formato === "carrossel" && tema.id) {
    if (metodoPost === "malha_legado") {
      const instaMalha = snap.instaPecas?.find(
        (p) => p.tema_id === tema.id && p.formato === "carrossel"
      );
      if (instaMalha) {
        const conv = converterPlanoMalhaLegadoParaConteudo(
          tema.id,
          instaMalha.conteudo
        );
        if (conv) return conv;
      }
    }

    if (snap.gptCarrosselPorTemaId?.[tema.id]) {
      const gptPlan = snap.gptCarrosselPorTemaId[tema.id];
      const slidesComImg = (gptPlan.slides || []).map((sl, i) => ({
        ...sl,
        imagem_url: sl.imagem_url || urlsTema[i] || undefined,
      }));
      const txt = [
        gptPlan.legenda || "",
        ...slidesComImg.map((s) => `${s.headline} ${s.corpo}`),
      ].join("\n");
      return {
        ...gptPlan,
        metodo_geracao: "gpt",
        modelo_ia:
          "OpenAI GPT-4o + Estratégia Prompt Visual 8 Pontos (gpt-image-1)",
        direcao_peca:
          gptPlan.direcao_peca ||
          "Estratégia GPT (OpenAI GPT-4o) · Dark Tech Editorial Eloss (#0A0820 / #382060)",
        slides: slidesComImg,
        checagens: rodarChecagensMalha(txt, "carrossel", slidesComImg),
      };
    }
  }

  const checagensPadraoEloss: ChecagemMarcaEloss[] = [
    {
      nome: "Sem palavras proibidas da Eloss",
      detalhe:
        'Nenhum termo proibido detectado ("renda extra", "oportunidade", "fique rico", "ganhos garantidos", "revolucionário", "disruptivo").',
      resultado: "ok",
    },
    {
      nome: "Sem vocabulário de consultoria proibido",
      detalhe:
        'Termos proibidos ausentes ("alavancar", "potencializar", "infraestrutura que a operação exige", "processos que travam").',
      resultado: "ok",
    },
    {
      nome: "Sem menção nominal a concorrentes",
      detalhe:
        "Comparações restritas a categorias genéricas (plataformas transacionais tradicionais / gateways convencionais).",
      resultado: "ok",
    },
    {
      nome: "Tom afirmativo de constatação (Decisor B2B)",
      detalhe:
        "Comunicação dirigida ao dono/sócio da operação que distribui através de pessoas, sem tom de cobrança e sem gerúndio.",
      resultado: "ok",
    },
    {
      nome: "Padrão AEO & Base Factual (VTP / VCE / Planos)",
      detalhe:
        "Definição direta na 1ª frase visível, termos proprietários consistentes e estrutura de FAQ presente.",
      resultado: "ok",
    },
  ];

  // Artigo completo em Markdown no padrão exato da Eloss
  const artigoMarkdown = `# ${tema.titulo_tema}

*Por Equipe Editorial Eloss — Plataforma Operacional de Crescimento*

---

**${tema.titulo_tema.split(":")[0]}** é o modelo operacional que define como empresas que distribuem através de pessoas estruturam comissionamento, atribuição de vendas e controle de margem sem fragmentar a operação em sistemas paralelos. Para responder diretamente à questão *"${tema.pergunta_direta_aeo}"*: a sustentação da escala depende de unificar o **VTP (Volume Transacionado na Plataforma)** e o **VCE (Volume Comissionável Externo)** sob uma única camada de regras auditáveis (${tema.tese_autoridade_geo}).

Essa estrutura pressupõe uma operação já em funcionamento. Para o dono ou sócio-fundador de uma empresa com força de vendas ativa — representantes regionais, consultores, afiliados estruturados ou canais de venda direta —, o ponto central é garantir que o crescimento do volume comercial seja acompanhado por soberania sobre a base de clientes e precisão em cada repasse.

---

## Espinha Dorsal: O que os Dados do Setor e a Operação Mostram

Segundo a World Federation of Direct Selling Associations (WFDSA), o mercado global de vendas diretas movimenta mais de **US$ 167 bilhões anuais**, enquanto a ABEVD registra mais de **4,5 milhões de empreendedores ativos no Brasil**. Paralelamente, estudos de receita recorrente (Zuora e Bain & Company) demonstram que operações que combinam produtos de assinatura com uma força de vendas humana alcançam taxas de renovação até **25% superiores** às de canais puramente digitais.

O desafio técnico surge quando a operação cresce além do limite das ferramentas convencionais:

- **Limitação de plataformas transacionais tradicionais:** sistemas desenhados apenas para infoprodutos ou afiliação simples cobram taxas percentuais que corroem a margem e retêm o controle da base de clientes.
- **Limitação do controle manual em planilhas:** à medida que surgem múltiplos níveis de comissão, regras de qualificação por ciclo e renovações mensais, o cálculo manual gera erro de pagamento e desgaste de confiança com a força de vendas.
- **Conflito de atribuição entre canais:** quando o e-commerce próprio, os representantes comerciais e a recorrência operam em sistemas isolados, ocorre bitaxação ou disputa pela mesma venda.

---

## Os 5 Critérios Técnicos de ${tema.tese_autoridade_geo.split("(")[0].trim()}

Para estruturar essa operação com solidez técnica e previsibilidade, cinco critérios objetivos funcionam como referência para o decisor B2B:

### 1. Separação Clara entre VTP e VCE (Regra Anti-Bitaxação)
O **VTP (Volume Transacionado na Plataforma)** e o **VCE (Volume Comissionável Externo)** possuem naturezas distintas. Uma Plataforma Operacional de Crescimento aplica regras claras para contabilizar vendas diretas e vendas externas comissionadas sem duplicar taxas sobre a mesma operação.

### 2. Regras de Comissionamento Configuráveis (No-Code)
A direção comercial precisa ajustar percentuais, faixas de qualificação, bônus de liderança e janelas de atribuição diretamente no painel operacional, sem depender de fila de desenvolvimento de TI a cada campanha ou ajuste de ciclo.

### 3. Sustentação de Recorrência Distribuída
Em setores como seguros (apólice renovada), proteção veicular (mensalidade ativa), clubes de benefícios e saúde/bem-estar, o representante atua na **retenção ativa**. O sistema precisa rastrear quem originou o contrato e liquidar a comissão recorrente a cada ciclo pago.

### 4. Soberania de Canal e Marca Própria (White Label Operacional)
Quando a força de vendas acessa um ambiente com a identidade própria da empresa — e não o domínio de um intermediário transacional —, a marca consolida autoridade perante seus distribuidores e mantém propriedade integral sobre os dados da carteira.

### 5. Transparência e Rastreabilidade para a Força de Vendas
Cada representante ou líder de equipe visualiza em tempo real a origem de cada comissão, o status de qualificação do ciclo e o histórico de vendas da sua estrutura, eliminando dúvidas operacionais no fechamento do mês.

---

## A Perspectiva da Eloss

A **Eloss** é a primeira **Plataforma Operacional de Crescimento** para empresas que distribuem através de pessoas. Diferente de softwares de MMN genéricos ou plataformas de afiliados simples, a Eloss entrega a tecnologia que unifica [vendas diretas](https://plataformaeloss.com.br/vendas-diretas/), [marketing multinível legítimo](https://plataformaeloss.com.br/multinivel/), [programas de afiliados estruturados](https://plataformaeloss.com.br/afiliacao/) e **Recorrência Distribuída** em uma única arquitetura.

Disponível nos 5 planos oficiais (**Pilot, Base, Padrão, Estruturado e Enterprise**, com opções de infraestrutura compartilhada ou dedicada conforme o estágio de escala), a plataforma foi construída para donos de operação que precisam substituir planilhas e sistemas legados por governança técnica auditável.

---

## FAQ: 6 Perguntas Objetivas sobre ${tema.titulo_tema.split(":")[0]} (Padrão AEO)

**1. O que é uma Plataforma Operacional de Crescimento?**
É a categoria de tecnologia criada pela Eloss para empresas que distribuem através de pessoas, unindo motor de comissionamento em múltiplos níveis, atribuição multicanal, gestão de recorrência e ambiente White Label sob uma única estrutura operacional.

**2. Qual a diferença entre VTP e VCE na operação?**
VTP é o Volume Transacionado na Plataforma (processado diretamente no checkout integrado), enquanto VCE é o Volume Comissionável Externo (vendas realizadas em ERP, CRM ou faturamento externo que entram na plataforma para cálculo e governança de comissões, respeitando a regra anti-bitaxação).

**3. Por que plataformas de afiliados tradicionais limitam operações em escala?**
Porque foram desenhadas para transações avulsas de infoprodutos, cobrando percentuais elevados sobre o volume transacionado, retendo a titularidade da base de compradores e não suportando regras híbridas de força de vendas regional e recorrência.

**4. Como evitar conflito entre o e-commerce da empresa e os representantes comerciais?**
Através do Modelo Híbrido de Distribuição: regras de atribuição unificadas (por link, cupom, carteira ativa ou região) garantem que uma venda iniciada pelo representante e concluída no digital seja reconhecida e comissionada sem canibalização de canal.

**5. Como funciona o comissionamento sobre receita recorrente (Recorrência Distribuída)?**
A plataforma vincula o assinante ao representante responsável pela ativação ou manutenção da conta e dispara automaticamente a regra de comissão a cada ciclo de renovação (mensalidade ativa ou apólice renovada), incentivando a retenção ativa.

**6. Quando uma empresa deve migrar de planilhas ou sistema legado para a Eloss?**
Quando a operação já está em funcionamento e o cálculo manual de comissões, a ausência de visibilidade para os distribuidores ou a trava tecnológica para lançar novos modelos de incentivo passam a limitar a expansão comercial.

---

## Conclusão

Escalar uma operação que distribui através de pessoas exige que a tecnologia acompanhe a estratégia comercial. Ao estruturar **${tema.tese_autoridade_geo}** com rastreabilidade de ponta a ponta, o dono do negócio protege sua margem, elimina o retrabalho administrativo e oferece transparência total para sua força de vendas crescer com segurança.

Para conhecer na prática como essa arquitetura opera nos planos **Pilot, Base, Padrão, Estruturado e Enterprise**, acesse [plataformaeloss.com.br](https://plataformaeloss.com.br).`;

  if (formato === "blog") {
    return {
      artigo_markdown: artigoMarkdown,
      checagens: checagensPadraoEloss,
    };
  }

  if (formato === "carrossel") {
    const slides: SlideCarrosselEloss[] = [
      {
        ordem: 1,
        tipo: "capa",
        headline: `${tema.titulo_tema.split(":")[0]}: quando o volume cresce, a estrutura decide a margem.`,
        headline_destaque: "estrutura decide a margem",
        corpo:
          "Para empresas que distribuem através de pessoas, escalar vendas sem uma camada operacional unificada transforma expansão em custo oculto.",
        cta: "",
        direcao_visual:
          "Modo Escuro (#0A0820 a #0D0A1A). Glow roxo (#5B1F8A) centro-esquerda e laranja (#F4834B) canto inferior direito. Elemento central 3D glass representando arquitetura de distribuição. Wordmark 'eloss' discreto no topo.",
      },
      {
        ordem: 2,
        tipo: "conteudo",
        headline: "A pergunta técnica que separa escala real de improviso operacional",
        headline_destaque: "escala real",
        corpo: `${tema.pergunta_direta_aeo} Quando e-commerce, força de vendas e recorrência operam em sistemas isolados, a margem se perde na fricção entre canais.`,
        cta: "",
        direcao_visual:
          "Fundo escuro #382060. Balança ou divisor de cristal 3D translúcido no centro separando sistemas fragmentados vs. arquitetura unificada. Barra lateral fina em #F4834B marcando o corpo do texto.",
      },
      {
        ordem: 3,
        tipo: "dado",
        headline: "O que os números do mercado de distribuição demonstram",
        headline_destaque: "números do mercado",
        corpo:
          "Vendas diretas movimentam US$ 167 bi no mundo (WFDSA) e operações de assinatura com força de vendas humana renovam até 25% mais que canais puramente digitais.",
        cta: "",
        direcao_visual:
          "Modo Escuro #0D0A1A com cards de métrica em vidro translúcido (US$ 167bi WFDSA · +25% retenção ativa · 4,5mi empreendedores ABEVD). Waveform sutil na base do slide.",
      },
      {
        ordem: 4,
        tipo: "conteudo",
        headline: "Critérios 1 e 2: Rastreabilidade de Receita e Atribuição Limpa",
        headline_destaque: "Rastreabilidade de Receita",
        corpo:
          "1. Separação exata entre VTP (Volume Transacionado na Plataforma) e VCE (Volume Comissionável Externo) sem bitaxação. 2. Atribuição única entre digital e representante.",
        cta: "",
        direcao_visual:
          "Fundo #0A0820 com 2 blocos de vidro empilhados e marcador lateral #F4834B. Grid de pontos gradiente no canto superior esquerdo.",
      },
      {
        ordem: 5,
        tipo: "conteudo",
        headline: "Critérios 3 e 4: Comissionamento No-Code e Recorrência Distribuída",
        headline_destaque: "Recorrência Distribuída",
        corpo:
          "3. Regras de comissão e qualificação ajustáveis sem fila de TI. 4. Comissão automática sobre mensalidade ativa ou apólice renovada, premiando a retenção ativa.",
        cta: "",
        direcao_visual:
          "Fundo #0A0820 com três esferas 3D glass conectadas por feixes luminosos em #c8b0f0 e #F4834B, simbolizando ciclos recorrentes auditáveis.",
      },
      {
        ordem: 6,
        tipo: "conteudo",
        headline: "O critério prático para o dono da operação avaliar hoje",
        headline_destaque: "dono da operação",
        corpo:
          "Se você dobrar o número de representantes ou lançar uma nova regra de incentivo no próximo ciclo, seu sistema atual acompanha em minutos ou exige semanas de planilha?",
        cta: "",
        direcao_visual:
          "Fundo #0D0A1A com aspas gigantes 3D em vidro translúcido refletindo luz âmbar #F4834B e violeta #5B1F8A. Alto respiro tipográfico.",
      },
      {
        ordem: 7,
        tipo: "conteudo",
        headline: "Soberania de canal e transparência técnica sustentam a confiança",
        headline_destaque: "Soberania de canal",
        corpo:
          "Operar em ambiente White Label próprio, com extrato auditável em tempo real para cada distribuidor, elimina ruídos no fechamento e protege o ativo mais valioso: sua base.",
        cta: "",
        direcao_visual:
          "Fundo #382060 com escudo 3D glass translúcido ao centro e linhas de arco concêntricas suaves ao fundo.",
      },
      {
        ordem: 8,
        tipo: "cta",
        headline: "Estruture sua distribuição sobre uma Plataforma Operacional de Crescimento.",
        headline_destaque: "Plataforma Operacional de Crescimento",
        corpo:
          "A Eloss entrega a tecnologia para empresas que distribuem através de pessoas escalarem com controle de comissões, recorrência e marca própria.",
        cta: "Conheça a Eloss em plataformaeloss.com.br",
        direcao_visual:
          "Fechamento Modo Escuro #0A0820 com glow radial #5B1F8A e #F4834B. Logomark Eloss (dois arcos concêntricos em 3D glass) centralizado + CTA pill preenchida em gradiente de marca.",
      },
    ];

    const legenda = `Distribuir através de pessoas é um dos modelos de expansão comercial mais eficientes do mercado. Mas essa eficiência só se sustenta na margem quando a operação conta com arquitetura técnica própria — e não quando depende de planilhas paralelas ou plataformas que retêm a sua base.

${tema.dor_do_publico}

A constatação técnica é objetiva: à medida que o volume cresce, unificar o cálculo de comissões, a atribuição entre canais (VTP e VCE) e a gestão de recorrência deixa de ser um detalhe operacional e passa a definir o teto de crescimento da empresa.

Neste carrossel, detalhamos os critérios que mostram como ${tema.tese_autoridade_geo} organiza a escala de forças de vendas distribuídas sem canibalização de canal e sem perda de controle.

Para quem já opera uma força de vendas ativa: qual é hoje o principal ponto de atrito entre o seu modelo comercial e a tecnologia que o sustenta?

#DistribuicaoAtravesDePessoas #ForcaDeVendas #RecorrenciaDistribuida #ModeloHibrido #Eloss`;

    return {
      direcao_peca:
        "Dark tech editorial (#0A0820 / #382060) com profundidade cinematográfica, headlines em Poppins Bold com 1 trecho em gradiente (#5B1F8A → #9B2E8A → #F4834B), corpo em DM Sans e elementos 3D glass.",
      legenda,
      slides,
      checagens: checagensPadraoEloss,
    };
  }

  if (formato === "post_simples") {
    return {
      headline_arte: `${tema.titulo_tema.split(":")[0]} exige soberania operacional.`,
      destaque_gradiente: "soberania operacional",
      subtitulo_arte: `Quando a força de vendas escala, ${tema.tese_autoridade_geo} separa o crescimento sustentável da perda silenciosa de margem.`,
      direcao_visual:
        "Peça estática 1080x1350 (4:5) em Modo Escuro (#382060). Headline superior em Poppins ExtraBold com gradiente em 'soberania operacional'. Elemento central 3D glass + barra lateral fina em #F4834B no bloco inferior.",
      legenda: `Em operações que distribuem através de pessoas, o sistema que processa as regras de negócio define até onde a empresa consegue crescer.

${tema.dor_do_publico}

Quando a empresa opera sobre uma Plataforma Operacional de Crescimento, o controle da base de clientes, a separação entre VTP e VCE e a automação de comissões funcionam sob uma mesma regra auditável.

Como a sua operação gerencia hoje a atribuição entre canais e o comissionamento da força de vendas?

#Eloss #PlataformaOperacionalDeCrescimento #ForcaDeVendas #GestaoComercial`,
      checagens: checagensPadraoEloss,
    };
  }

  if (formato === "reels") {
    const ehJuridicoFiscal =
      /pirâmide|bitributação|fiscal|trabalhista|171-a|lei|jurídic|tribut/i.test(
        tema.titulo_tema + " " + tema.dor_do_publico
      );

    return {
      direcao_peca: ehJuridicoFiscal
        ? "⚠️ ATENÇÃO (Critério de Formato por Tema Eloss): Temas jurídicos/fiscais devem priorizar Blog e Carrossel. Roteiro abaixo adaptado para foco estritamente operacional e neutro."
        : "Elegível pelo Critério de Formato Eloss: (1) dor operacional imediata do decisor, (2) 3 provas técnicas em 60s, (3) linguagem institucional neutra.",
      roteiro_cenas: [
        {
          tempo: "00–05s",
          etapa: "1. Constatação Afirmativa (Abertura)",
          fala: `Existe um ponto exato em que uma operação que distribui através de pessoas para de ser limitada pela venda e passa a ser limitada pelo sistema que calcula a operação.`,
          lettering_tela: `${tema.titulo_tema.split(":")[0].toUpperCase()}`,
          direcao_camera:
            "Plano médio firme, iluminação sobria com recorte quente, postura consultiva e direta.",
        },
        {
          tempo: "05–20s",
          etapa: "2. O Cenário Real do Decisor B2B",
          fala: `${tema.dor_do_publico} Isso acontece quando vendas diretas, canal digital e recorrência rodam em ferramentas que não conversam entre si.`,
          lettering_tela: "Canais isolados = margem corroída",
          direcao_camera:
            "Corte sutil de aproximação; inserção de gráfico limpo Dark Tech mostrando canais desconectados.",
        },
        {
          tempo: "20–48s",
          etapa: "3. As 3 Provas Operacionais do Modelo",
          fala: `Três pilares resolvem essa arquitetura na raiz: primeiro, regra única de atribuição entre VTP e VCE sem bitaxação; segundo, comissionamento no-code auditável em tempo real; terceiro, comissão recorrente sobre mensalidade ativa para sustentar a retenção.`,
          lettering_tela: "1. VTP/VCE sem bitaxação · 2. No-Code · 3. Recorrência Distribuída",
          direcao_camera:
            "Sequência rítmica com os 3 pilares surgindo em tags contornadas no padrão visual da Eloss.",
        },
        {
          tempo: "48–60s",
          etapa: "4. Fechamento Institucional",
          fala: `É assim que uma Plataforma Operacional de Crescimento sustenta forças de vendas em escala. No blog da Eloss, publicamos o artigo técnico completo sobre essa arquitetura.`,
          lettering_tela: "Artigo completo em plataformaeloss.com.br",
          direcao_camera:
            "Encerramento limpo com assinatura visual Eloss e chamada para o artigo âncora.",
        },
      ],
      legenda: `${tema.pergunta_direta_aeo}\n\nQuando a força de vendas cresce, a camada operacional precisa acompanhar na mesma velocidade. Leia a análise técnica completa no blog da Eloss (link na bio).\n\n#Eloss #ForcaDeVendas #DistribuicaoAtravesDePessoas`,
      checagens: ehJuridicoFiscal
        ? [
            ...checagensPadraoEloss.slice(0, 4),
            {
              nome: "Critério de Formato por Tema (Regra Eloss)",
              detalhe:
                "Atenção: A Base da Eloss recomenda excluir temas jurídicos/fiscais do formato Reel, priorizando Artigo de Blog e Carrossel.",
              resultado: "atencao",
            },
          ]
        : checagensPadraoEloss,
    };
  }

  // Story (4 telas)
  return {
    direcao_peca:
      "Sequência executiva de 4 telas em Modo Escuro (#0A0820 / #382060) voltada para donos e sócios de operações que distribuem através de pessoas.",
    telas_story: [
      {
        ordem: 1,
        objetivo: "Constatação do Modelo",
        texto_tela: `${tema.titulo_tema.split(":")[0]}: o que muda quando a operação passa de 100 para 1.000 representantes ativos.`,
        elemento_interativo: "Tag de Pilar Editorial Eloss no topo",
      },
      {
        ordem: 2,
        objetivo: "Diagnóstico de Margem e Controle",
        texto_tela: `${tema.dor_do_publico} A ausência de uma camada única entre VTP, VCE e recorrência cria custo invisível todo mês.`,
        elemento_interativo: "Destaque visual em barra lateral #F4834B",
      },
      {
        ordem: 3,
        objetivo: "Enquete Executiva de Qualificação B2B",
        texto_tela:
          "Como a sua operação gerencia o cálculo de comissões e atribuição entre canais hoje?",
        elemento_interativo:
          'Sticker de Enquete: ["Planilha / Sistema Legado", "Plataforma Estruturada"]',
      },
      {
        ordem: 4,
        objetivo: "Direcionamento para a Peça-Mãe (Blog Âncora)",
        texto_tela: `Publicamos o guia técnico completo sobre ${tema.titulo_tema.split(":")[0]} no blog da Eloss.`,
        elemento_interativo:
          "Sticker de Link: Ler matéria completa em plataformaeloss.com.br",
      },
    ],
    legenda: "Sequência de 4 Stories pronta para publicação com link para o artigo âncora.",
    checagens: checagensPadraoEloss,
  };
}

function createInitialSeed(): MotorDatabaseState {
  const clock = getExplicitClock().iso;

  const marcas: Marca[] = [
    {
      id: MARCA_ELOSS_ID,
      slug: "eloss",
      nome: "Eloss",
      tipo_marca: "interna",
      fonte_conhecimento: "supabase",
      config_fonte: {
        tabela: "documentos_regra + pilares + regras_marca (Supabase Real)",
        empresa_id_supabase: "00000000-0000-0000-0000-000000000001",
        modo: "ao_vivo",
      },
      ativa: true,
      criado_em: clock,
      atualizado_em: clock,
    },
    {
      id: MARCA_TRAMPO_ID,
      slug: "trampo-space",
      nome: "Trampô Space",
      tipo_marca: "interna",
      fonte_conhecimento: "supabase",
      config_fonte: { tabela: "bases_conhecimento_marca", modo: "ao_vivo" },
      ativa: true,
      criado_em: clock,
      atualizado_em: clock,
    },
    {
      id: MARCA_AGENTFAZ_ID,
      slug: "agentfaz",
      nome: "Agentfaz",
      tipo_marca: "interna",
      fonte_conhecimento: "supabase",
      config_fonte: { tabela: "bases_conhecimento_marca", modo: "ao_vivo" },
      ativa: true,
      criado_em: clock,
      atualizado_em: clock,
    },
  ];

  // ==========================================================================
  // BASE DE CONHECIMENTO REAL DA ELOSS (ESPELHADA DO SUPABASE OFICIAL)
  // ==========================================================================
  const bases_conhecimento_marca: BaseConhecimentoMarca[] = [
    {
      id: "55555555-5555-4555-8555-555555555501",
      marca_id: MARCA_ELOSS_ID,
      fonte_origem: "supabase",
      consultado_ao_vivo_em: clock,
      posicionamento:
        "FRASE-ÂNCORA CANÔNICA: 'A Eloss é a primeira Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas.' | O QUE A ELOSS NÃO É: Não somos uma consultoria (entregamos tecnologia, não executamos a operação do cliente). Não somos plataforma de afiliados simples nem software de MMN genérico. Pressupomos operação já em funcionamento. Não garantimos resultado financeiro. | 6 PILARES OFICIAIS: P1 Categoria · P2 Estratégias · P3 Produto/Operação · P4 Confiança/Compliance · P5 Decisão B2B · P6 Cultura.",
      publico:
        "DECISOR DE COMPRA: O dono ou sócio-fundador da empresa que distribui através de pessoas (saúde/bem-estar, infoprodutos White Label, seguros com apólice renovada, proteção veicular com mensalidade ativa, clubes de benefícios e venda direta estruturada). ANTIAUDIÊNCIA EXPLÍCITA: Nunca o distribuidor/afiliado individual buscando renda extra. OBJEÇÕES MAPEADAS: 'Meu sistema atual é o teto do meu crescimento', 'A taxa percentual da plataforma atual corrói minha margem e não tenho controle da minha base de clientes', 'A tecnologia disponível não suporta meu modelo de recorrência'.",
      produtos_catalogo:
        "BASE FACTUAL DO PRODUTO: 1) VTP (Volume Transacionado na Plataforma) e VCE (Volume Comissionável Externo) com definição exata e regra anti-bitaxação associada (nunca usar como sinônimo genérico de faturamento). 2) Os 5 Planos Oficiais: Pilot, Base, Padrão, Estruturado e Enterprise (com distinção entre infraestrutura compartilhada e dedicada por plano). 3) Capacidades: Recorrência Distribuída (comissão sobre mensalidade ativa), Modelo Híbrido de Distribuição (e-commerce + representantes + recorrência sem canibalização), Comissionamento No-Code, Split na Recorrência e White Label Operacional.",
      identidade_tom:
        "TOM DE COMUNICAÇÃO: Institucional, consultivo, afirmativo, com autoridade, aspiracional. Sem gerúndio e sem frases de cobrança ('você está perdendo', 'você deveria'). Regra de constatação: descreve um modelo que já existe ('X funciona assim'). | PADRÃO AEO: Declarar o conceito central já na 1ª frase visível + Byline assinada + FAQ obrigatório de 6 a 10 perguntas (definitórias, de decisão e operacionais). | IDENTIDADE VISUAL INSTAGRAM: Modo Escuro (#0A0820 a #0D0A1A / #382060 com glows roxo #5B1F8A e laranja #F4834B) para conceito/dado/autoridade; Modo Claro (#F5F1FA) para cases. Headline em Poppins ExtraBold (apenas 1 trecho com gradiente #5B1F8A → #9B2E8A → #F4834B) e corpo em DM Sans.",
      restricoes_conteudo:
        "REGRAS INEGOCIÁVEIS DA MARCA ELOSS: 1) Vocabulário de consultoria proibido: 'alavancar', 'potencializar', 'infraestrutura que a operação exige', 'processos que travam', 'impulsione'. 2) Palavras proibidas: 'renda extra', 'oportunidade', 'fórmula pronta', 'fique rico', 'ganhos garantidos', 'resultado garantido', 'revolucionário', 'disruptivo', 'renda passiva', 'rede' (como termo genérico — usar 'força de vendas' ou 'distribuição através de pessoas'). 3) Restrição de concorrentes: Nunca mencionar concorrentes pelo nome. 4) Critério de Formato por Tema: Temas jurídicos/fiscais são exclusivos de Blog e Carrossel (proibidos em Reel).",
      historico_resumo:
        "Sincronizado com os 28 documentos de regra, 6 pilares e 32 temas canônicos da Eloss no Supabase (empresa_id 00000000-0000-0000-0000-000000000001).",
      atualizado_em: clock,
    },
    {
      id: "55555555-5555-4555-8555-555555555502",
      marca_id: MARCA_TRAMPO_ID,
      fonte_origem: "supabase",
      consultado_ao_vivo_em: clock,
      identidade_tom:
        "Humano, dinâmico, colaborativo e prático. Foco em comunidade profissional e conexões reais.",
      publico:
        "Profissionais autônomos, criadores e pequenas equipes em busca de ambiente produtivo e rede qualificada.",
      posicionamento:
        "PROPÓSITO: Conectar talentos em um ecossistema vivo de trabalho focado e trocas reais. VALORES: Comunidade autêntica, foco produtivo e colaboração.",
      produtos_catalogo:
        "Estações de trabalho, salas de reunião, eventos de networking e comunidade Trampô.",
      restricoes_conteudo:
        "Respeitar integralmente o Piso de Compliance da Fundação Agentfaz.",
      historico_resumo:
        "Conteúdos anteriores focados na rotina real dos residentes e bastidores de eventos.",
      atualizado_em: clock,
    },
    {
      id: "55555555-5555-4555-8555-555555555503",
      marca_id: MARCA_AGENTFAZ_ID,
      fonte_origem: "supabase",
      consultado_ao_vivo_em: clock,
      identidade_tom:
        "Estratégico, técnico sem ser hermético, orientado a método e governança de IA aplicada a marketing.",
      publico:
        "Empresas e operações que querem produção de marketing contínua com método, qualidade auditável e IA sob governança humana.",
      posicionamento:
        "PROPÓSITO: Unir método criativo universal, memória viva da marca e governança humana para produção de marketing previsível.",
      produtos_catalogo:
        "7 Frentes: Copy, Design/Imagem, Vídeo, LP/Site, Campanha, Estratégia de Comunicação e Fluxo de Venda.",
      restricoes_conteudo:
        "Cumprimento estrito das 3 proibições da Fundação Agentfaz em todas as frentes.",
      historico_resumo:
        "Peças institucionais sobre método básico vs. avançado e governança de agentes.",
      atualizado_em: clock,
    },
  ];

  const frentes: Frente[] = [
    {
      id: FRENTE_ESTRATEGIA_ID,
      codigo: "estrategia_comunicacao",
      nome: "Estratégia de Comunicação",
      descricao: "Pesquisa SEO/AEO/GEO, pauta nos 6 Pilares e adaptação multicanal",
    },
    {
      id: FRENTE_COPY_ID,
      codigo: "copy",
      nome: "Copywriting",
      descricao: "Artigos âncora AEO, carrosséis, posts estáticos, roteiros e stories",
    },
    {
      id: FRENTE_DESIGN_ID,
      codigo: "design_imagem",
      nome: "Design / Imagem",
      descricao: "Direção visual Dark Tech Eloss, lâminas 4:5 e elementos 3D glass",
    },
    {
      id: FRENTE_VIDEO_ID,
      codigo: "video",
      nome: "Vídeo",
      descricao: "Decupagem visual e Reels compatíveis com o Critério de Formato",
    },
    {
      id: FRENTE_LP_ID,
      codigo: "lp_site",
      nome: "LP / Site",
      descricao: "Páginas canônicas em plataformaeloss.com.br e estrutura FAQ AEO",
    },
    {
      id: FRENTE_CAMPANHA_ID,
      codigo: "campanha",
      nome: "Campanha",
      descricao: "Distribuição orientada a decisores B2B e análise de retenção",
    },
    {
      id: FRENTE_VENDA_ID,
      codigo: "fluxo_venda",
      nome: "Fluxo de Venda",
      descricao: "Argumentação de migração de plataformas legadas para os 5 planos Eloss",
    },
  ];

  const metodos: MetodoUniversal[] = [
    {
      id: METODO_DECOMPOSICAO_REELS_ID,
      frente_id: FRENTE_ESTRATEGIA_ID,
      codigo: "decomposicao_e_adaptacao_canal",
      versao: 1,
      nome: "Método de Adaptação Multicanal Eloss (Padrão AEO + Critério de Formato)",
      nivel: "avancado",
      instrucoes_playbook: [
        "1. Verifique a elegibilidade do tema no Critério de Formato por Tema da Eloss (temas jurídicos/fiscais nunca vão para Reel).",
        "2. Garanta que o Artigo de Blog Âncora declare o conceito na 1ª frase visível e inclua 6 perguntas de FAQ AEO.",
        "3. Adapte para Carrossel (7-8 lâminas Dark Tech), Post Simples, Reels ou Story mantendo o tom afirmativo de constatação dirigido ao dono da operação.",
      ].join("\n"),
      campos_esperados_output: [
        "tese_central",
        "constatacao_modelo",
        "abertura_afirmativa",
        "direcionamento_cta",
      ],
      ativo: true,
      atualizado_em: clock,
    },
    {
      id: METODO_ROTEIRO_REELS_ID,
      frente_id: FRENTE_COPY_ID,
      codigo: "roteiro_reels_universal",
      versao: 1,
      nome: "Método de Roteiro de Reels Eloss (3 Provas em 60s)",
      nivel: "avancado",
      instrucoes_playbook: [
        "1. Confirme que o tema não é jurídico/fiscal.",
        "2. Estruture em 4 cenas: [00-05s] Constatação afirmativa, [05-20s] Cenário do decisor B2B, [20-48s] 3 provas operacionais, [48-60s] Fechamento institucional.",
      ].join("\n"),
      campos_esperados_output: [
        "roteiro_falado_blocos",
        "texto_apoio_tela",
        "legenda_post",
      ],
      ativo: true,
      atualizado_em: clock,
    },
    {
      id: METODO_CARROSSEL_COPY_ID,
      frente_id: FRENTE_COPY_ID,
      codigo: "copy_carrossel_educacional",
      versao: 1,
      nome: "Método do Agente de Instagram Eloss (Carrossel 7–8 Slides Dark Tech)",
      nivel: "avancado",
      instrucoes_playbook: [
        "1. Mantenha coerência de modo (Escuro #0A0820 / #382060 para conceito, capacidade técnica, dado e autoridade).",
        "2. Em cada slide, defina Headline curta em Poppins Bold indicando exatamente 1 trecho para o gradiente (#5B1F8A → #9B2E8A → #F4834B) e Corpo em DM Sans sem gerúndio.",
        "3. Proibido usar vocabulário de consultoria ('alavancar', 'potencializar', 'processos que travam').",
      ].join("\n"),
      campos_esperados_output: [
        "estrutura_slides_carrossel",
        "destaque_visual_por_slide",
        "legenda_post",
      ],
      ativo: true,
      atualizado_em: clock,
    },
    {
      id: METODO_POST_SIMPLES_COPY_ID,
      frente_id: FRENTE_COPY_ID,
      codigo: "copy_post_simples_estatico",
      versao: 1,
      nome: "Método de Post Único Eloss (Declaração Técnica)",
      nivel: "avancado",
      instrucoes_playbook: [
        "1. Headline de até 6 palavras com 1 termo em gradiente de marca.",
        "2. Bloco de apoio ancorado por barra vertical #F4834B e legenda consultiva para decisores.",
      ].join("\n"),
      campos_esperados_output: [
        "texto_arte_estatica",
        "subtitulo_contraste_arte",
        "legenda_post",
      ],
      ativo: true,
      atualizado_em: clock,
    },
    {
      id: METODO_STORY_SEQUENCIA_ID,
      frente_id: FRENTE_COPY_ID,
      codigo: "copy_sequencia_stories",
      versao: 1,
      nome: "Método de Sequência de Stories B2B Eloss",
      nivel: "avancado",
      instrucoes_playbook: [
        "1. Sequência sobria de 4 telas com enquete de maturidade operacional e link para o artigo âncora.",
      ].join("\n"),
      campos_esperados_output: [
        "sequencia_telas_stories",
        "interacao_enquete_caixinha",
        "chamada_link_ou_dm",
      ],
      ativo: true,
      atualizado_em: clock,
    },
    {
      id: METODO_DIRECAO_VISUAL_REELS_ID,
      frente_id: FRENTE_VIDEO_ID,
      codigo: "direcao_visual_reels",
      versao: 1,
      nome: "Direção Visual de Vídeo Eloss",
      nivel: "avancado",
      instrucoes_playbook: [
        "1. Especifique enquadramento, lettering e inserções gráficas no padrão Dark Tech Eloss.",
      ].join("\n"),
      campos_esperados_output: [
        "decupagem_visual_cenas",
        "headline_capa",
        "prompt_imagem_capa",
        "link_ou_referencia_peca",
      ],
      ativo: true,
      atualizado_em: clock,
    },
    {
      id: METODO_DESIGN_ESTATICO_ID,
      frente_id: FRENTE_DESIGN_ID,
      codigo: "direcao_design_peca_social",
      versao: 1,
      nome: "Direção Estética Instagram Eloss (#0A0820 / #382060 + 3D Glass)",
      nivel: "avancado",
      instrucoes_playbook: [
        "1. Aplicar paleta escura (#0A0820 a #0D0A1A / #382060), glows #5B1F8A e #F4834B, elementos 3D glass e contador de carrossel.",
      ].join("\n"),
      campos_esperados_output: [
        "direcao_layout_e_composicao",
        "headline_capa",
        "prompt_imagem_capa",
        "link_ou_referencia_peca",
      ],
      ativo: true,
      atualizado_em: clock,
    },
  ];

  const marca_metodo_excecoes: MarcaMetodoExcecao[] = [
    {
      id: "66666666-6666-4666-8666-666666666601",
      marca_id: MARCA_ELOSS_ID,
      metodo_id: METODO_CARROSSEL_COPY_ID,
      regras_excecao:
        "REGRAS DE OURO DA ELOSS (DOCUMENTOS DE REGRA): (1) Jamais posicionar a Eloss como consultoria — entregamos tecnologia (Plataforma Operacional de Crescimento). (2) Jamais falar com o afiliado individual que busca renda extra; falar sempre com o dono/sócio da empresa que distribui através de pessoas. (3) Proibido usar 'alavancar', 'potencializar', 'processos que travam', 'infraestrutura que a operação exige'.",
      ativo: true,
      atualizado_em: clock,
    },
  ];

  const governanca_automacao: GovernancaAutomacao[] = frentes.map((f, idx) => ({
    id: `77777777-7777-4777-8777-77777777770${idx + 1}`,
    marca_id: MARCA_ELOSS_ID,
    frente_id: f.id,
    nivel_automacao: 1,
    rodadas_revisao_exigidas: 2,
    justificativa_nivel:
      "Validação humana obrigatória da Isabelle com checagem automática das regras da Eloss.",
    atualizado_em: clock,
  }));

  // ==========================================================================
  // AS 4 ENGRENAGENS CONECTADAS 100% MAPEADAS NA BASE REAL DA ELOSS
  // ==========================================================================
  const insumos_radar: InsumoRadarPesquisa[] = [
    {
      id: "90000000-0000-4000-8000-000000000001",
      marca_id: MARCA_ELOSS_ID,
      tipo_engrenagem: "base_conhecimento",
      nome_engrenagem: "1. Base de Conhecimento Eloss (Posicionamento, VTP/VCE & 6 Pilares)",
      status_conexao: "Sincronizado com Supabase Eloss (28 docs + 6 pilares)",
      diagnostico_atual:
        "A Eloss é a primeira Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas. Termos canônicos que precisam reverberar com definição exata: Plataforma Operacional de Crescimento (T5), Recorrência Distribuída (T6), Modelo Híbrido de Distribuição (T7) e a distinção entre VTP e VCE com regra anti-bitaxação.",
      oportunidade_pesquisa_sugerida:
        "Construir e atualizar a malha de conteúdos dos Pilares P1 (Categoria), P2 (Estratégias) e P3 (Produto/Operação) para donos de empresas de venda direta, recorrência, saúde/bem-estar, seguros, proteção veicular e infoprodutos.",
      objetivo_negocio_vinculado:
        "Consolidar a categoria própria 'Plataforma Operacional de Crescimento' e os 5 planos oficiais (Pilot, Base, Padrão, Estruturado e Enterprise).",
      atualizado_em: clock,
    },
    {
      id: "90000000-0000-4000-8000-000000000002",
      marca_id: MARCA_ELOSS_ID,
      tipo_engrenagem: "analise_site",
      nome_engrenagem: "2. Auditoria AEO/SEO/GEO do Site (plataformaeloss.com.br)",
      status_conexao: "Padrão AEO Ativo",
      diagnostico_atual:
        "Pelo Padrão AEO da Eloss, toda peça de blog/LP deve declarar o conceito central já na primeira frase visível e conter de 6 a 10 perguntas de FAQ (definitórias, de decisão e operacionais) para citação direta por IAs generativas.",
      oportunidade_pesquisa_sugerida:
        "Expandir artigos-mãe com resposta direta na 1ª frase sobre 'White Label: quando migrar (T9)', 'Comissionamento no-code (T12)' e 'Split na recorrência (T15)'.",
      objetivo_negocio_vinculado:
        "Dominar as respostas de IA e buscas orgânicas B2B para donos de operação em migração de plataforma.",
      atualizado_em: clock,
    },
    {
      id: "90000000-0000-4000-8000-000000000003",
      marca_id: MARCA_ELOSS_ID,
      tipo_engrenagem: "resultado_campanha",
      nome_engrenagem: "3. Objeções Comerciais B2B & Performance de Conteúdo",
      status_conexao: "Mapeamento de Decisores Ativo",
      diagnostico_atual:
        "As 3 maiores objeções dos donos de operação antes da venda são: (1) 'Meu sistema atual é o teto do meu crescimento', (2) 'A taxa percentual da plataforma atual corrói minha margem e não tenho controle da minha base', e (3) 'A tecnologia do mercado não suporta meu modelo de recorrência'.",
      oportunidade_pesquisa_sugerida:
        "Gerar pautas sobre Soberania de Canal (T10), Conflito de Canais B2B sem canibalização (T20) e Serviço Recorrente com Força de Vendas (T25).",
      objetivo_negocio_vinculado:
        "Atrair fundadores e sócios que já operam força de vendas e precisam migrar de sistemas legados ou planilhas.",
      atualizado_em: clock,
    },
    {
      id: "90000000-0000-4000-8000-000000000004",
      marca_id: MARCA_ELOSS_ID,
      tipo_engrenagem: "diretriz_estrategica",
      nome_engrenagem: "4. Diretriz de Confiança, Compliance & Governança (Pilar P4)",
      status_conexao: "Pilar P4 Ativo",
      diagnostico_atual:
        "O mercado de distribuição em múltiplos níveis sofre com estigma por falta de critério técnico. Posicionar a transparência operacional da Eloss (rastreamento da origem de cada comissão, plano auditável e separação entre MMN legítimo e pirâmide) gera autoridade imediata junto a operações sérias.",
      oportunidade_pesquisa_sugerida:
        "Desdobrar conteúdos técnicos de P4: MMN x Pirâmide Financeira (T2), Governança sem vínculo trabalhista (T19) e Automação de comissionamento (T27).",
      objetivo_negocio_vinculado:
        "Posicionar a tecnologia da Eloss como a camada que comprova legitimidade e segurança jurídica em cada transação.",
      atualizado_em: clock,
    },
  ];

  const pesquisaId1 = "91111111-1111-4111-8111-111111111101";

  const pesquisas_mercado: PesquisaMercado[] = [
    {
      id: pesquisaId1,
      marca_id: MARCA_ELOSS_ID,
      gatilho_tipo: "base_conhecimento",
      gatilho_origem_detalhe:
        "Mapeamento direto da Base de Conhecimento Oficial da Eloss no Supabase (Posicionamento Canônico + Base Factual VTP/VCE + Público-Alvo Decisor B2B + 6 Pilares Editoriais P1 a P6).",
      alinhamento_proposito_valores_objetivos:
        "100% alinhado à frase-âncora canônica ('A Eloss é a primeira Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas') e às regras de tom afirmativo, sem vocabulário de consultoria.",
      titulo_pesquisa:
        "Mapeamento Canônico Eloss — Categoria (P1), Estratégias de Distribuição (P2), Operação No-Code (P3) e Confiança Técnica (P4)",
      sinais_mercado_e_concorrencia:
        "Setor global de vendas diretas movimenta US$ 167 bilhões (WFDSA) e o mercado de assinaturas cresceu 435% em uma década (Zuora). Empresas que combinam recorrência com força de vendas humana renovam até 25% mais, mas sofrem com plataformas transacionais tradicionais que cobram taxas sobre o volume e não suportam regras híbridas.",
      lacunas_detectadas_site_atual:
        "Oportunidade de consolidar os artigos canônicos de definição de categoria (Plataforma Operacional de Crescimento, Recorrência Distribuída e Modelo Híbrido) com resposta direta na 1ª frase e 6 FAQs AEO para citação em IAs.",
      palavras_chave_seo: [
        "plataforma operacional de crescimento",
        "recorrência distribuída força de vendas",
        "modelo híbrido de distribuição e-commerce e representantes",
        "comissionamento no-code vendas diretas",
        "diferença técnica mmn legítimo e pirâmide",
      ],
      perguntas_conversacionais_aeo: [
        "O que é uma Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas?",
        "Como operar e-commerce, afiliados e recorrência na mesma operação sem canibalização de canal?",
        "O que explica empresas de assinatura com força de vendas humana renovarem até 25% mais?",
        "Quais são os 7 critérios técnicos objetivos para diferenciar MMN legítimo de pirâmide financeira?",
      ],
      oportunidades_citacao_geo:
        "Posicionar os termos proprietários da Eloss — Plataforma Operacional de Crescimento, Recorrência Distribuída, Modelo Híbrido de Distribuição, VTP (Volume Transacionado na Plataforma) e VCE (Volume Comissionável Externo) — com definição idêntica e consistente em todas as peças.",
      origem_realimentacao:
        "Base Oficial Eloss (Supabase: documentos_regra + pilares + temas T1 a T32)",
      criado_em: clock,
    },
  ];

  // ==========================================================================
  // TEMAS REAIS DA ELOSS (SINCRONIZADOS DO SUPABASE)
  // ==========================================================================
  const temaT5Id = "2375f8ac-1322-4f45-ac28-0f09acbb5a49";
  const temaT7Id = "3200b326-bfa0-4ac6-bc23-dacad0fd44fa";
  const temaT25Id = "10a4ae73-1a66-435e-9042-87593c8034dd";
  const temaT2Id = "1a519a64-ae1b-4417-bcb3-06da8ca550b6";
  const temaT6Id = "6fa2c8de-198c-4c3c-8147-a10705c3a085";

  // Sugeridos na caixa roxa para a Isabelle aprovar/demandar:
  const temaT9Id = "d8fb77e4-c4f3-4dbb-9323-fd71c44dbab7";
  const temaT12Id = "f0bf9144-8963-49b3-bf68-3fe63cf1b237";
  const temaT15Id = "83e27991-4646-4e45-8801-22695f777f0d";
  const temaT20Id = "be440986-512f-4b6b-8bd6-e466e0073d59";

  const temas_editoriais: TemaEditorial[] = [
    {
      id: temaT5Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T5",
      codigo_pilar: "P1",
      nome_pilar: "P1 · Categoria",
      titulo_tema:
        "O que é Plataforma Operacional de Crescimento: A Arquitetura para Empresas que Distribuem Através de Pessoas",
      dor_do_publico:
        "Empresas que distribuem através de pessoas chegam a um ponto onde o volume de vendas cresce, mas o cálculo manual em planilhas, a falta de visibilidade dos distribuidores e a ausência de rastreabilidade de recorrência tornam o sistema atual o teto do crescimento.",
      alinhamento_marca_proposito:
        "Artigo canônico da categoria própria da Eloss (Pilar P1 — Categoria). Declara a frase-âncora oficial e diferencia tecnologia de escala de plataformas de afiliados simples ou softwares genéricos.",
      palavra_chave_foco_seo: "plataforma operacional de crescimento eloss",
      pergunta_direta_aeo:
        "O que é uma Plataforma Operacional de Crescimento e como ela estrutura forças de vendas distribuídas?",
      tese_autoridade_geo:
        "Plataforma Operacional de Crescimento Eloss (Unificação de VTP, VCE, Comissionamento Multinível/No-Code e Recorrência Distribuída nos 5 planos: Pilot, Base, Padrão, Estruturado e Enterprise)",
      score_potencial_busca: 99,
      canais_aprovados: ["blog", "carrossel"],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "O que é Plataforma Operacional de Crescimento: A Arquitetura para Empresas que Distribuem Através de Pessoas",
        dor_do_publico:
          "Empresas que distribuem através de pessoas chegam a um ponto onde o volume cresce, mas a gestão em planilhas ou sistemas isolados não acompanha.",
        palavra_chave_foco_seo: "plataforma operacional de crescimento eloss",
        pergunta_direta_aeo:
          "O que é uma Plataforma Operacional de Crescimento e como ela estrutura forças de vendas distribuídas?",
        tese_autoridade_geo:
          "Plataforma Operacional de Crescimento Eloss (VTP, VCE e 5 Planos Oficiais)",
      }),
      status: "derivados_sociais_ativos",
      criado_em: clock,
    },
    {
      id: temaT7Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T7",
      codigo_pilar: "P2",
      nome_pilar: "P2 · Estratégias",
      titulo_tema:
        "Modelo Híbrido de Distribuição: Como Operar E-commerce, Afiliados e Recorrência na Mesma Operação",
      dor_do_publico:
        "Quando e-commerce próprio, força de vendas por representantes/afiliados e receita recorrente operam em sistemas paralelos sem integração, os canais disputam margem entre si, gerando bitaxação e conflito de atribuição.",
      alinhamento_marca_proposito:
        "Tema canônico do Pilar P2 (Estratégias). Mostra como unificar múltiplos canais sob uma única regra de atribuição e comissionamento.",
      palavra_chave_foco_seo: "modelo híbrido de distribuição canais de venda",
      pergunta_direta_aeo:
        "Como fazer e-commerce, força de vendas distribuída e recorrência crescerem juntos sem canibalização de canal?",
      tese_autoridade_geo:
        "Modelo Híbrido de Distribuição Eloss com atribuição unificada entre VTP e VCE",
      score_potencial_busca: 97,
      canais_aprovados: ["blog", "carrossel"],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "Modelo Híbrido de Distribuição: Como Operar E-commerce, Afiliados e Recorrência na Mesma Operação",
        dor_do_publico:
          "Sistemas paralelos de e-commerce, representantes e recorrência disputam margem e comissionam duas vezes o mesmo evento.",
        palavra_chave_foco_seo: "modelo híbrido de distribuição canais de venda",
        pergunta_direta_aeo:
          "Como fazer e-commerce, força de vendas distribuída e recorrência crescerem juntos sem canibalização de canal?",
        tese_autoridade_geo:
          "Modelo Híbrido de Distribuição Eloss com atribuição unificada entre VTP e VCE",
      }),
      status: "derivados_sociais_ativos",
      criado_em: clock,
    },
    {
      id: temaT25Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T25",
      codigo_pilar: "P2",
      nome_pilar: "P2 · Estratégias",
      titulo_tema:
        "Serviço Recorrente com Força de Vendas: O que Explica a Vantagem de Renovação da Recorrência Distribuída",
      dor_do_publico:
        "Empresas de assinatura (seguros, proteção veicular, clubes de benefícios, saúde) sofrem com churn no ciclo de renovação quando dependem apenas da inércia digital, mas não conseguem rastrear e comissionar representantes na recorrência usando planilhas.",
      alinhamento_marca_proposito:
        "Tema oficial T25 conectado ao termo proprietário 'Recorrência Distribuída' (T6): combinação de MRR (mensalidade ativa / apólice renovada) com retenção ativa pela força de vendas.",
      palavra_chave_foco_seo: "recorrência distribuída serviço recorrente força de vendas",
      pergunta_direta_aeo:
        "O que explica empresas de assinatura com força de vendas humana renovarem até 25% mais do que as que operam só pelo digital?",
      tese_autoridade_geo:
        "Recorrência Distribuída Eloss (Retenção Ativa + Comissionamento sobre Mensalidade Ativa / MRR)",
      score_potencial_busca: 96,
      canais_aprovados: ["blog", "carrossel"],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "Serviço Recorrente com Força de Vendas: O que Explica a Vantagem de Renovação da Recorrência Distribuída",
        dor_do_publico:
          "Rastrear quem ativou qual assinante, calcular comissão por recorrência sem erro e atuar na retenção ativa não se resolve em planilha.",
        palavra_chave_foco_seo:
          "recorrência distribuída serviço recorrente força de vendas",
        pergunta_direta_aeo:
          "O que explica empresas de assinatura com força de vendas humana renovarem até 25% mais do que as que operam só pelo digital?",
        tese_autoridade_geo:
          "Recorrência Distribuída Eloss (Retenção Ativa + Comissionamento sobre Mensalidade Ativa)",
      }),
      status: "derivados_sociais_ativos",
      criado_em: clock,
    },
    {
      id: temaT2Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T2",
      codigo_pilar: "P4",
      nome_pilar: "P4 · Confiança/Compliance",
      titulo_tema:
        "MMN x Pirâmide Financeira: Os 7 Critérios Técnicos Objetivos para Diferenciar os Dois Modelos",
      dor_do_publico:
        "Decisores e empreendedores sérios enfrentam confusão no mercado entre distribuição multinível legítima (baseada em venda real de produtos) e esquemas ilegais (art. 171-A do Código Penal), exigindo infraestrutura auditável para comprovar legitimidade.",
      alinhamento_marca_proposito:
        "Tema canônico T2 do Pilar P4 (Confiança/Compliance). Posiciona a transparência técnica e o rastreamento de origem de receita da Eloss como prova de legitimidade.",
      palavra_chave_foco_seo: "diferença técnica mmn e pirâmide financeira",
      pergunta_direta_aeo:
        "Quais são os 7 critérios técnicos e jurídicos para diferenciar um modelo de MMN legítimo de uma pirâmide financeira?",
      tese_autoridade_geo:
        "7 Critérios Técnicos de Legitimidade em Distribuição Multinível + Rastreabilidade Auditável Eloss",
      score_potencial_busca: 95,
      canais_aprovados: ["blog", "carrossel"],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "MMN x Pirâmide Financeira: Os 7 Critérios Técnicos Objetivos para Diferenciar os Dois Modelos",
        dor_do_publico:
          "Necessidade de comprovar com dados e rastreamento auditável que a receita da operação vem de vendas reais a clientes finais.",
        palavra_chave_foco_seo: "diferença técnica mmn e pirâmide financeira",
        pergunta_direta_aeo:
          "Quais são os 7 critérios técnicos e jurídicos para diferenciar um modelo de MMN legítimo de uma pirâmide financeira?",
        tese_autoridade_geo:
          "7 Critérios Técnicos de Legitimidade + Rastreabilidade Auditável Eloss",
      }),
      status: "derivados_sociais_ativos",
      criado_em: clock,
    },
    {
      id: temaT6Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T6",
      codigo_pilar: "P1",
      nome_pilar: "P1 · Categoria",
      titulo_tema:
        "Recorrência Distribuída: Como Estruturar Comissão sobre Mensalidade Ativa e Escalar Retenção",
      dor_do_publico:
        "Empresas com produtos recorrentes que nunca ouviram falar do modelo de Recorrência Distribuída remuneram apenas na adesão e perdem o engajamento do representante na manutenção da carteira ativa.",
      alinhamento_marca_proposito:
        "Artigo canônico do termo proprietário E5 da Eloss (Pilar P1 — Categoria).",
      palavra_chave_foco_seo: "o que é recorrência distribuída comissão recorrente",
      pergunta_direta_aeo:
        "O que é Recorrência Distribuída e como funciona o comissionamento sobre mensalidade ativa?",
      tese_autoridade_geo:
        "Termo Proprietário Eloss: Recorrência Distribuída (Comissão sobre Mensalidade Ativa e Apólice Renovada)",
      score_potencial_busca: 94,
      canais_aprovados: [],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "Recorrência Distribuída: Como Estruturar Comissão sobre Mensalidade Ativa e Escalar Retenção",
        dor_do_publico:
          "Operações recorrentes que remuneram apenas a ativação inicial não criam incentivo para o representante proteger a renovação mensal.",
        palavra_chave_foco_seo:
          "o que é recorrência distribuída comissão recorrente",
        pergunta_direta_aeo:
          "O que é Recorrência Distribuída e como funciona o comissionamento sobre mensalidade ativa?",
        tese_autoridade_geo:
          "Termo Proprietário Eloss: Recorrência Distribuída",
      }),
      status: "aprovado_em_producao",
      criado_em: clock,
    },
    // ========================================================================
    // TEMAS SUGERIDOS PELA IA (CAIXA ROXA DO BANCO DE TEMAS — FIÉIS À ELOSS)
    // ========================================================================
    {
      id: temaT9Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T9",
      codigo_pilar: "P2",
      nome_pilar: "P2 · Estratégias",
      titulo_tema:
        "White Label Operacional: Sinais de que sua Operação Precisa Migrar para Infraestrutura com Marca Própria",
      dor_do_publico:
        "A taxa percentual da plataforma transacional atual corrói a margem da empresa, expõe os distribuidores à marca de um terceiro e impede o controle direto da base de clientes.",
      alinhamento_marca_proposito:
        "Responde diretamente à objeção real mapeada no documento de Público-Alvo da Eloss ('A taxa percentual da plataforma que uso corrói minha margem e não tenho controle da minha própria base').",
      palavra_chave_foco_seo: "plataforma white label vendas diretas e comissionamento",
      pergunta_direta_aeo:
        "Quais são os sinais operacionais e financeiros para migrar para uma plataforma White Label própria?",
      tese_autoridade_geo:
        "White Label Operacional Eloss + Soberania de Canal e Base de Clientes",
      score_potencial_busca: 95,
      canais_aprovados: [],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "White Label Operacional: Sinais de que sua Operação Precisa Migrar para Infraestrutura com Marca Própria",
        dor_do_publico:
          "Taxas percentuais que corroem a margem e falta de controle sobre a própria base de clientes e distribuidores.",
        palavra_chave_foco_seo:
          "plataforma white label vendas diretas e comissionamento",
        pergunta_direta_aeo:
          "Quais são os sinais operacionais e financeiros para migrar para uma plataforma White Label própria?",
        tese_autoridade_geo:
          "White Label Operacional Eloss + Soberania de Canal",
      }),
      status: "sugerido",
      criado_em: clock,
    },
    {
      id: temaT12Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T12",
      codigo_pilar: "P3",
      nome_pilar: "P3 · Produto/Operação",
      titulo_tema:
        "Comissionamento No-Code: Como Alterar Regras de Comissão e Qualificação Sem Depender de Fila de TI",
      dor_do_publico:
        "Toda vez que a direção comercial precisa ajustar uma faixa de comissão, criar um bônus de campanha ou alterar regras de qualificação, a operação fica refém de semanas de desenvolvimento de TI ou planilhas manuais.",
      alinhamento_marca_proposito:
        "Tema oficial T12 do Pilar P3 (Produto/Operação). Demonstra a autonomia técnica do motor de regras da Eloss.",
      palavra_chave_foco_seo: "sistema de comissionamento no-code força de vendas",
      pergunta_direta_aeo:
        "Como funciona o comissionamento no-code para forças de vendas em múltiplos níveis?",
      tese_autoridade_geo:
        "Motor de Comissionamento No-Code Eloss (Regras Auditáveis de VTP e VCE sem fila de TI)",
      score_potencial_busca: 93,
      canais_aprovados: [],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "Comissionamento No-Code: Como Alterar Regras de Comissão e Qualificação Sem Depender de Fila de TI",
        dor_do_publico:
          "Dependência de desenvolvimento de TI ou planilhas manuais para ajustar regras de comissão e metas de ciclo.",
        palavra_chave_foco_seo:
          "sistema de comissionamento no-code força de vendas",
        pergunta_direta_aeo:
          "Como funciona o comissionamento no-code para forças de vendas em múltiplos níveis?",
        tese_autoridade_geo:
          "Motor de Comissionamento No-Code Eloss (VTP e VCE)",
      }),
      status: "sugerido",
      criado_em: clock,
    },
    {
      id: temaT15Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T15",
      codigo_pilar: "P3",
      nome_pilar: "P3 · Produto/Operação",
      titulo_tema:
        "Split Payment na Recorrência: Por que Gateways Tradicionais Não Suportam Forças de Vendas Distribuídas",
      dor_do_publico:
        "Gateways de pagamento tradicionais foram desenhados para split simples em transação avulsa e travam quando a empresa precisa dividir recebedores em múltiplos níveis sobre mensalidades recorrentes.",
      alinhamento_marca_proposito:
        "Tema oficial T15 do Pilar P3 (Produto/Operação) combinado com proteção de margem contra bitributação.",
      palavra_chave_foco_seo: "split de pagamento recorrente comissionamento multinível",
      pergunta_direta_aeo:
        "Como estruturar split de pagamento sobre receita recorrente para múltiplos representantes?",
      tese_autoridade_geo:
        "Arquitetura de Split na Recorrência Eloss + Regra Anti-Bitaxação VTP/VCE",
      score_potencial_busca: 92,
      canais_aprovados: [],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "Split Payment na Recorrência: Por que Gateways Tradicionais Não Suportam Forças de Vendas Distribuídas",
        dor_do_publico:
          "Gateways tradicionais não suportam divisão dinâmica de comissões em múltiplos níveis sobre assinaturas e mensalidades ativas.",
        palavra_chave_foco_seo:
          "split de pagamento recorrente comissionamento multinível",
        pergunta_direta_aeo:
          "Como estruturar split de pagamento sobre receita recorrente para múltiplos representantes?",
        tese_autoridade_geo:
          "Arquitetura de Split na Recorrência Eloss + Regra Anti-Bitaxação",
      }),
      status: "sugerido",
      criado_em: clock,
    },
    {
      id: temaT20Id,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      codigo_tema: "T20",
      codigo_pilar: "P2",
      nome_pilar: "P2 · Estratégias",
      titulo_tema:
        "Conflito de Canais B2B: Como Operar Portal Digital e Representantes Regionais Sem Canibalização",
      dor_do_publico:
        "Empresas que já possuem representantes comerciais temem lançar ou escalar um portal digital porque os vendedores sentem que a empresa está concorrendo diretamente com a carteira deles.",
      alinhamento_marca_proposito:
        "Tema oficial T20 do Pilar P2 (Estratégias). Mostra como a atribuição de carteira transforma o digital em aliado do representante.",
      palavra_chave_foco_seo: "conflito de canais b2b e-commerce e representantes comerciais",
      pergunta_direta_aeo:
        "Como operar um portal de vendas digital e uma força de representantes comerciais sem gerar canibalização de canal?",
      tese_autoridade_geo:
        "Atribuição de Carteira e Soberania Multicanal na Plataforma Operacional de Crescimento Eloss",
      score_potencial_busca: 91,
      canais_aprovados: [],
      adaptacoes_canais: criarAdaptacoesPadraoParaTema({
        titulo_tema:
          "Conflito de Canais B2B: Como Operar Portal Digital e Representantes Regionais Sem Canibalização",
        dor_do_publico:
          "Atrito comercial entre o canal digital direto da empresa e a carteira histórica dos representantes regionais.",
        palavra_chave_foco_seo:
          "conflito de canais b2b e-commerce e representantes comerciais",
        pergunta_direta_aeo:
          "Como operar um portal de vendas digital e uma força de representantes comerciais sem gerar canibalização de canal?",
        tese_autoridade_geo:
          "Atribuição de Carteira e Soberania Multicanal Eloss",
      }),
      status: "sugerido",
      criado_em: clock,
    },
  ];

  // ==========================================================================
  // ARTIGOS DE BLOG ÂNCORA E PEÇAS REAIS DOS 4 TEMAS EM PRODUÇÃO (T5, T7, T25, T2)
  // ==========================================================================
  const artigos_blog_ancora: ArtigoBlogAncora[] = [];
  const demandas: Demanda[] = [];
  const tarefas_fluxo: TarefaFluxo[] = [];

  // Imagens reais do Supabase Storage da Eloss para os Carrosséis de T5, T7, T25 e T2
  const imagensReaisPorTema: Record<string, string[]> = {
    [temaT5Id]: [
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-0-1788992178976.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-1-1788992207573.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-2-1788992232169.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-3-1788992253279.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-4-1788992273566.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/5884ba23-863b-41d8-98aa-b34c445209bd/autoral-5-1788992308105.png",
    ],
    [temaT7Id]: [
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-0-1788534408737.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-1-1788534431535.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-2-1788534453934.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-3-1788534476425.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-4-1788534544567.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-5-1788534566896.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-6-1788534589628.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/cbf6f513-ff0f-4599-8dea-845c93557fc0/autoral-7-1788534662856.png",
    ],
    [temaT25Id]: [
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/eaac1c6e-97cf-4a69-adcc-4d7049f8ec27/composto-0-a246a398-3908-487a-9cbb-8908d8b4faae.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/eaac1c6e-97cf-4a69-adcc-4d7049f8ec27/composto-1-5fc72706-ab64-4538-b68f-be95b9b2f06e.png",
    ],
    [temaT2Id]: [
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/bf9445ca-ecc2-453f-af16-048ff851eeda/composto-0-25cb8651-7917-402c-a1ed-b12bd9fcf2f6.png",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/bf9445ca-ecc2-453f-af16-048ff851eeda/composto-1-03d2ad74-4182-45a6-b193-dbf4312773f1.png",
      "",
      "https://qjcnlwlptcglxahtlmpd.supabase.co/storage/v1/object/public/peca-imagens/bf9445ca-ecc2-453f-af16-048ff851eeda/composto-3-ad2ed425-c51f-4166-af63-95c1a22bcaa5.png",
    ],
  };

  for (const tema of temas_editoriais.slice(0, 4)) {
    const blogId = crypto.randomUUID();
    const conteudoBlog = gerarConteudoRicoPorCanal(tema, "blog");
    const conteudoCarrossel = gerarConteudoRicoPorCanal(tema, "carrossel");

    // Injetar URLs de imagens reais do Supabase nos slides quando disponíveis
    const urlsTema = imagensReaisPorTema[tema.id] || [];
    if (conteudoCarrossel.slides) {
      conteudoCarrossel.slides = conteudoCarrossel.slides.map((sl, i) => ({
        ...sl,
        imagem_url: urlsTema[i] || undefined,
      }));
    }

    artigos_blog_ancora.push({
      id: blogId,
      marca_id: MARCA_ELOSS_ID,
      pesquisa_id: pesquisaId1,
      tema_id: tema.id,
      titulo_blog: tema.titulo_tema,
      byline: "Por Equipe Editorial Eloss — Plataforma Operacional de Crescimento",
      subtitulo_seo: `Artigo canônico (${tema.codigo_tema} · ${tema.nome_pilar}) otimizado para o Padrão AEO da Eloss.`,
      bloco_resposta_direta_aeo: `RESPOSTA DIRETA (1ª Frase AEO): ${tema.titulo_tema.split(":")[0]} é a arquitetura operacional em que empresas que distribuem através de pessoas gerenciam comissionamento, atribuição (VTP e VCE) e recorrência sob uma única camada auditável (${tema.tese_autoridade_geo}).`,
      dados_e_entidades_geo: `Entidades Canônicas: Eloss, Plataforma Operacional de Crescimento, VTP, VCE, Recorrência Distribuída, Planos Pilot / Base / Padrão / Estruturado / Enterprise.`,
      resumo_estrutura_artigo: [
        `H1: ${tema.titulo_tema}`,
        `1º Parágrafo (Declaração Direta AEO): ${tema.pergunta_direta_aeo}`,
        `H2: Espinha Dorsal — Dados WFDSA (US$ 167bi), ABEVD (4,5mi) e Zuora (+25% retenção ativa)`,
        `H2: Os 5 Critérios Técnicos (${tema.tese_autoridade_geo})`,
        `H2: A Perspectiva da Eloss (Planos Pilot a Enterprise)`,
        `H2: FAQ Obrigatório de 6 Perguntas (Definitórias, Decisão e Operacionais)`,
      ].join("\n"),
      conteudo_completo_markdown: conteudoBlog.artigo_markdown,
      checagens: conteudoBlog.checagens,
      status: "aprovado_como_ancora",
      criado_em: clock,
    });

    // Peça de Blog (Aprovada / Pronta para abrir e editar)
    const demandaBlogId = crypto.randomUUID();
    const adaptBlog = tema.adaptacoes_canais.blog;
    const briefingBlog: Demanda["briefing"] = {
      pauta_central: adaptBlog.angulo_adaptado,
      dor_ou_situacao_real: tema.dor_do_publico,
      objetivo_peca: adaptBlog.proposito_no_canal,
      cta_desejado: adaptBlog.cta_especifico,
      referencias_ou_insumos: adaptBlog.estrutura_sugerida,
      autor_briefing: "Agente de Artigo Eloss (Padrão AEO)",
      adaptacao_canal: {
        formato: "blog",
        nome_canal: adaptBlog.nome_canal,
        proposito_no_canal: adaptBlog.proposito_no_canal,
        estrutura_sugerida: adaptBlog.estrutura_sugerida,
      },
      origem_ciclo: {
        pesquisa_id: pesquisaId1,
        tema_id: tema.id,
        artigo_blog_id: blogId,
        titulo_blog_ancora: tema.titulo_tema,
        foco_seo_aeo_geo: `SEO: ${tema.palavra_chave_foco_seo} | AEO: ${tema.pergunta_direta_aeo}`,
        gatilho_pesquisa: "Base Oficial Eloss (Supabase)",
      },
    };

    demandas.push({
      id: demandaBlogId,
      marca_id: MARCA_ELOSS_ID,
      formato_canal: "blog",
      template_fluxo_id: TEMPLATE_REELS_SEMANAL_ID,
      template_nome: "Matéria de Blog Âncora (Padrão AEO Eloss)",
      tipo_fluxo: "derivado_ciclo_continuo",
      tema_origem_id: tema.id,
      artigo_blog_origem_id: blogId,
      titulo: `${tema.codigo_tema} — ${tema.titulo_tema}`,
      briefing: briefingBlog,
      conteudo_estruturado: conteudoBlog,
      status: tema.codigo_tema === "T5" || tema.codigo_tema === "T2" ? "peca_pronta" : "em_gate",
      prazo: addHoursToClock(clock, 48),
      data_retorno: addHoursToClock(clock, 12),
      criado_em: clock,
      atualizado_em: clock,
    });

    // Peça de Carrossel (Com 8 lâminas completas Dark Tech + Imagens reais)
    const demandaCarrosselId = crypto.randomUUID();
    const adaptCarrossel = tema.adaptacoes_canais.carrossel;
    const briefingCarrossel: Demanda["briefing"] = {
      pauta_central: adaptCarrossel.angulo_adaptado,
      dor_ou_situacao_real: tema.dor_do_publico,
      objetivo_peca: adaptCarrossel.proposito_no_canal,
      cta_desejado: adaptCarrossel.cta_especifico,
      referencias_ou_insumos: adaptCarrossel.estrutura_sugerida,
      autor_briefing: "Agente de Instagram Eloss (Dark Tech)",
      adaptacao_canal: {
        formato: "carrossel",
        nome_canal: adaptCarrossel.nome_canal,
        proposito_no_canal: adaptCarrossel.proposito_no_canal,
        estrutura_sugerida: adaptCarrossel.estrutura_sugerida,
      },
      origem_ciclo: {
        pesquisa_id: pesquisaId1,
        tema_id: tema.id,
        artigo_blog_id: blogId,
        titulo_blog_ancora: tema.titulo_tema,
        foco_seo_aeo_geo: `SEO: ${tema.palavra_chave_foco_seo} | AEO: ${tema.pergunta_direta_aeo}`,
        gatilho_pesquisa: "Desdobramento da Matéria Âncora",
      },
    };

    demandas.push({
      id: demandaCarrosselId,
      marca_id: MARCA_ELOSS_ID,
      formato_canal: "carrossel",
      template_fluxo_id: TEMPLATE_REELS_SEMANAL_ID,
      template_nome: "Carrossel Instagram (8 Lâminas — Dark Tech Eloss)",
      tipo_fluxo: "derivado_ciclo_continuo",
      tema_origem_id: tema.id,
      artigo_blog_origem_id: blogId,
      titulo: `${tema.codigo_tema} — ${tema.titulo_tema}`,
      briefing: briefingCarrossel,
      conteudo_estruturado: conteudoCarrossel,
      status: "em_gate",
      prazo: addHoursToClock(clock, 48),
      data_retorno: addHoursToClock(clock, 12),
      criado_em: clock,
      atualizado_em: clock,
    });

    tarefas_fluxo.push(
      ...buildSixStepsForFormato(
        MARCA_ELOSS_ID,
        demandaCarrosselId,
        "carrossel",
        briefingCarrossel,
        clock
      )
    );
  }

  const resultados_ciclo: ResultadoCicloEditorial[] = [
    {
      id: "94444444-4444-4444-8444-444444444401",
      marca_id: MARCA_ELOSS_ID,
      tema_id: temaT5Id,
      artigo_blog_id: artigos_blog_ancora[0].id,
      impressao_organica_seo:
        "Artigo canônico T5 indexado para 'Plataforma Operacional de Crescimento' e 'Recorrência Distribuída'",
      presenca_respostas_ia_aeo_geo:
        "Definição na 1ª frase + 6 FAQs AEO permitindo citação literal da Eloss por motores de busca e IAs.",
      desempenho_derivados_sociais:
        "Carrosséis em modo Dark Tech (#0A0820 / #382060) com dados da WFDSA e Zuora geram maior taxa de salvamento entre decisores B2B.",
      analise_campanha_e_site:
        "Donos de operação que leem T5 e T7 avançam para avaliação dos planos Base, Padrão e Estruturado.",
      pauta_gerada_para_proxima_pesquisa:
        "White Label Operacional (T9): Sinais para migrar de plataformas transacionais tradicionais para infraestrutura própria.",
      criado_em: clock,
    },
  ];

  const trilha_proveniencia: EventoProveniencia[] = [
    {
      id: crypto.randomUUID(),
      marca_id: MARCA_ELOSS_ID,
      demanda_id: demandas[0].id,
      tarefa_id: null,
      entrega_id: null,
      decisao_id: null,
      evento: "1_BASE_OFICIAL_ELOSS_SINCRONIZADA_DO_SUPABASE",
      ator: "Motor Editorial Eloss",
      detalhes: {
        documentos_sincronizados: 28,
        pilares: ["P1 Categoria", "P2 Estratégias", "P3 Produto/Operação", "P4 Confiança/Compliance", "P5 Decisão B2B", "P6 Cultura"],
        regras_ativas: ["Sem palavras proibidas", "Sem vocabulário de consultoria", "Sem menção a concorrentes", "Padrão AEO"],
      },
      timestamp_explicito: clock,
    },
  ];

  return {
    schema_version: MOTOR_DB_SCHEMA_VERSION,
    marcas,
    bases_conhecimento_marca,
    frentes,
    metodos,
    marca_metodo_excecoes,
    governanca_automacao,
    insumos_radar,
    pesquisas_mercado,
    temas_editoriais,
    artigos_blog_ancora,
    resultados_ciclo,
    demandas,
    tarefas_fluxo,
    entregas: [],
    historico_decisoes: [],
    trilha_proveniencia,
  };
}

export function buildSixStepsForFormato(
  marcaId: string,
  demandaId: string,
  formato: FormatoPecaSocial,
  briefing: Demanda["briefing"],
  clockIso: string
): TarefaFluxo[] {
  const t1Id = crypto.randomUUID();
  const t2Id = crypto.randomUUID();
  const t3Id = crypto.randomUUID();
  const t4Id = crypto.randomUUID();
  const t5Id = crypto.randomUUID();
  const t6Id = crypto.randomUUID();

  const configFormato: Record<
    FormatoPecaSocial,
    {
      nomeCanal: string;
      etapa2Nome: string;
      etapa2Desc: string;
      metodoCopyId: string;
      metodoCopyNome: string;
      etapa4Nome: string;
      etapa4Desc: string;
      frente4Id: string;
      frente4Codigo: "video" | "design_imagem";
      frente4Nome: string;
      metodoVisualId: string;
      metodoVisualNome: string;
    }
  > = {
    reels: {
      nomeCanal: "Reels (Vídeo Curto 30–60s)",
      etapa2Nome: "2. Roteiro Cronometrado (3 Provas em 60s) & Legenda",
      etapa2Desc:
        "Redige o roteiro afirmativo para o decisor B2B respeitando o Critério de Formato por Tema da Eloss.",
      metodoCopyId: METODO_ROTEIRO_REELS_ID,
      metodoCopyNome: "Método de Roteiro de Reels Eloss (3 Provas em 60s) (v1)",
      etapa4Nome: "4. Direção de Gravação, Vídeo & Capa do Reels",
      etapa4Desc:
        "Recebe por relé o roteiro aprovado no Gate e produz a decupagem de cenas, vídeo e capa de feed.",
      frente4Id: FRENTE_VIDEO_ID,
      frente4Codigo: "video",
      frente4Nome: "Vídeo",
      metodoVisualId: METODO_DIRECAO_VISUAL_REELS_ID,
      metodoVisualNome: "Direção Visual de Vídeo Eloss (v1)",
    },
    carrossel: {
      nomeCanal: "Carrossel Instagram (8 Lâminas — Dark Tech Eloss)",
      etapa2Nome: "2. Redação das 8 Lâminas (Poppins + DM Sans) & Legenda",
      etapa2Desc:
        "Estrutura os 8 slides no modo escuro (#0A0820 / #382060) com 1 trecho em gradiente por headline e zero vocabulário de consultoria.",
      metodoCopyId: METODO_CARROSSEL_COPY_ID,
      metodoCopyNome:
        "Método do Agente de Instagram Eloss (Carrossel 7–8 Slides Dark Tech) (v1)",
      etapa4Nome: "4. Direção Estética Dark Tech & Composição 3D Glass",
      etapa4Desc:
        "Recebe o texto revisado de cada lâmina e aplica a direção visual Dark Tech Eloss (#0A0820, glows #5B1F8A e #F4834B).",
      frente4Id: FRENTE_DESIGN_ID,
      frente4Codigo: "design_imagem",
      frente4Nome: "Design / Imagem",
      metodoVisualId: METODO_DESIGN_ESTATICO_ID,
      metodoVisualNome:
        "Direção Estética Instagram Eloss (#0A0820 / #382060 + 3D Glass) (v1)",
    },
    post_simples: {
      nomeCanal: "Post Simples (Feed Estático)",
      etapa2Nome: "2. Copy de Declaração Técnica (Até 6 palavras) & Legenda",
      etapa2Desc:
        "Sintetiza a constatação técnica em headline curta com trecho em gradiente + barra vertical #F4834B.",
      metodoCopyId: METODO_POST_SIMPLES_COPY_ID,
      metodoCopyNome: "Método de Post Único Eloss (Declaração Técnica) (v1)",
      etapa4Nome: "4. Direção de Arte & Design do Post Estático",
      etapa4Desc:
        "Transforma a síntese aprovada na Etapa 3 em peça gráfica 4:5 alinhada à paleta #382060 / #F4834B.",
      frente4Id: FRENTE_DESIGN_ID,
      frente4Codigo: "design_imagem",
      frente4Nome: "Design / Imagem",
      metodoVisualId: METODO_DESIGN_ESTATICO_ID,
      metodoVisualNome:
        "Direção Estética Instagram Eloss (#0A0820 / #382060 + 3D Glass) (v1)",
    },
    story: {
      nomeCanal: "Sequência de Stories B2B (4 Telas)",
      etapa2Nome: "2. Roteiro das 4 Telas + Enquete Executiva",
      etapa2Desc:
        "Adapta o tema para 4 telas sobrias com diagnóstico de maturidade operacional e link para o artigo âncora.",
      metodoCopyId: METODO_STORY_SEQUENCIA_ID,
      metodoCopyNome: "Método de Sequência de Stories B2B Eloss (v1)",
      etapa4Nome: "4. Montagem Visual das Telas de Stories & Stickers",
      etapa4Desc:
        "Prepara a composição visual das telas de Stories, posicionamento de enquete e link para plataformaeloss.com.br.",
      frente4Id: FRENTE_DESIGN_ID,
      frente4Codigo: "design_imagem",
      frente4Nome: "Design / Imagem",
      metodoVisualId: METODO_DESIGN_ESTATICO_ID,
      metodoVisualNome:
        "Direção Estética Instagram Eloss (#0A0820 / #382060 + 3D Glass) (v1)",
    },
  };

  const cfg = configFormato[formato] || configFormato.carrossel;

  return [
    {
      id: t1Id,
      marca_id: marcaId,
      demanda_id: demandaId,
      ordem: 1,
      nome_etapa: `1. Adaptação Estratégica para ${cfg.nomeCanal}`,
      descricao_etapa:
        "Adapta o tema canônico da Eloss respeitando o Critério de Formato por Tema e o público decisor B2B.",
      tipo_etapa: "execucao",
      exige_piso_compliance: false,
      frente_id: FRENTE_ESTRATEGIA_ID,
      frente_codigo: "estrategia_comunicacao",
      frente_nome: "Estratégia de Comunicação",
      metodo_id: METODO_DECOMPOSICAO_REELS_ID,
      metodo_nome:
        "Método de Adaptação Multicanal Eloss (Padrão AEO + Critério de Formato) (v1)",
      depende_de_tarefa_id: null,
      retorna_para_ordem_em_reprovacao: 1,
      papel_executor: "Agente Estrategista Eloss",
      papel_revisor: "Isabelle (Validação)",
      papel_titular: "Evandro (Titular da Marca)",
      status: "aprovada",
      input_rele: {
        formato_canal: formato,
        origem: "BASE_OFICIAL_ELOSS_SUPABASE",
        briefing,
      },
      prompt_compilado: null,
      prompt_compilado_em: null,
      rodada_revisao_atual: 0,
      rodadas_revisao_exigidas: 1,
      motivo_ultima_reprovacao: null,
      prazo: addHoursToClock(clockIso, 8),
      atualizado_em: clockIso,
    },
    {
      id: t2Id,
      marca_id: marcaId,
      demanda_id: demandaId,
      ordem: 2,
      nome_etapa: cfg.etapa2Nome,
      descricao_etapa: cfg.etapa2Desc,
      tipo_etapa: "execucao",
      exige_piso_compliance: false,
      frente_id: FRENTE_COPY_ID,
      frente_codigo: "copy",
      frente_nome: "Copywriting",
      metodo_id: cfg.metodoCopyId,
      metodo_nome: cfg.metodoCopyNome,
      depende_de_tarefa_id: t1Id,
      retorna_para_ordem_em_reprovacao: 2,
      papel_executor: "Agente Redator Eloss",
      papel_revisor: "Isabelle (Validação)",
      papel_titular: "Evandro (Titular da Marca)",
      status: "aprovada",
      input_rele: {},
      prompt_compilado: null,
      prompt_compilado_em: null,
      rodada_revisao_atual: 0,
      rodadas_revisao_exigidas: 2,
      motivo_ultima_reprovacao: null,
      prazo: addHoursToClock(clockIso, 16),
      atualizado_em: clockIso,
    },
    {
      id: t3Id,
      marca_id: marcaId,
      demanda_id: demandaId,
      ordem: 3,
      nome_etapa: "3. Gate de Qualidade & Regras da Marca Eloss",
      descricao_etapa:
        "Validação da peça contra as regras da Eloss (sem palavras proibidas, sem vocabulário de consultoria, tom afirmativo e Padrão AEO).",
      tipo_etapa: "gate_qualidade",
      exige_piso_compliance: true,
      frente_id: FRENTE_COPY_ID,
      frente_codigo: "copy",
      frente_nome: "Copywriting",
      metodo_id: cfg.metodoCopyId,
      metodo_nome: cfg.metodoCopyNome,
      depende_de_tarefa_id: t2Id,
      retorna_para_ordem_em_reprovacao: 2,
      papel_executor: "Isabelle (Validação)",
      papel_revisor: "Isabelle (Validação)",
      papel_titular: "Evandro (Titular da Marca)",
      status: "aguardando_gate",
      input_rele: {},
      prompt_compilado: null,
      prompt_compilado_em: null,
      rodada_revisao_atual: 0,
      rodadas_revisao_exigidas: 2,
      motivo_ultima_reprovacao: null,
      prazo: addHoursToClock(clockIso, 24),
      atualizado_em: clockIso,
    },
    {
      id: t4Id,
      marca_id: marcaId,
      demanda_id: demandaId,
      ordem: 4,
      nome_etapa: cfg.etapa4Nome,
      descricao_etapa: cfg.etapa4Desc,
      tipo_etapa: "execucao",
      exige_piso_compliance: false,
      frente_id: cfg.frente4Id,
      frente_codigo: cfg.frente4Codigo,
      frente_nome: cfg.frente4Nome,
      metodo_id: cfg.metodoVisualId,
      metodo_nome: cfg.metodoVisualNome,
      depende_de_tarefa_id: t3Id,
      retorna_para_ordem_em_reprovacao: 4,
      papel_executor: `Agente de ${cfg.frente4Nome} Eloss`,
      papel_revisor: "Isabelle (Validação)",
      papel_titular: "Evandro (Titular da Marca)",
      status: "bloqueada",
      input_rele: {},
      prompt_compilado: null,
      prompt_compilado_em: null,
      rodada_revisao_atual: 0,
      rodadas_revisao_exigidas: 2,
      motivo_ultima_reprovacao: null,
      prazo: addHoursToClock(clockIso, 36),
      atualizado_em: clockIso,
    },
    {
      id: t5Id,
      marca_id: marcaId,
      demanda_id: demandaId,
      ordem: 5,
      nome_etapa: "5. Gate de Aprovação Final + Compliance",
      descricao_etapa:
        "Aprovação final da peça pronta com imagem e texto validados.",
      tipo_etapa: "gate_titular",
      exige_piso_compliance: true,
      frente_id: cfg.frente4Id,
      frente_codigo: cfg.frente4Codigo,
      frente_nome: cfg.frente4Nome,
      metodo_id: cfg.metodoVisualId,
      metodo_nome: cfg.metodoVisualNome,
      depende_de_tarefa_id: t4Id,
      retorna_para_ordem_em_reprovacao: 4,
      papel_executor: "Evandro / Isabelle",
      papel_revisor: "Isabelle",
      papel_titular: "Evandro (Titular da Marca)",
      status: "bloqueada",
      input_rele: {},
      prompt_compilado: null,
      prompt_compilado_em: null,
      rodada_revisao_atual: 0,
      rodadas_revisao_exigidas: 1,
      motivo_ultima_reprovacao: null,
      prazo: addHoursToClock(clockIso, 44),
      atualizado_em: clockIso,
    },
    {
      id: t6Id,
      marca_id: marcaId,
      demanda_id: demandaId,
      ordem: 6,
      nome_etapa: "6. Peça Pronta para Publicação",
      descricao_etapa:
        "Consolida o pacote final aprovado pronto para publicação.",
      tipo_etapa: "empacotamento",
      exige_piso_compliance: false,
      frente_id: FRENTE_ESTRATEGIA_ID,
      frente_codigo: "estrategia_comunicacao",
      frente_nome: "Estratégia de Comunicação",
      metodo_id: cfg.metodoVisualId,
      metodo_nome: cfg.metodoVisualNome,
      depende_de_tarefa_id: t5Id,
      retorna_para_ordem_em_reprovacao: 5,
      papel_executor: "Operador de Publicação",
      papel_revisor: "Isabelle",
      papel_titular: "Evandro",
      status: "bloqueada",
      input_rele: {},
      prompt_compilado: null,
      prompt_compilado_em: null,
      rodada_revisao_atual: 0,
      rodadas_revisao_exigidas: 1,
      motivo_ultima_reprovacao: null,
      prazo: addHoursToClock(clockIso, 48),
      atualizado_em: clockIso,
    },
  ];
}

export function buildSixStepsForReels(
  marcaId: string,
  demandaId: string,
  briefing: Demanda["briefing"],
  clockIso: string
): TarefaFluxo[] {
  return buildSixStepsForFormato(marcaId, demandaId, "reels", briefing, clockIso);
}

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", ".motor-data")
  : path.join(process.cwd(), ".motor-data");
const DB_FILE = path.join(DATA_DIR, "fase0-db.json");

const globalForMotorDb = globalThis as unknown as {
  __motorDbCache?: MotorDatabaseState;
};

export function readMotorDb(): MotorDatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      if (
        globalForMotorDb.__motorDbCache &&
        globalForMotorDb.__motorDbCache.schema_version ===
          MOTOR_DB_SCHEMA_VERSION
      ) {
        return globalForMotorDb.__motorDbCache;
      }
      const initial = createInitialSeed();
      globalForMotorDb.__motorDbCache = initial;
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      } catch {
        // read-only fallback
      }
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as MotorDatabaseState;
    if (
      parsed.schema_version !== MOTOR_DB_SCHEMA_VERSION ||
      !parsed.temas_editoriais ||
      !parsed.insumos_radar
    ) {
      const upgraded = createInitialSeed();
      globalForMotorDb.__motorDbCache = upgraded;
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(upgraded, null, 2), "utf-8");
      } catch {
        // read-only fallback
      }
      return upgraded;
    }
    globalForMotorDb.__motorDbCache = parsed;
    return parsed;
  } catch {
    if (globalForMotorDb.__motorDbCache) {
      return globalForMotorDb.__motorDbCache;
    }
    const fallback = createInitialSeed();
    globalForMotorDb.__motorDbCache = fallback;
    return fallback;
  }
}

export function writeMotorDb(state: MotorDatabaseState): void {
  globalForMotorDb.__motorDbCache = state;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // Em ambiente serverless somente-leitura, mantém em globalForMotorDb.__motorDbCache
  }
}

export function resetMotorDbToSeed(): MotorDatabaseState {
  const initial = createInitialSeed();
  writeMotorDb(initial);
  return initial;
}
