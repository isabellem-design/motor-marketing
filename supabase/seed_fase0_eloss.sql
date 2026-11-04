-- ============================================================================
-- SEED INICIAL FASE 0: Marca Eloss + 7 Frentes + Métodos + Fluxo Reels Semanal
-- ============================================================================

-- 1. Marca Piloto: Eloss (mais marcas próprias preparadas no catálogo)
insert into public.marcas (id, slug, nome, tipo_marca, fonte_conhecimento, config_fonte, ativa)
values
  ('11111111-1111-4111-8111-111111111101', 'eloss', 'Eloss', 'interna', 'supabase', '{"origem": "supabase_live"}'::jsonb, true),
  ('11111111-1111-4111-8111-111111111102', 'trampo-space', 'Trampô Space', 'interna', 'supabase', '{"origem": "supabase_live"}'::jsonb, true),
  ('11111111-1111-4111-8111-111111111103', 'agentfaz', 'Agentfaz', 'interna', 'supabase', '{"origem": "supabase_live"}'::jsonb, true)
on conflict (slug) do nothing;

-- 2. Base de Conhecimento Viva da Eloss (Template Único de 6 Categorias)
insert into public.bases_conhecimento_marca (
  marca_id,
  identidade_tom,
  publico,
  posicionamento,
  produtos_catalogo,
  restricoes_conteudo,
  historico_resumo
)
values (
  '11111111-1111-4111-8111-111111111101',
  'Tom direto, lúcido, arquitetural e pragmático. Sem jargão vazio de marketing digital. Fala com clareza executiva, foco em estrutura real, operação limpa e autonomia com governança.',
  'Fundadores, gestores de operação e líderes de pequenas e médias empresas que sofrem com retrabalho operacional, falta de processo claro e dependência de improviso.',
  'Ecossistema de gestão, estruturação operacional e inteligência prática para negócios que querem escalar com método e previsibilidade.',
  'Painel ELOSS (gestão operacional, CRM, trabalho por papéis Executor/Revisor/Titular), Consultoria de Estruturação e Operação Assistida.',
  'PROIBIÇÕES INEGOCIÁVEIS (Fundação Agentfaz): 1) Proibido prometer retorno financeiro específico ou ganho garantido. 2) Proibido criar urgência artificial ou escassez falsa. 3) Proibido fazer afirmação absoluta ("o único", "100% garantido", "nunca falha") sem evidência factual verificável.',
  'Reels anteriores abordaram: diferença entre delegar tarefa vs. delegar processo; por que reuniões de alinhamento substituem processos mal desenhados.'
)
on conflict (marca_id) do nothing;

-- 3. As 7 Frentes da Agentfaz
insert into public.frentes (id, codigo, nome, descricao)
values
  ('22222222-2222-4222-8222-222222222201', 'estrategia_comunicacao', 'Estratégia de Comunicação', 'Pauta, ângulo, decomposição de briefing e arquitetura da mensagem'),
  ('22222222-2222-4222-8222-222222222202', 'copy', 'Copywriting', 'Roteiros, textos de apoio, legendas, headlines e narrativa persuasiva ética'),
  ('22222222-2222-4222-8222-222222222203', 'design_imagem', 'Design / Imagem', 'Direção visual, capas, estáticos e carrosséis'),
  ('22222222-2222-4222-8222-222222222204', 'video', 'Vídeo', 'Produção, decupagem visual, direção de gravação e edição de Reels/vídeos'),
  ('22222222-2222-4222-8222-222222222205', 'lp_site', 'LP / Site', 'Páginas de captura, institucional e conversão'),
  ('22222222-2222-4222-8222-222222222206', 'campanha', 'Campanha', 'Orquestração de mídia paga, Google Ads e distribuição'),
  ('22222222-2222-4222-8222-222222222207', 'fluxo_venda', 'Fluxo de Venda', 'Cadências comerciais, scripts de abordagem e fechamento')
on conflict (codigo) do nothing;

-- 4. Métodos Universais para o Fluxo de Reels Semanal
insert into public.metodos (id, frente_id, codigo, versao, nome, nivel, instrucoes_playbook)
values
  (
    '33333333-3333-4333-8333-333333333301',
    '22222222-2222-4222-8222-222222222201',
    'decomposicao_briefing_reels',
    1,
    'Método Universal de Decomposição e Ângulo de Reels',
    'avancado',
    '1. Analise o briefing bruto e verifique se há tese clara, dor real do público e objetivo único.\n2. Se houver ambiguidade crítica ou falta de insumo, escale para Gate de Decisão Humano.\n3. Defina: (a) Tese central em 1 frase; (b) Contraste principal (Erro comum vs. Visão estruturada); (c) Gancho de abertura para os primeiros 3 segundos; (d) Ação esperada ao final (CTA).'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '22222222-2222-4222-8222-222222222202',
    'roteiro_reels_universal',
    1,
    'Método Universal de Roteiro de Reels (30-60s)',
    'avancado',
    '1. Receba o ângulo validado da etapa anterior (Relé).\n2. Estruture o roteiro em 4 blocos cronometrados:\n   - [00-03s] GANCHO: Quebra de expectativa direta sem saudação genérica.\n   - [03-15s] DIAGNÓSTICO DO PROBLEMA: Descreva o sintoma real vivido pelo público.\n   - [15-45s] VIRADA DE MÉTODO: Apresente o princípio estrutural que resolve a causa-raiz.\n   - [45-60s] FECHAMENTO + CTA: Síntese memorável e convite claro sem urgência artificial.\n3. Entregue também: Texto de apoio em tela (lettering) e Legenda estruturada para o post.'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '22222222-2222-4222-8222-222222222204',
    'direcao_visual_reels',
    1,
    'Método Universal de Decupagem Visual e Capa de Reels',
    'avancado',
    '1. Utilize exclusivamente o roteiro aprovado no Gate de Copy.\n2. Para cada bloco do roteiro, especifique enquadramento, cortes de ritmo, B-rolls ou elementos gráficos de suporte.\n3. Defina o texto curto de Capa (máx. 5 palavras) e o prompt/diretriz visual para a thumbnail do Reels.'
  )
on conflict (codigo, versao) do nothing;

-- 5. Exceção Documentada da Marca Eloss sobre o Método Universal de Roteiro de Reels
insert into public.marca_metodo_excecoes (marca_id, metodo_id, regras_excecao)
values (
  '11111111-1111-4111-8111-111111111101',
  '33333333-3333-4333-8333-333333333302',
  'EXCEÇÃO ELOSS: Nunca usar gírias de "hustle culture" ("escala 10x", "fórmula secreta", "hack"). Sempre ancorar os exemplos em situações concretas de operação (ex.: passagem de bastão entre áreas, clareza de dono da tarefa, registro de motivo de reprovação). Preferir fechamento reflexivo ou convite para diagnóstico estrutural.'
)
on conflict (marca_id, metodo_id) do nothing;
