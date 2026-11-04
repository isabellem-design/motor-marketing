export type FonteConhecimento = "supabase" | "notion";
export type TipoMarca = "interna" | "cliente_externo";

export type FrenteCodigo =
  | "estrategia_comunicacao"
  | "copy"
  | "design_imagem"
  | "video"
  | "lp_site"
  | "campanha"
  | "fluxo_venda";

export interface Marca {
  id: string;
  slug: string;
  nome: string;
  tipo_marca: TipoMarca;
  fonte_conhecimento: FonteConhecimento;
  config_fonte: Record<string, unknown>;
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface BaseConhecimentoMarca {
  id: string;
  marca_id: string;
  fonte_origem: FonteConhecimento;
  consultado_ao_vivo_em: string;
  identidade_tom: string;
  publico: string;
  posicionamento: string;
  produtos_catalogo: string;
  restricoes_conteudo: string;
  historico_resumo: string;
  atualizado_em: string;
}

export interface Frente {
  id: string;
  codigo: FrenteCodigo;
  nome: string;
  descricao: string;
}

export interface MetodoUniversal {
  id: string;
  frente_id: string;
  codigo: string;
  versao: number;
  nome: string;
  nivel: "basico" | "avancado";
  instrucoes_playbook: string;
  campos_esperados_output: string[];
  ativo: boolean;
  atualizado_em: string;
}

export interface MarcaMetodoExcecao {
  id: string;
  marca_id: string;
  metodo_id: string;
  regras_excecao: string;
  ativo: boolean;
  atualizado_em: string;
}

export interface GovernancaAutomacao {
  id: string;
  marca_id: string;
  frente_id: string;
  nivel_automacao: 1 | 2 | 3;
  rodadas_revisao_exigidas: number;
  justificativa_nivel: string;
  atualizado_em: string;
}

/**
 * ============================================================================
 * ENGRENAGENS CONECTADAS DO CICLO EDITORIAL CONTÍNUO (AEO + SEO + GEO)
 * ============================================================================
 */
export type TipoGatilhoPesquisa =
  | "base_conhecimento"
  | "analise_site"
  | "resultado_campanha"
  | "diretriz_estrategica";

export type FormatoCanal =
  | "blog"
  | "post_simples"
  | "carrossel"
  | "reels"
  | "story";

export type FormatoPecaSocial =
  | "post_simples"
  | "carrossel"
  | "reels"
  | "story";

export type MetodoGeracaoPost = "gpt" | "malha_legado";

export interface InsumoRadarPesquisa {
  id: string;
  marca_id: string;
  tipo_engrenagem: TipoGatilhoPesquisa;
  nome_engrenagem: string;
  status_conexao: string;
  diagnostico_atual: string;
  oportunidade_pesquisa_sugerida: string;
  objetivo_negocio_vinculado: string;
  atualizado_em: string;
}

export interface AdaptacaoCanal {
  canal: FormatoCanal;
  nome_canal: string;
  proposito_no_canal: string;
  angulo_adaptado: string;
  estrutura_sugerida: string;
  cta_especifico: string;
}

export interface PesquisaMercado {
  id: string;
  marca_id: string;
  gatilho_tipo: TipoGatilhoPesquisa;
  gatilho_origem_detalhe: string;
  alinhamento_proposito_valores_objetivos: string;
  titulo_pesquisa: string;
  sinais_mercado_e_concorrencia: string;
  lacunas_detectadas_site_atual: string;
  palavras_chave_seo: string[];
  perguntas_conversacionais_aeo: string[];
  oportunidades_citacao_geo: string;
  origem_realimentacao?: string | null;
  criado_em: string;
}

export interface SlideCarrosselEloss {
  ordem: number;
  tipo: "capa" | "conteudo" | "dado" | "cta";
  headline: string;
  headline_destaque: string;
  corpo: string;
  cta?: string;
  direcao_visual: string;
  prompt_imagem?: string;
  prompt_fundo?: string;
  componentes?: {
    tipo: string;
    dados: Record<string, string>;
  }[];
  imagem_url?: string;
}

export interface ChecagemMarcaEloss {
  nome: string;
  detalhe: string;
  resultado: "ok" | "atencao" | "falha";
}

export interface ConteudoEstruturadoPeca {
  metodo_geracao?: "gpt" | "malha_legado" | "malha_blog";
  modelo_ia?: string;
  legenda?: string;
  direcao_peca?: string;
  direcao_visual?: string;
  prompt_imagem?: string;
  slides?: SlideCarrosselEloss[];
  artigo_markdown?: string;
  headline_arte?: string;
  destaque_gradiente?: string;
  subtitulo_arte?: string;
  roteiro_cenas?: {
    tempo: string;
    etapa: string;
    fala: string;
    lettering_tela: string;
    direcao_camera: string;
  }[];
  telas_story?: {
    ordem: number;
    objetivo: string;
    texto_tela: string;
    elemento_interativo: string;
  }[];
  checagens?: ChecagemMarcaEloss[];
}

export interface TemaEditorial {
  id: string;
  marca_id: string;
  pesquisa_id: string;
  codigo_tema?: string;
  codigo_pilar?: string;
  nome_pilar?: string;
  titulo_tema: string;
  dor_do_publico: string;
  alinhamento_marca_proposito: string;
  palavra_chave_foco_seo: string;
  pergunta_direta_aeo: string;
  tese_autoridade_geo: string;
  score_potencial_busca: number;
  canais_aprovados: FormatoCanal[];
  adaptacoes_canais: Record<FormatoCanal, AdaptacaoCanal>;
  status:
    | "sugerido"
    | "aprovado_em_producao"
    | "blog_ancora_pronto"
    | "derivados_sociais_ativos"
    | "ciclo_medido";
  criado_em: string;
}

export interface ArtigoBlogAncora {
  id: string;
  marca_id: string;
  pesquisa_id: string;
  tema_id: string;
  titulo_blog: string;
  byline?: string;
  subtitulo_seo: string;
  bloco_resposta_direta_aeo: string;
  dados_e_entidades_geo: string;
  resumo_estrutura_artigo: string;
  conteudo_completo_markdown?: string;
  checagens?: ChecagemMarcaEloss[];
  status: "em_estruturacao" | "aprovado_como_ancora" | "publicado";
  criado_em: string;
}

export interface ResultadoCicloEditorial {
  id: string;
  marca_id: string;
  tema_id: string;
  artigo_blog_id: string;
  impressao_organica_seo: string;
  presenca_respostas_ia_aeo_geo: string;
  desempenho_derivados_sociais: string;
  analise_campanha_e_site: string;
  pauta_gerada_para_proxima_pesquisa: string;
  criado_em: string;
}

export type TipoEtapaFluxo =
  | "execucao"
  | "gate_qualidade"
  | "gate_titular"
  | "empacotamento";

export type StatusDemanda =
  | "briefing_recebido"
  | "em_producao"
  | "em_gate"
  | "ambiguidade_escalada"
  | "reprovada_em_ajuste"
  | "peca_pronta"
  | "publicada";

export type StatusTarefa =
  | "bloqueada"
  | "pronta_para_execucao"
  | "em_execucao"
  | "aguardando_gate"
  | "ambiguidade_escalada"
  | "reprovada"
  | "aprovada";

export interface BriefingReels {
  pauta_central: string;
  dor_ou_situacao_real: string;
  objetivo_peca: string;
  cta_desejado: string;
  referencias_ou_insumos: string;
  autor_briefing: string;
  adaptacao_canal?: {
    formato: FormatoCanal;
    nome_canal: string;
    proposito_no_canal: string;
    estrutura_sugerida: string;
  };
  origem_ciclo?: {
    pesquisa_id?: string;
    tema_id?: string;
    artigo_blog_id?: string;
    titulo_blog_ancora?: string;
    foco_seo_aeo_geo?: string;
    gatilho_pesquisa?: string;
  };
}

export interface Demanda {
  id: string;
  marca_id: string;
  formato_canal: FormatoCanal;
  template_fluxo_id: string;
  template_nome: string;
  tipo_fluxo: "derivado_ciclo_continuo" | "fluxo_finito_avulso";
  tema_origem_id?: string | null;
  artigo_blog_origem_id?: string | null;
  titulo: string;
  briefing: BriefingReels;
  conteudo_estruturado?: ConteudoEstruturadoPeca;
  status: StatusDemanda;
  prazo: string;
  data_retorno?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface TarefaFluxo {
  id: string;
  marca_id: string;
  demanda_id: string;
  ordem: number;
  nome_etapa: string;
  descricao_etapa: string;
  tipo_etapa: TipoEtapaFluxo;
  exige_piso_compliance: boolean;
  frente_id: string;
  frente_codigo: FrenteCodigo;
  frente_nome: string;
  metodo_id: string;
  metodo_nome: string;
  depende_de_tarefa_id: string | null;
  retorna_para_ordem_em_reprovacao: number;
  papel_executor: string;
  papel_revisor: string;
  papel_titular: string;
  status: StatusTarefa;
  input_rele: Record<string, unknown>;
  prompt_compilado: string | null;
  prompt_compilado_em: string | null;
  rodada_revisao_atual: number;
  rodadas_revisao_exigidas: number;
  motivo_ultima_reprovacao: string | null;
  prazo: string;
  atualizado_em: string;
}

export type TipoExecutor =
  | "humano"
  | "gpt_assistido"
  | "hermes_agent"
  | "outro_agente";

export interface Entrega {
  id: string;
  marca_id: string;
  demanda_id: string;
  tarefa_id: string;
  versao: number;
  tipo_executor: TipoExecutor;
  autor_entrega: string;
  artefato_estruturado: Record<string, string>;
  notas_execucao: string;
  criado_em: string;
}

export interface ChecklistComplianceFixo {
  sem_promessa_financeira: boolean;
  sem_urgencia_artificial: boolean;
  sem_claim_absoluta_sem_evidencia: boolean;
}

export interface DecisaoHistorico {
  id: string;
  marca_id: string;
  demanda_id: string;
  tarefa_id: string;
  entrega_id: string | null;
  tipo_gate: "gate_qualidade" | "gate_titular" | "escalacao_ambiguidade";
  papel: "revisor" | "titular" | "executor";
  avaliador: string;
  decisao: "aprovado" | "reprovado" | "ambiguidade_escalada";
  checklist_compliance: ChecklistComplianceFixo;
  motivo: string;
  feedback_qualitativo_metodo: string;
  criado_em: string;
}

export interface EventoProveniencia {
  id: string;
  marca_id: string;
  demanda_id: string;
  tarefa_id: string | null;
  entrega_id: string | null;
  decisao_id: string | null;
  evento: string;
  ator: string;
  detalhes: Record<string, unknown>;
  timestamp_explicito: string;
}
