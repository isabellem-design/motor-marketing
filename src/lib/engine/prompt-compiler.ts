import crypto from "node:crypto";
import { getExplicitClock } from "@/lib/clock";
import { getLiveBrandKnowledge } from "@/lib/knowledge-base";
import { readMotorDb, writeMotorDb } from "@/lib/store/motor-db";
import { REGRAS_PISO_COMPLIANCE } from "@/lib/engine/compliance-floor";

export interface PacotePromptCompilado {
  tarefa_id: string;
  marca_id: string;
  marca_nome: string;
  demanda_id: string;
  metodo_nome: string;
  metodo_versao: number;
  fonte_base_conhecimento: string;
  compilado_em_iso: string;
  compilado_em_br: string;
  prompt_texto: string;
  campos_esperados_output: string[];
}

/**
 * Compila ao vivo o Pacote de Execução (Prompt/Playbook) combinando:
 * 1. Relógio Explícito injetado pelo motor
 * 2. Método Universal (agnóstico de marca)
 * 3. Base de Conhecimento da Marca (consultada ao vivo, sem cache)
 * 4. Exceções Documentadas daquela Marca para o Método
 * 5. Relé de Estado/Artefato da etapa anterior (e motivo de reprovação, se houver)
 * 6. Memória Operacional da Marca (histórico recente para evitar repetição)
 * 7. Piso de Compliance Fixo da Fundação Agentfaz
 */
export async function compileTaskPromptLive(
  marcaId: string,
  tarefaId: string,
  ator = "Operador / Motor"
): Promise<PacotePromptCompilado> {
  const db = readMotorDb();
  const clock = getExplicitClock();

  const tarefaIdx = db.tarefas_fluxo.findIndex(
    (t) => t.id === tarefaId && t.marca_id === marcaId
  );
  if (tarefaIdx === -1) {
    throw new Error(
      `Tarefa ${tarefaId} não encontrada no escopo da marca ${marcaId}`
    );
  }

  const tarefa = db.tarefas_fluxo[tarefaIdx];
  const marca = db.marcas.find((m) => m.id === marcaId);
  const demanda = db.demandas.find(
    (d) => d.id === tarefa.demanda_id && d.marca_id === marcaId
  );
  const metodo = db.metodos.find((m) => m.id === tarefa.metodo_id);

  if (!marca || !demanda || !metodo) {
    throw new Error("Dados de Marca, Demanda ou Método incompletos.");
  }

  // Consulta AO VIVO a base de conhecimento da marca (sem cache)
  const baseViva = await getLiveBrandKnowledge(marcaId);

  // Busca exceções documentadas desta marca para este método universal
  const excecaoMarca = db.marca_metodo_excecoes.find(
    (e) =>
      e.marca_id === marcaId && e.metodo_id === metodo.id && e.ativo
  );

  // Busca memória de produção recente da mesma marca para evitar repetição
  const entregasRecentesMarca = db.entregas
    .filter((ent) => ent.marca_id === marcaId)
    .slice(-5)
    .map(
      (ent) =>
        `- Entrega v${ent.versao} (${ent.criado_em.slice(0, 10)}): ${JSON.stringify(ent.artefato_estruturado).slice(0, 180)}...`
    );

  const blocoCorrecaoReprovacao = tarefa.motivo_ultima_reprovacao
    ? [
        "====================================================================",
        "⚠️ ATENÇÃO — TAREFA DEVOLVIDA PELO GATE (CORREÇÃO OBRIGATÓRIA)",
        "====================================================================",
        `Motivo registrado da reprovação anterior: "${tarefa.motivo_ultima_reprovacao}"`,
        `Rodada de revisão atual: ${tarefa.rodada_revisao_atual + 1} de ${tarefa.rodadas_revisao_exigidas}`,
        "Corrija estritamente os pontos apontados mantendo o restante alinhado ao método.",
        "",
      ].join("\n")
    : "";

  const promptTexto = [
    "====================================================================",
    "MOTOR DE PRODUÇÃO DE MARKETING — PACOTE DE EXECUÇÃO COMPILADO AO VIVO",
    "====================================================================",
    `RELÓGIO EXPLÍCITO DO MOTOR: ${clock.formatado_br} (${clock.iso})`,
    `MARCA ATIVA (marca_id): ${marca.nome} (${marca.id})`,
    `FONTE VIVA DA BASE: ${baseViva.fonte_origem.toUpperCase()} (lida ao vivo em ${baseViva.consultado_ao_vivo_em})`,
    `DEMANDA: ${demanda.titulo} (${demanda.id})`,
    `ETAPA DO FLUXO: ${tarefa.nome_etapa} [Frente: ${tarefa.frente_nome}]`,
    `PAPÉIS: Executor=${tarefa.papel_executor} | Revisor=${tarefa.papel_revisor} | Titular=${tarefa.papel_titular}`,
    "",
    blocoCorrecaoReprovacao,
    "--------------------------------------------------------------------",
    `CAMADA 1 — MÉTODO UNIVERSAL: ${metodo.nome} (v${metodo.versao} · Nível ${metodo.nivel.toUpperCase()})`,
    "--------------------------------------------------------------------",
    metodo.instrucoes_playbook,
    "",
    "--------------------------------------------------------------------",
    `CAMADA 2 — BASE DE CONHECIMENTO VIVA DA MARCA (${marca.nome.toUpperCase()})`,
    "--------------------------------------------------------------------",
    `• IDENTIDADE E TOM: ${baseViva.identidade_tom}`,
    `• PÚBLICO-ALVO: ${baseViva.publico}`,
    `• POSICIONAMENTO: ${baseViva.posicionamento}`,
    `• PRODUTOS / CATÁLOGO: ${baseViva.produtos_catalogo}`,
    `• RESTRIÇÕES DE CONTEÚDO: ${baseViva.restricoes_conteudo}`,
    `• HISTÓRICO RECENTE NA BASE: ${baseViva.historico_resumo}`,
    "",
    "--------------------------------------------------------------------",
    "CAMADA 3 — EXCEÇÕES DOCUMENTADAS DA MARCA PARA ESTE MÉTODO",
    "--------------------------------------------------------------------",
    excecaoMarca
      ? excecaoMarca.regras_excecao
      : "Nenhuma exceção específica cadastrada para este método nesta marca (aplicar Método Universal integralmente).",
    "",
    "--------------------------------------------------------------------",
    "ENTRADA POR RELÉ DE ESTADO / ARTEFATO DA ETAPA ANTERIOR",
    "--------------------------------------------------------------------",
    JSON.stringify(tarefa.input_rele, null, 2),
    "",
    "--------------------------------------------------------------------",
    "MEMÓRIA OPERACIONAL DE PRODUÇÃO DA MARCA (EVITAR REPETIÇÃO)",
    "--------------------------------------------------------------------",
    entregasRecentesMarca.length > 0
      ? entregasRecentesMarca.join("\n")
      : "Nenhuma entrega anterior registrada nesta sessão.",
    "",
    "--------------------------------------------------------------------",
    "PISO DE COMPLIANCE FIXO (FUNDAÇÃO AGENTFAZ — INEGOCIÁVEL)",
    "--------------------------------------------------------------------",
    ...REGRAS_PISO_COMPLIANCE.map(
      (r, i) => `${i + 1}. ${r.titulo}: ${r.descricao}`
    ),
    "",
    "--------------------------------------------------------------------",
    "FORMATO DE SAÍDA ESTRUTURADA ESPERADO PARA O RELÉ:",
    "--------------------------------------------------------------------",
    ...metodo.campos_esperados_output.map((c) => `- ${c}: <preencher>`),
    "====================================================================",
  ]
    .filter(Boolean)
    .join("\n");

  // Atualiza snapshot na tarefa e registra proveniência
  db.tarefas_fluxo[tarefaIdx].prompt_compilado = promptTexto;
  db.tarefas_fluxo[tarefaIdx].prompt_compilado_em = clock.iso;
  if (db.tarefas_fluxo[tarefaIdx].status === "pronta_para_execucao") {
    db.tarefas_fluxo[tarefaIdx].status = "em_execucao";
  }
  db.tarefas_fluxo[tarefaIdx].atualizado_em = clock.iso;

  db.trilha_proveniencia.push({
    id: crypto.randomUUID(),
    marca_id: marcaId,
    demanda_id: demanda.id,
    tarefa_id: tarefa.id,
    entrega_id: null,
    decisao_id: null,
    evento: "PROMPT_COMPILADO_AO_VIVO",
    ator,
    detalhes: {
      metodo_codigo: metodo.codigo,
      metodo_versao: metodo.versao,
      fonte_base_conhecimento: baseViva.fonte_origem,
      excecao_aplicada: Boolean(excecaoMarca),
    },
    timestamp_explicito: clock.iso,
  });

  writeMotorDb(db);

  return {
    tarefa_id: tarefa.id,
    marca_id: marca.id,
    marca_nome: marca.nome,
    demanda_id: demanda.id,
    metodo_nome: metodo.nome,
    metodo_versao: metodo.versao,
    fonte_base_conhecimento: baseViva.fonte_origem,
    compilado_em_iso: clock.iso,
    compilado_em_br: clock.formatado_br,
    prompt_texto: promptTexto,
    campos_esperados_output: metodo.campos_esperados_output,
  };
}
