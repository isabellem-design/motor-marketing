import crypto from "node:crypto";
import { addHoursToClock, getExplicitClock } from "@/lib/clock";
import { validarPisoComplianceFixo } from "@/lib/engine/compliance-floor";
import {
  buildSixStepsForFormato,
  readMotorDb,
  TEMPLATE_REELS_SEMANAL_ID,
  writeMotorDb,
} from "@/lib/store/motor-db";
import {
  BriefingReels,
  ChecklistComplianceFixo,
  ConteudoEstruturadoPeca,
  DecisaoHistorico,
  Demanda,
  Entrega,
  FormatoCanal,
  StatusDemanda,
  TarefaFluxo,
  TipoExecutor,
} from "@/lib/types";

const NOMES_TEMPLATE_POR_FORMATO: Record<FormatoCanal, string> = {
  blog: "Matéria de Blog Âncora (Padrão AEO / SEO / GEO)",
  reels: "Reels (Vídeo Curto 30–60s)",
  carrossel: "Carrossel Educacional (Slide a Slide — Dark Tech Eloss)",
  post_simples: "Post Simples (Feed Estático)",
  story: "Sequência de Stories (Interação & Conversa)",
};

export function criarDemandaReelsSemanal(input: {
  marca_id: string;
  formato_canal?: FormatoCanal;
  titulo: string;
  briefing: BriefingReels;
  conteudo_estruturado?: ConteudoEstruturadoPeca;
  status_inicial?: StatusDemanda;
  prazo_horas?: number;
  tipo_fluxo?: "derivado_ciclo_continuo" | "fluxo_finito_avulso";
  tema_origem_id?: string | null;
  artigo_blog_origem_id?: string | null;
}): { demanda: Demanda; tarefas: TarefaFluxo[] } {
  const db = readMotorDb();
  const marca = db.marcas.find((m) => m.id === input.marca_id);
  if (!marca) {
    throw new Error(`Marca inválida: ${input.marca_id}`);
  }

  const clock = getExplicitClock().iso;
  const demandaId = crypto.randomUUID();
  const prazoHoras = input.prazo_horas ?? 48;
  const formato: FormatoCanal = input.formato_canal ?? "reels";

  const novaDemanda: Demanda = {
    id: demandaId,
    marca_id: input.marca_id,
    formato_canal: formato,
    template_fluxo_id: TEMPLATE_REELS_SEMANAL_ID,
    template_nome: NOMES_TEMPLATE_POR_FORMATO[formato],
    tipo_fluxo: input.tipo_fluxo ?? "fluxo_finito_avulso",
    tema_origem_id: input.tema_origem_id ?? null,
    artigo_blog_origem_id: input.artigo_blog_origem_id ?? null,
    titulo: input.titulo.trim(),
    briefing: input.briefing,
    conteudo_estruturado: input.conteudo_estruturado,
    status: input.status_inicial ?? "em_gate",
    prazo: addHoursToClock(clock, prazoHoras),
    data_retorno: addHoursToClock(clock, 8),
    criado_em: clock,
    atualizado_em: clock,
  };

  const tarefas = buildSixStepsForFormato(
    input.marca_id,
    demandaId,
    formato === "blog" ? "carrossel" : formato,
    input.briefing,
    clock
  );

  db.demandas.unshift(novaDemanda);
  db.tarefas_fluxo.push(...tarefas);

  db.trilha_proveniencia.push({
    id: crypto.randomUUID(),
    marca_id: input.marca_id,
    demanda_id: demandaId,
    tarefa_id: tarefas[0].id,
    entrega_id: null,
    decisao_id: null,
    evento:
      input.tipo_fluxo === "derivado_ciclo_continuo"
        ? `PECA_${formato.toUpperCase()}_GERADA_COM_BASE_ELOSS`
        : "BRIEFING_RECEBIDO_E_DECOMPOSTO_EM_6_ETAPAS",
    ator: input.briefing.autor_briefing || "Isabelle",
    detalhes: {
      formato,
      titulo: novaDemanda.titulo,
      pauta_central: input.briefing.pauta_central,
      origem_blog: input.briefing.origem_ciclo?.titulo_blog_ancora ?? null,
    },
    timestamp_explicito: clock,
  });

  writeMotorDb(db);
  return { demanda: novaDemanda, tarefas };
}

export function registrarEntregaTarefa(input: {
  marca_id: string;
  tarefa_id: string;
  tipo_executor: TipoExecutor;
  autor_entrega: string;
  artefato_estruturado: Record<string, string>;
  notas_execucao?: string;
}): {
  entrega: Entrega;
  tarefaAtualizada: TarefaFluxo;
  proximaTarefa: TarefaFluxo | null;
} {
  const db = readMotorDb();
  const clock = getExplicitClock().iso;

  const tarefaIdx = db.tarefas_fluxo.findIndex(
    (t) => t.id === input.tarefa_id && t.marca_id === input.marca_id
  );
  if (tarefaIdx === -1) {
    throw new Error("Tarefa não encontrada para a marca ativa.");
  }

  const tarefa = db.tarefas_fluxo[tarefaIdx];
  if (tarefa.status === "bloqueada") {
    throw new Error(
      "Esta etapa ainda está bloqueada aguardando o relé da etapa anterior."
    );
  }

  const entregasAnteriores = db.entregas.filter(
    (e) => e.tarefa_id === tarefa.id && e.marca_id === input.marca_id
  );
  const novaVersao = entregasAnteriores.length + 1;

  const novaEntrega: Entrega = {
    id: crypto.randomUUID(),
    marca_id: input.marca_id,
    demanda_id: tarefa.demanda_id,
    tarefa_id: tarefa.id,
    versao: novaVersao,
    tipo_executor: input.tipo_executor,
    autor_entrega: input.autor_entrega.trim() || tarefa.papel_executor,
    artefato_estruturado: input.artefato_estruturado,
    notas_execucao: input.notas_execucao?.trim() || "",
    criado_em: clock,
  };

  db.entregas.push(novaEntrega);

  tarefa.status = "aprovada";
  tarefa.motivo_ultima_reprovacao = null;
  tarefa.atualizado_em = clock;

  const proximaIdx = db.tarefas_fluxo.findIndex(
    (t) =>
      t.demanda_id === tarefa.demanda_id &&
      t.marca_id === input.marca_id &&
      t.ordem === tarefa.ordem + 1
  );

  let proximaTarefa: TarefaFluxo | null = null;
  const demandaIdx = db.demandas.findIndex(
    (d) => d.id === tarefa.demanda_id && d.marca_id === input.marca_id
  );

  if (proximaIdx !== -1) {
    const prox = db.tarefas_fluxo[proximaIdx];
    prox.input_rele = {
      origem_etapa_ordem: tarefa.ordem,
      origem_etapa_nome: tarefa.nome_etapa,
      entrega_id: novaEntrega.id,
      versao_entrega: novaEntrega.versao,
      autor_entrega: novaEntrega.autor_entrega,
      timestamp_rele: clock,
      artefato: novaEntrega.artefato_estruturado,
      contexto_acumulado: tarefa.input_rele,
    };
    prox.status =
      prox.tipo_etapa === "gate_qualidade" || prox.tipo_etapa === "gate_titular"
        ? "aguardando_gate"
        : "pronta_para_execucao";
    prox.atualizado_em = clock;
    proximaTarefa = prox;

    if (demandaIdx !== -1) {
      db.demandas[demandaIdx].status =
        prox.status === "aguardando_gate" ? "em_gate" : "em_producao";
      db.demandas[demandaIdx].atualizado_em = clock;
    }
  } else {
    if (demandaIdx !== -1) {
      db.demandas[demandaIdx].status = "peca_pronta";
      db.demandas[demandaIdx].atualizado_em = clock;
    }
  }

  db.trilha_proveniencia.push({
    id: crypto.randomUUID(),
    marca_id: input.marca_id,
    demanda_id: tarefa.demanda_id,
    tarefa_id: tarefa.id,
    entrega_id: novaEntrega.id,
    decisao_id: null,
    evento:
      tarefa.ordem === 6
        ? "PECA_PRONTA_EMPACOTADA"
        : "ENTREGA_REGISTRADA_E_RELE_ACIONADO",
    ator: novaEntrega.autor_entrega,
    detalhes: {
      etapa_concluida: tarefa.nome_etapa,
      versao_entrega: novaEntrega.versao,
      proxima_etapa_acionada: proximaTarefa?.nome_etapa ?? "FLUXO_CONCLUIDO",
    },
    timestamp_explicito: clock,
  });

  writeMotorDb(db);
  return { entrega: novaEntrega, tarefaAtualizada: tarefa, proximaTarefa };
}

export function julgarGateTarefa(input: {
  marca_id: string;
  tarefa_id: string;
  avaliador: string;
  papel: "revisor" | "titular";
  decisao: "aprovado" | "reprovado" | "ambiguidade_escalada";
  checklist_compliance: ChecklistComplianceFixo;
  motivo: string;
  feedback_qualitativo_metodo?: string;
  ordem_destino_reprovacao?: number;
}): {
  decisao: DecisaoHistorico;
  tarefaGate: TarefaFluxo;
  tarefaDestino: TarefaFluxo | null;
} {
  const db = readMotorDb();
  const clock = getExplicitClock().iso;

  const gateIdx = db.tarefas_fluxo.findIndex(
    (t) => t.id === input.tarefa_id && t.marca_id === input.marca_id
  );
  if (gateIdx === -1) {
    throw new Error("Tarefa de Gate não encontrada para a marca ativa.");
  }

  const tarefaGate = db.tarefas_fluxo[gateIdx];

  if (input.decisao === "aprovado" && tarefaGate.exige_piso_compliance) {
    const textoArtefato = JSON.stringify(tarefaGate.input_rele);
    const validacao = validarPisoComplianceFixo(
      input.checklist_compliance,
      textoArtefato
    );
    if (!validacao.valido) {
      throw new Error(
        `Bloqueio do Piso de Compliance Fixo (Fundação Agentfaz): É obrigatório confirmar todos os itens inegociáveis antes de aprovar (${validacao.itens_pendentes.join(", ")}).`
      );
    }
  }

  if (
    (input.decisao === "reprovado" ||
      input.decisao === "ambiguidade_escalada") &&
    input.motivo.trim().length < 5
  ) {
    throw new Error(
      "Reprovação ou escalação de ambiguidade exige motivo explícito registrado (mínimo de 5 caracteres)."
    );
  }

  const novaDecisao: DecisaoHistorico = {
    id: crypto.randomUUID(),
    marca_id: input.marca_id,
    demanda_id: tarefaGate.demanda_id,
    tarefa_id: tarefaGate.id,
    entrega_id:
      typeof tarefaGate.input_rele?.entrega_id === "string"
        ? tarefaGate.input_rele.entrega_id
        : null,
    tipo_gate:
      input.decisao === "ambiguidade_escalada"
        ? "escalacao_ambiguidade"
        : tarefaGate.tipo_etapa === "gate_titular"
          ? "gate_titular"
          : "gate_qualidade",
    papel: input.papel,
    avaliador: input.avaliador.trim() || tarefaGate.papel_revisor,
    decisao: input.decisao,
    checklist_compliance: input.checklist_compliance,
    motivo: input.motivo.trim(),
    feedback_qualitativo_metodo: input.feedback_qualitativo_metodo?.trim() || "",
    criado_em: clock,
  };

  db.historico_decisoes.unshift(novaDecisao);

  const demandaIdx = db.demandas.findIndex(
    (d) => d.id === tarefaGate.demanda_id && d.marca_id === input.marca_id
  );

  let tarefaDestino: TarefaFluxo | null = null;

  if (input.decisao === "aprovado") {
    tarefaGate.status = "aprovada";
    tarefaGate.motivo_ultima_reprovacao = null;
    tarefaGate.atualizado_em = clock;

    const proximaIdx = db.tarefas_fluxo.findIndex(
      (t) =>
        t.demanda_id === tarefaGate.demanda_id &&
        t.marca_id === input.marca_id &&
        t.ordem === tarefaGate.ordem + 1
    );

    if (proximaIdx !== -1) {
      const prox = db.tarefas_fluxo[proximaIdx];
      prox.input_rele = {
        ...tarefaGate.input_rele,
        gate_aprovado_em: clock,
        gate_avaliador: novaDecisao.avaliador,
        gate_papel: novaDecisao.papel,
        checklist_compliance_validado: novaDecisao.checklist_compliance,
        observacoes_aprovacao: novaDecisao.motivo,
      };
      prox.status =
        prox.tipo_etapa === "gate_qualidade" || prox.tipo_etapa === "gate_titular"
          ? "aguardando_gate"
          : "pronta_para_execucao";
      prox.atualizado_em = clock;
      tarefaDestino = prox;

      if (demandaIdx !== -1) {
        db.demandas[demandaIdx].status = "em_producao";
        db.demandas[demandaIdx].atualizado_em = clock;
      }
    }
  } else if (input.decisao === "reprovado") {
    const ordemRetorno =
      input.ordem_destino_reprovacao ??
      tarefaGate.retorna_para_ordem_em_reprovacao;

    tarefaGate.status = "bloqueada";
    tarefaGate.rodada_revisao_atual += 1;
    tarefaGate.motivo_ultima_reprovacao = novaDecisao.motivo;
    tarefaGate.atualizado_em = clock;

    const retornoIdx = db.tarefas_fluxo.findIndex(
      (t) =>
        t.demanda_id === tarefaGate.demanda_id &&
        t.marca_id === input.marca_id &&
        t.ordem === ordemRetorno
    );

    if (retornoIdx !== -1) {
      const tRetorno = db.tarefas_fluxo[retornoIdx];
      tRetorno.status = "reprovada";
      tRetorno.rodada_revisao_atual += 1;
      tRetorno.motivo_ultima_reprovacao = novaDecisao.motivo;
      tRetorno.atualizado_em = clock;
      tarefaDestino = tRetorno;
    }

    if (demandaIdx !== -1) {
      db.demandas[demandaIdx].status = "reprovada_em_ajuste";
      db.demandas[demandaIdx].atualizado_em = clock;
    }
  } else {
    tarefaGate.status = "ambiguidade_escalada";
    tarefaGate.motivo_ultima_reprovacao = novaDecisao.motivo;
    tarefaGate.atualizado_em = clock;

    if (demandaIdx !== -1) {
      db.demandas[demandaIdx].status = "ambiguidade_escalada";
      db.demandas[demandaIdx].atualizado_em = clock;
    }
  }

  db.trilha_proveniencia.push({
    id: crypto.randomUUID(),
    marca_id: input.marca_id,
    demanda_id: tarefaGate.demanda_id,
    tarefa_id: tarefaGate.id,
    entrega_id: novaDecisao.entrega_id,
    decisao_id: novaDecisao.id,
    evento:
      input.decisao === "aprovado"
        ? "GATE_APROVADO_COM_COMPLIANCE"
        : input.decisao === "reprovado"
          ? "GATE_REPROVADO_DEVOLVIDO_PARA_EXECUCAO"
          : "AMBIGUIDADE_ESCALADA_AO_TITULAR",
    ator: `${novaDecisao.avaliador} (${novaDecisao.papel})`,
    detalhes: {
      etapa_gate: tarefaGate.nome_etapa,
      decisao: novaDecisao.decisao,
      motivo: novaDecisao.motivo,
      etapa_destino: tarefaDestino?.nome_etapa ?? null,
    },
    timestamp_explicito: clock,
  });

  writeMotorDb(db);
  return { decisao: novaDecisao, tarefaGate, tarefaDestino };
}
