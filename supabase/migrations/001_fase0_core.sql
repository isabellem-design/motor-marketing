-- ============================================================================
-- MOTOR DE PRODUÇÃO DE MARKETING — FASE 0 CORE SCHEMA
-- Arquitetura Multi-Tenant onde marca_id é a unidade atômica
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. CAMADA DE MARCAS
create table if not exists public.marcas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  tipo_marca text not null check (tipo_marca in ('interna', 'cliente_externo')),
  fonte_conhecimento text not null check (fonte_conhecimento in ('supabase', 'notion')),
  config_fonte jsonb not null default '{}'::jsonb,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 2. BASE DE CONHECIMENTO POR MARCA (Fonte Viva no Supabase para marcas internas)
-- Template único de 6 categorias obrigatório
create table if not exists public.bases_conhecimento_marca (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null unique references public.marcas(id) on delete cascade,
  identidade_tom text not null default '',
  publico text not null default '',
  posicionamento text not null default '',
  produtos_catalogo text not null default '',
  restricoes_conteudo text not null default '',
  historico_resumo text not null default '',
  atualizado_em timestamptz not null default now()
);

-- 3. CAMADA DE FRENTES (Catálogo das 7 linhas da Agentfaz)
create table if not exists public.frentes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (
    codigo in (
      'copy',
      'design_imagem',
      'video',
      'lp_site',
      'campanha',
      'estrategia_comunicacao',
      'fluxo_venda'
    )
  ),
  nome text not null,
  descricao text not null default ''
);

-- 4. MÉTODOS UNIVERSAIS (Playbooks versionados e agnósticos de marca)
create table if not exists public.metodos (
  id uuid primary key default gen_random_uuid(),
  frente_id uuid not null references public.frentes(id) on delete restrict,
  codigo text not null,
  versao integer not null default 1,
  nome text not null,
  nivel text not null default 'avancado' check (nivel in ('basico', 'avancado')),
  instrucoes_playbook text not null,
  schema_input jsonb not null default '[]'::jsonb,
  schema_output jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (codigo, versao)
);

-- 5. EXCEÇÕES DOCUMENTADAS POR MARCA × MÉTODO
create table if not exists public.marca_metodo_excecoes (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  metodo_id uuid not null references public.metodos(id) on delete cascade,
  regras_excecao text not null,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now(),
  unique (marca_id, metodo_id)
);

-- 6. ESCADA DE MATURIDADE DE AUTOMAÇÃO (Decidida por Marca + Frente)
create table if not exists public.governanca_automacao (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  frente_id uuid not null references public.frentes(id) on delete cascade,
  nivel_automacao integer not null default 1 check (nivel_automacao in (1, 2, 3)),
  rodadas_revisao_exigidas integer not null default 2 check (rodadas_revisao_exigidas >= 1),
  justificativa_nivel text not null default 'Nível 1 inicial: Produção assistida + Aprovação 100% manual',
  atualizado_em timestamptz not null default now(),
  unique (marca_id, frente_id)
);

-- 7. TEMPLATES DE FLUXO (Finitos ou Ciclo Contínuo)
create table if not exists public.templates_fluxo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  tipo_ciclo text not null default 'finito' check (tipo_ciclo in ('finito', 'continuo')),
  descricao text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.templates_fluxo_etapas (
  id uuid primary key default gen_random_uuid(),
  template_fluxo_id uuid not null references public.templates_fluxo(id) on delete cascade,
  ordem integer not null,
  nome_etapa text not null,
  frente_id uuid not null references public.frentes(id) on delete restrict,
  metodo_id uuid not null references public.metodos(id) on delete restrict,
  depende_de_ordem integer,
  tipo_etapa text not null check (tipo_etapa in ('execucao', 'gate_qualidade', 'gate_titular', 'empacotamento')),
  exige_piso_compliance boolean not null default false,
  papel_executor text not null,
  papel_revisor text not null,
  papel_titular text not null,
  sla_horas integer not null default 24,
  unique (template_fluxo_id, ordem)
);

-- 8. DEMANDAS (Instância viva de um Briefing dentro de uma Marca)
create table if not exists public.demandas (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  template_fluxo_id uuid not null references public.templates_fluxo(id) on delete restrict,
  tema_origem_id uuid,
  titulo text not null,
  briefing jsonb not null default '{}'::jsonb,
  status text not null default 'em_producao' check (
    status in (
      'briefing_recebido',
      'em_producao',
      'em_gate',
      'ambiguidade_escalada',
      'reprovada_em_ajuste',
      'peca_pronta',
      'publicada'
    )
  ),
  prazo timestamptz not null,
  data_retorno timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 9. TAREFAS DO FLUXO (Decomposição da demanda em etapas com relé de artefato)
create table if not exists public.tarefas_fluxo (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  demanda_id uuid not null references public.demandas(id) on delete cascade,
  ordem integer not null,
  nome_etapa text not null,
  tipo_etapa text not null check (tipo_etapa in ('execucao', 'gate_qualidade', 'gate_titular', 'empacotamento')),
  exige_piso_compliance boolean not null default false,
  frente_id uuid not null references public.frentes(id) on delete restrict,
  metodo_id uuid not null references public.metodos(id) on delete restrict,
  depende_de_tarefa_id uuid references public.tarefas_fluxo(id) on delete set null,
  papel_executor text not null,
  papel_revisor text not null,
  papel_titular text not null,
  status text not null default 'bloqueada' check (
    status in (
      'bloqueada',
      'pronta_para_execucao',
      'em_execucao',
      'aguardando_gate',
      'ambiguidade_escalada',
      'reprovada',
      'aprovada'
    )
  ),
  input_rele jsonb not null default '{}'::jsonb,
  prompt_compilado text,
  prompt_compilado_em timestamptz,
  rodada_revisao_atual integer not null default 0,
  motivo_ultima_reprovacao text,
  prazo timestamptz not null,
  atualizado_em timestamptz not null default now(),
  unique (demanda_id, ordem)
);

-- 10. ENTREGAS (Memória de Produção por Tarefa)
create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  demanda_id uuid not null references public.demandas(id) on delete cascade,
  tarefa_id uuid not null references public.tarefas_fluxo(id) on delete cascade,
  versao integer not null default 1,
  tipo_executor text not null default 'humano' check (tipo_executor in ('humano', 'gpt_assistido', 'hermes_agent', 'outro_agente')),
  autor_entrega text not null,
  artefato_estruturado jsonb not null default '{}'::jsonb,
  notas_execucao text not null default '',
  criado_em timestamptz not null default now(),
  unique (tarefa_id, versao)
);

-- 11. HISTÓRICO DE DECISÕES (Memória de Decisão, Gates e Piso de Compliance Fixo)
create table if not exists public.historico_decisoes (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  demanda_id uuid not null references public.demandas(id) on delete cascade,
  tarefa_id uuid not null references public.tarefas_fluxo(id) on delete cascade,
  entrega_id uuid references public.entregas(id) on delete set null,
  tipo_gate text not null check (tipo_gate in ('gate_qualidade', 'gate_titular', 'escalacao_ambiguidade')),
  papel text not null check (papel in ('revisor', 'titular', 'executor')),
  avaliador text not null,
  decisao text not null check (decisao in ('aprovado', 'reprovado', 'ambiguidade_escalada')),
  checklist_compliance jsonb not null default '{
    "sem_promessa_financeira": false,
    "sem_urgencia_artificial": false,
    "sem_claim_absoluta_sem_evidencia": false
  }'::jsonb,
  motivo text not null default '',
  feedback_qualitativo_metodo text not null default '',
  criado_em timestamptz not null default now()
);

-- 12. TRILHA DE PROVENIÊNCIA (Cadeia de Auditoria de Ponta a Ponta com Relógio Explícito)
create table if not exists public.trilha_proveniencia (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  demanda_id uuid references public.demandas(id) on delete cascade,
  tarefa_id uuid references public.tarefas_fluxo(id) on delete set null,
  entrega_id uuid references public.entregas(id) on delete set null,
  decisao_id uuid references public.historico_decisoes(id) on delete set null,
  evento text not null,
  ator text not null,
  detalhes jsonb not null default '{}'::jsonb,
  timestamp_explicito timestamptz not null
);

create index if not exists idx_demandas_marca on public.demandas(marca_id, status);
create index if not exists idx_tarefas_demanda on public.tarefas_fluxo(demanda_id, ordem);
create index if not exists idx_entregas_tarefa on public.entregas(tarefa_id, versao desc);
create index if not exists idx_decisoes_marca on public.historico_decisoes(marca_id, criado_em desc);
create index if not exists idx_proveniencia_demanda on public.trilha_proveniencia(demanda_id, timestamp_explicito asc);
