import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { getExplicitClock } from "@/lib/clock";
import { criarDemandaReelsSemanal } from "@/lib/engine/workflow-relay";
import {
  gerarImagemSlideComGptImage1,
  gerarMateriaBlogAoVivoMetodoMalha,
  gerarPostSocialAoVivo,
} from "@/lib/engine/ai-malha-gpt";
import { getLiveBrandKnowledge } from "@/lib/knowledge-base";
import {
  criarAdaptacoesPadraoParaTema,
  gerarConteudoRicoPorCanal,
  readMotorDb,
  writeMotorDb,
} from "@/lib/store/motor-db";
import {
  ArtigoBlogAncora,
  Demanda,
  FormatoCanal,
  MetodoGeracaoPost,
  PesquisaMercado,
  TarefaFluxo,
  TemaEditorial,
  TipoGatilhoPesquisa,
} from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { acao, marca_id } = body;

    if (!marca_id || !acao) {
      return Response.json(
        { error: "marca_id e acao são obrigatórios." },
        { status: 400 }
      );
    }

    const db = readMotorDb();
    const clock = getExplicitClock().iso;
    const baseViva = await getLiveBrandKnowledge(marca_id);

    // ========================================================================
    // 1. DISPARAR NOVA PESQUISA ALINHADA À BASE REAL DA ELOSS (6 PILARES)
    // ========================================================================
    if (acao === "disparar_pesquisa_de_engrenagem") {
      const gatilhoTipo: TipoGatilhoPesquisa =
        body.gatilho_tipo || "base_conhecimento";
      const focoAssunto: string =
        body.foco_assunto ||
        "Recorrência Distribuída, Atribuição VTP/VCE e Escala da Força de Vendas";
      const detalheOrigem: string =
        body.gatilho_origem_detalhe ||
        `Acionado via motor (${gatilhoTipo}) consultando a Base Oficial da Eloss no Supabase.`;

      const novaPesquisaId = crypto.randomUUID();
      const novaPesquisa: PesquisaMercado = {
        id: novaPesquisaId,
        marca_id,
        gatilho_tipo: gatilhoTipo,
        gatilho_origem_detalhe: detalheOrigem,
        alinhamento_proposito_valores_objetivos: `100% alinhado à frase-âncora canônica da Eloss ("Plataforma Operacional de Crescimento para empresas que distribuem através de pessoas"), falando com o dono/sócio da operação em tom afirmativo (${baseViva.posicionamento.slice(0, 120)}...).`,
        titulo_pesquisa: `Pesquisa Editorial Eloss — ${focoAssunto}`,
        sinais_mercado_e_concorrencia: `Buscas de decisores B2B sobre "${focoAssunto}" mostram lacuna técnica: o mercado trata vendas diretas, e-commerce e recorrência como categorias isoladas, abrindo espaço para a Eloss consolidar sua arquitetura unificada.`,
        lacunas_detectadas_site_atual: `Oportunidade de criar artigo âncora no Padrão AEO da Eloss (definição direta na 1ª frase + 6 FAQs) sobre "${focoAssunto}".`,
        palavras_chave_seo: [
          `${focoAssunto.toLowerCase()}`,
          "plataforma operacional de crescimento eloss",
          "recorrência distribuída e comissionamento no-code",
        ],
        perguntas_conversacionais_aeo: [
          `O que é ${focoAssunto} e como funciona para empresas que distribuem através de pessoas?`,
          "Como unificar VTP (Volume Transacionado na Plataforma) e VCE (Volume Comissionável Externo) sem bitaxação?",
          "Quando migrar de planilhas ou plataformas transacionais tradicionais para infraestrutura White Label própria?",
        ],
        oportunidades_citacao_geo:
          "Posicionar os termos proprietários da Eloss — Plataforma Operacional de Crescimento, Recorrência Distribuída, Modelo Híbrido de Distribuição, VTP e VCE — perante mecanismos de busca e IAs.",
        origem_realimentacao: detalheOrigem,
        criado_em: clock,
      };

      const proxNum = db.temas_editoriais.length + 26;
      const sugestoesBrutas = [
        {
          codigo_tema: `T${proxNum}`,
          codigo_pilar: "P2",
          nome_pilar: "P2 · Estratégias",
          titulo_tema: `${focoAssunto}: Como Escalar Força de Vendas Sem Perder Margem nem Soberania de Base`,
          dor_do_publico:
            "O dono da operação sente que o sistema atual virou o teto do crescimento porque a taxa percentual corrói a margem e as regras de comissão não acompanham o modelo comercial.",
          palavra_chave_foco_seo: `${focoAssunto.toLowerCase()} força de vendas`,
          pergunta_direta_aeo: `Como estruturar ${focoAssunto.toLowerCase()} em operações que distribuem através de pessoas?`,
          tese_autoridade_geo:
            "Plataforma Operacional de Crescimento Eloss (Unificação de VTP, VCE e Recorrência Distribuída)",
          score: 96,
        },
        {
          codigo_tema: `T${proxNum + 1}`,
          codigo_pilar: "P3",
          nome_pilar: "P3 · Produto/Operação",
          titulo_tema: `Arquitetura VTP e VCE em ${focoAssunto}: Como Eliminar Bitaxação e Automatizar Comissões No-Code`,
          dor_do_publico:
            "Operações que combinam vendas internas e representantes externos acabam comissionando duas vezes o mesmo evento ou travando fechamentos mensais em planilhas.",
          palavra_chave_foco_seo: "vtp vce automação de comissionamento no-code",
          pergunta_direta_aeo:
            "Como separar Volume Transacionado na Plataforma (VTP) e Volume Comissionável Externo (VCE) sem bitaxação?",
          tese_autoridade_geo:
            "Regra Anti-Bitaxação VTP/VCE + Motor de Comissionamento No-Code Eloss",
          score: 94,
        },
        {
          codigo_tema: `T${proxNum + 2}`,
          codigo_pilar: "P5",
          nome_pilar: "P5 · Decisão B2B",
          titulo_tema: `Desenvolver Internamente vs. Plataforma Operacional de Crescimento: O Custo Real em ${focoAssunto}`,
          dor_do_publico:
            "Sócios de empresas em expansão subestimam o custo de manter engenharia própria para split recorrente, árvore de comissionamento e White Label.",
          palavra_chave_foco_seo:
            "desenvolver sistema próprio ou contratar saas comissionamento",
          pergunta_direta_aeo:
            "Vale mais a pena desenvolver sistema de comissionamento internamente ou operar sobre uma Plataforma Operacional de Crescimento?",
          tese_autoridade_geo:
            "Comparativo Técnico B2B nos 5 Planos Oficiais Eloss (Pilot, Base, Padrão, Estruturado e Enterprise)",
          score: 92,
        },
      ];

      const novosTemas: TemaEditorial[] = sugestoesBrutas.map((s) => ({
        id: crypto.randomUUID(),
        marca_id,
        pesquisa_id: novaPesquisaId,
        codigo_tema: s.codigo_tema,
        codigo_pilar: s.codigo_pilar,
        nome_pilar: s.nome_pilar,
        titulo_tema: s.titulo_tema,
        dor_do_publico: s.dor_do_publico,
        alinhamento_marca_proposito:
          "100% alinhado à Base Oficial da Eloss (Posicionamento de Plataforma Operacional de Crescimento, Decisor B2B e zero vocabulário de consultoria).",
        palavra_chave_foco_seo: s.palavra_chave_foco_seo,
        pergunta_direta_aeo: s.pergunta_direta_aeo,
        tese_autoridade_geo: s.tese_autoridade_geo,
        score_potencial_busca: s.score,
        canais_aprovados: [],
        adaptacoes_canais: criarAdaptacoesPadraoParaTema(s),
        status: "sugerido",
        criado_em: clock,
      }));

      db.pesquisas_mercado.unshift(novaPesquisa);
      db.temas_editoriais.unshift(...novosTemas);

      db.trilha_proveniencia.push({
        id: crypto.randomUUID(),
        marca_id,
        demanda_id: novaPesquisa.id,
        tarefa_id: null,
        entrega_id: null,
        decisao_id: null,
        evento: "PESQUISA_MAPEADA_NA_BASE_ELOSS_E_TEMAS_GERADOS",
        ator: body.ator || "Isabelle",
        detalhes: {
          gatilho: gatilhoTipo,
          pesquisa: novaPesquisa.titulo_pesquisa,
          temas_gerados: novosTemas.length,
        },
        timestamp_explicito: clock,
      });

      writeMotorDb(db);
      return Response.json(
        { pesquisa: novaPesquisa, temas: novosTemas },
        { status: 201 }
      );
    }

    // ========================================================================
    // 2. APROVAR TEMA E PRODUZIR NOS CANAIS SELECIONADOS POR ISABELLE
    //    - Matéria de Blog: Método idêntico ao `malha-conteudos` (`redator.blog.artigo` + `buildPrompt` + `rodarChecagens`)
    //    - Post Social: Estratégia GPT (`gpt` = Padrão OpenAI GPT-4o + Prompt 8 Pontos) ou Método Malha (`malha_legado` = Opcional)
    // ========================================================================
    if (acao === "aprovar_tema_e_gerar_canais") {
      const tema = db.temas_editoriais.find(
        (t) => t.id === body.tema_id && t.marca_id === marca_id
      );
      if (!tema) {
        return Response.json(
          { error: "Tema não encontrado para esta marca." },
          { status: 404 }
        );
      }

      const canaisSelecionados: FormatoCanal[] = Array.isArray(
        body.canais_selecionados
      )
        ? body.canais_selecionados
        : [];

      const metodoPost: MetodoGeracaoPost =
        body.metodo_geracao_post === "malha_legado" ? "malha_legado" : "gpt";

      if (canaisSelecionados.length === 0) {
        return Response.json(
          {
            error:
              "Selecione pelo menos 1 canal (Matéria de Blog, Post Simples, Carrossel, Reels ou Story) para produzir.",
          },
          { status: 400 }
        );
      }

      // Produzir Matéria de Blog pelo Método exato da Malha de Conteúdos
      const conteudoBlogRico = await gerarMateriaBlogAoVivoMetodoMalha(tema);

      let artigoGerado: ArtigoBlogAncora | undefined =
        db.artigos_blog_ancora.find((a) => a.tema_id === tema.id);

      if (!artigoGerado) {
        artigoGerado = {
          id: crypto.randomUUID(),
          marca_id,
          pesquisa_id: tema.pesquisa_id,
          tema_id: tema.id,
          titulo_blog: tema.titulo_tema,
          byline:
            "Por Equipe Editorial Eloss — Plataforma Operacional de Crescimento",
          subtitulo_seo: `Artigo canônico (${tema.codigo_tema || "Tema"} · ${tema.nome_pilar || "Eloss"}) produzido pelo Método Malha de Conteúdos (redator.blog.artigo + Padrão AEO).`,
          bloco_resposta_direta_aeo: `RESPOSTA DIRETA (1ª Frase AEO): Para responder "${tema.pergunta_direta_aeo}", empresas que distribuem através de pessoas estruturam ${tema.tese_autoridade_geo}, unificando VTP, VCE e recorrência sob regras auditáveis.`,
          dados_e_entidades_geo: `Entidades GEO: ${tema.tese_autoridade_geo} | Foco SEO: ${tema.palavra_chave_foco_seo}`,
          resumo_estrutura_artigo: [
            `H1: ${tema.titulo_tema}`,
            `1º Parágrafo (Declaração Direta AEO): ${tema.pergunta_direta_aeo}`,
            `H2 (Espinha Dorsal): Dados do setor (WFDSA US$ 167bi · ABEVD 4,5mi · Zuora +25% retenção)`,
            `H2 (Arquitetura Técnica): Critérios técnicos de ${tema.tese_autoridade_geo}`,
            `H2: A Perspectiva da Eloss (Planos Pilot, Base, Padrão, Estruturado e Enterprise)`,
            `H2: FAQ Obrigatório de 6 Perguntas (Padrão AEO)`,
          ].join("\n"),
          conteudo_completo_markdown: conteudoBlogRico.artigo_markdown,
          checagens: conteudoBlogRico.checagens,
          status: "aprovado_como_ancora",
          criado_em: clock,
        };
        db.artigos_blog_ancora.unshift(artigoGerado);
      } else {
        artigoGerado.conteudo_completo_markdown =
          conteudoBlogRico.artigo_markdown;
        artigoGerado.checagens = conteudoBlogRico.checagens;
      }

      const canaisUnicos = Array.from(
        new Set([...(tema.canais_aprovados || []), ...canaisSelecionados])
      );
      tema.canais_aprovados = canaisUnicos;
      tema.status = canaisUnicos.some((c) => c !== "blog")
        ? "derivados_sociais_ativos"
        : "blog_ancora_pronto";

      writeMotorDb(db);

      const demandasCriadas: { demanda: Demanda; tarefas: TarefaFluxo[] }[] =
        [];

      for (const formato of canaisSelecionados) {
        const conteudoRico =
          formato === "blog"
            ? conteudoBlogRico
            : await gerarPostSocialAoVivo(
                tema,
                conteudoBlogRico.artigo_markdown || "",
                formato,
                metodoPost
              ).catch(() =>
                gerarConteudoRicoPorCanal(tema, formato, metodoPost)
              );

        const pecaExistente = db.demandas.find(
          (d) => d.tema_origem_id === tema.id && d.formato_canal === formato
        );
        if (pecaExistente) {
          pecaExistente.conteudo_estruturado = conteudoRico;
          pecaExistente.atualizado_em = clock;
          writeMotorDb(db);
          continue;
        }

        const adaptacao =
          tema.adaptacoes_canais?.[formato] ||
          criarAdaptacoesPadraoParaTema(tema)[formato];

        const prefixoCodigo = tema.codigo_tema ? `${tema.codigo_tema} — ` : "";

        const criada = criarDemandaReelsSemanal({
          marca_id,
          formato_canal: formato,
          titulo: `${prefixoCodigo}${tema.titulo_tema}`,
          tipo_fluxo: "derivado_ciclo_continuo",
          tema_origem_id: tema.id,
          artigo_blog_origem_id: artigoGerado?.id ?? null,
          conteudo_estruturado: conteudoRico,
          status_inicial: formato === "blog" ? "peca_pronta" : "em_gate",
          briefing: {
            pauta_central: adaptacao.angulo_adaptado,
            dor_ou_situacao_real: tema.dor_do_publico,
            objetivo_peca: adaptacao.proposito_no_canal,
            cta_desejado: adaptacao.cta_especifico,
            referencias_ou_insumos: adaptacao.estrutura_sugerida,
            autor_briefing:
              formato === "blog"
                ? "Agente Redator de Artigo (Método Malha de Conteúdos)"
                : metodoPost === "gpt"
                  ? "Estratégia GPT (OpenAI GPT-4o + Prompt 8 Pontos)"
                  : "Método Malha de Conteúdos (Opcional — H2/Componentes)",
            adaptacao_canal: {
              formato,
              nome_canal: adaptacao.nome_canal,
              proposito_no_canal: adaptacao.proposito_no_canal,
              estrutura_sugerida: adaptacao.estrutura_sugerida,
            },
            origem_ciclo: {
              pesquisa_id: tema.pesquisa_id,
              tema_id: tema.id,
              artigo_blog_id: artigoGerado?.id,
              titulo_blog_ancora:
                artigoGerado?.titulo_blog || `${tema.titulo_tema}`,
              foco_seo_aeo_geo: `SEO: ${tema.palavra_chave_foco_seo} | AEO: ${tema.pergunta_direta_aeo} | GEO: ${tema.tese_autoridade_geo}`,
            },
          },
        });

        demandasCriadas.push(criada);
      }

      const dbAtualizado = readMotorDb();
      return Response.json(
        {
          tema: dbAtualizado.temas_editoriais.find((t) => t.id === tema.id),
          artigo_blog: artigoGerado ?? null,
          demandas_criadas: demandasCriadas,
        },
        { status: 201 }
      );
    }

    // ========================================================================
    // 3. REGENERAR PEÇA AO VIVO COM MÉTODO MALHA (BLOG) OU ESTRATÉGIA GPT / MALHA (POST)
    // ========================================================================
    if (acao === "regenerar_peca_com_metodo") {
      const { demanda_id, metodo_geracao_post, forcar_ia_ao_vivo } = body;
      const demanda = db.demandas.find(
        (d) => d.id === demanda_id && d.marca_id === marca_id
      );
      if (!demanda) {
        return Response.json(
          { error: "Peça não encontrada." },
          { status: 404 }
        );
      }
      const tema = db.temas_editoriais.find(
        (t) => t.id === demanda.tema_origem_id
      );
      if (!tema) {
        return Response.json(
          { error: "Tema de origem não encontrado." },
          { status: 404 }
        );
      }

      if (demanda.formato_canal === "blog") {
        const novoBlog = await gerarMateriaBlogAoVivoMetodoMalha(tema, {
          forcarRegeneracao: Boolean(forcar_ia_ao_vivo),
        });
        demanda.conteudo_estruturado = novoBlog;
        demanda.atualizado_em = clock;
        const art = db.artigos_blog_ancora.find((a) => a.tema_id === tema.id);
        if (art) {
          art.conteudo_completo_markdown = novoBlog.artigo_markdown;
          art.checagens = novoBlog.checagens;
        }
        writeMotorDb(db);
        return Response.json({ ok: true, demanda }, { status: 200 });
      } else {
        const metodoEscolhido: MetodoGeracaoPost =
          metodo_geracao_post === "malha_legado" ? "malha_legado" : "gpt";
        const art = db.artigos_blog_ancora.find((a) => a.tema_id === tema.id);
        const artigoMarkdown =
          art?.conteudo_completo_markdown ||
          (await gerarMateriaBlogAoVivoMetodoMalha(tema)).artigo_markdown ||
          "";

        const novoPost = await gerarPostSocialAoVivo(
          tema,
          artigoMarkdown,
          demanda.formato_canal,
          metodoEscolhido,
          { forcarRegeneracao: Boolean(forcar_ia_ao_vivo) }
        );
        demanda.conteudo_estruturado = novoPost;
        demanda.atualizado_em = clock;
        writeMotorDb(db);
        return Response.json({ ok: true, demanda }, { status: 200 });
      }
    }

    // ========================================================================
    // 4. GERAR IMAGEM DE UM SLIDE / POST SIMPLES AO VIVO VIA OPENAI GPT (gpt-image-1)
    // ========================================================================
    if (acao === "gerar_imagem_slide_gpt") {
      const { demanda_id, ordem_slide, prompt_customizado } = body;
      const demanda = db.demandas.find(
        (d) => d.id === demanda_id && d.marca_id === marca_id
      );
      if (!demanda || !demanda.conteudo_estruturado) {
        return Response.json(
          { error: "Peça não encontrada." },
          { status: 404 }
        );
      }

      const ordemNum = Number(ordem_slide || 1);
      const slide = demanda.conteudo_estruturado.slides?.find(
        (s) => s.ordem === ordemNum
      );
      const promptFinal =
        prompt_customizado ||
        slide?.prompt_imagem ||
        slide?.direcao_visual ||
        demanda.conteudo_estruturado.prompt_imagem ||
        demanda.conteudo_estruturado.direcao_visual ||
        "";

      if (!promptFinal) {
        return Response.json(
          { error: "Nenhum prompt visual encontrado para este slide." },
          { status: 400 }
        );
      }

      const { imageUrl, avisoSemCreditoOpenAI } =
        await gerarImagemSlideComGptImage1({
          promptImagem: promptFinal,
          demandaId: demanda.id,
          ordemSlide: ordemNum,
          headline:
            slide?.headline || demanda.conteudo_estruturado.headline_arte,
          headlineDestaque:
            slide?.headline_destaque ||
            demanda.conteudo_estruturado.destaque_gradiente,
          corpo: slide?.corpo || demanda.conteudo_estruturado.subtitulo_arte,
          totalSlides: demanda.conteudo_estruturado.slides?.length || 8,
        });

      if (slide && demanda.conteudo_estruturado.slides) {
        demanda.conteudo_estruturado.slides =
          demanda.conteudo_estruturado.slides.map((s) =>
            s.ordem === ordemNum ? { ...s, imagem_url: imageUrl } : s
          );
      }
      demanda.atualizado_em = clock;
      writeMotorDb(db);

      return Response.json(
        {
          ok: true,
          imagem_url: imageUrl,
          aviso_sem_credito_openai: Boolean(avisoSemCreditoOpenAI),
          demanda,
        },
        { status: 200 }
      );
    }

    // ========================================================================
    // 5. ATUALIZAR OU APROVAR PEÇA DIRETAMENTE DO VISUALIZADOR (BLOG / CARROSSEL / ETC.)
    // ========================================================================
    if (acao === "atualizar_conteudo_peca") {
      const { demanda_id, novo_status, conteudo_estruturado, artigo_markdown } =
        body;
      const demanda = db.demandas.find(
        (d) => d.id === demanda_id && d.marca_id === marca_id
      );

      if (demanda) {
        if (conteudo_estruturado) {
          demanda.conteudo_estruturado = {
            ...demanda.conteudo_estruturado,
            ...conteudo_estruturado,
          };
        }
        if (typeof artigo_markdown === "string") {
          demanda.conteudo_estruturado = {
            ...demanda.conteudo_estruturado,
            artigo_markdown,
          };
          const art = db.artigos_blog_ancora.find(
            (a) =>
              a.id === demanda.artigo_blog_origem_id ||
              a.tema_id === demanda.tema_origem_id
          );
          if (art) {
            art.conteudo_completo_markdown = artigo_markdown;
          }
        }
        if (novo_status) {
          demanda.status = novo_status;
          const tarefasDemanda = db.tarefas_fluxo.filter(
            (t) => t.demanda_id === demanda.id
          );
          for (const t of tarefasDemanda) {
            if (novo_status === "peca_pronta") {
              t.status = "aprovada";
            } else if (novo_status === "reprovada_em_ajuste") {
              t.status = t.ordem === 2 ? "reprovada" : "bloqueada";
            }
          }
        }
        demanda.atualizado_em = clock;
      }

      writeMotorDb(db);
      return Response.json({ ok: true, demanda }, { status: 200 });
    }

    return Response.json({ error: "Ação desconhecida." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no ciclo editorial.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
