import { describe, expect, it } from "vitest";
import {
  getLiveBrandKnowledge,
  updateLiveBrandKnowledge,
} from "../src/lib/knowledge-base";
import { compileTaskPromptLive } from "../src/lib/engine/prompt-compiler";
import {
  criarDemandaReelsSemanal,
  julgarGateTarefa,
  registrarEntregaTarefa,
} from "../src/lib/engine/workflow-relay";
import { MARCA_ELOSS_ID, readMotorDb } from "../src/lib/store/motor-db";

describe("Motor de Produção de Marketing — Fase 0 (Piloto Eloss + Reels Semanal)", () => {
  it("executa o ciclo completo do briefing à peça pronta com relé, reprovação em gate, piso de compliance fixo e atualização ao vivo da base", async () => {
    // 1. Cria um novo briefing de Reels Semanal para a marca Eloss
    const { demanda, tarefas } = criarDemandaReelsSemanal({
      marca_id: MARCA_ELOSS_ID,
      titulo: "Reels Teste E2E — Autonomia com Governança",
      briefing: {
        pauta_central: "Autonomia sem método vira improviso",
        dor_ou_situacao_real: "Equipes que dependem do fundador para cada microdecisão",
        objetivo_peca: "Apresentar os 3 papéis do fluxo Eloss",
        cta_desejado: "Comentar qual papel falta hoje",
        referencias_ou_insumos: "Experiência interna da agência",
        autor_briefing: "Evandro",
      },
    });

    expect(demanda.marca_id).toBe(MARCA_ELOSS_ID);
    expect(tarefas).toHaveLength(6);
    expect(tarefas[0].status).toBe("pronta_para_execucao");
    expect(tarefas[1].status).toBe("bloqueada");

    // 2. Atualiza a Base de Conhecimento da Eloss ao vivo e verifica propagação imediata sem cache no compilador de prompt
    const baseAntes = await getLiveBrandKnowledge(MARCA_ELOSS_ID);
    await updateLiveBrandKnowledge(
      MARCA_ELOSS_ID,
      {
        ...baseAntes,
        posicionamento:
          "Ecossistema Eloss [ATUALIZADO AO VIVO SEM CACHE PARA TESTE]",
      }
    );

    const promptEtapa1 = await compileTaskPromptLive(
      MARCA_ELOSS_ID,
      tarefas[0].id,
      "Isabelle"
    );
    expect(promptEtapa1.prompt_texto).toContain(
      "Ecossistema Eloss [ATUALIZADO AO VIVO SEM CACHE PARA TESTE]"
    );
    expect(promptEtapa1.prompt_texto).toContain("RELÓGIO EXPLÍCITO DO MOTOR:");

    // 3. Etapa 1: Entrega Decomposição & Ângulo -> aciona relé para Etapa 2 (Copy)
    const r1 = registrarEntregaTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[0].id,
      tipo_executor: "humano",
      autor_entrega: "Isabelle",
      artefato_estruturado: {
        tese_central: "Delegar sem método é empurrar retrabalho",
        contraste_erro_vs_metodo: "Improviso vs. Relé estruturado",
        gancho_3_segundos: "Você delega a tarefa ou delega o método?",
        direcionamento_cta: "Comente onde trava",
      },
    });
    expect(r1.proximaTarefa?.ordem).toBe(2);
    expect(r1.proximaTarefa?.status).toBe("pronta_para_execucao");

    // 4. Etapa 2: Compila prompt de Copy (deve incluir Exceção Documentada da Eloss) e entrega Roteiro
    const promptEtapa2 = await compileTaskPromptLive(
      MARCA_ELOSS_ID,
      tarefas[1].id,
      "Isabelle"
    );
    expect(promptEtapa2.prompt_texto).toContain("EXCEÇÃO DOCUMENTADA DA MARCA ELOSS");
    expect(promptEtapa2.prompt_texto).toContain("Você delega a tarefa ou delega o método?");

    const r2 = registrarEntregaTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[1].id,
      tipo_executor: "humano",
      autor_entrega: "Isabelle",
      artefato_estruturado: {
        roteiro_falado_blocos: "Versão 1 do roteiro",
        texto_apoio_tela: "Texto tela v1",
        legenda_post: "Legenda v1",
      },
    });
    expect(r2.proximaTarefa?.ordem).toBe(3);
    expect(r2.proximaTarefa?.status).toBe("aguardando_gate");

    // 5. Etapa 3 (Gate de Qualidade Copy & Compliance): Testa REPROVAÇÃO voltando para Etapa 2 com motivo obrigatório
    const reprovacao = julgarGateTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[2].id,
      avaliador: "Isabelle (Revisora)",
      papel: "revisor",
      decisao: "reprovado",
      checklist_compliance: {
        sem_promessa_financeira: true,
        sem_urgencia_artificial: true,
        sem_claim_absoluta_sem_evidencia: true,
      },
      motivo: "O bloco de virada precisa citar os 3 papéis Executor, Revisor e Titular.",
    });
    expect(reprovacao.tarefaDestino?.ordem).toBe(2);
    expect(reprovacao.tarefaDestino?.status).toBe("reprovada");
    expect(reprovacao.tarefaDestino?.motivo_ultima_reprovacao).toContain(
      "Executor, Revisor e Titular"
    );

    // 6. Etapa 2: Re-entrega corrigida (v2) -> volta ao Gate da Etapa 3
    const r2Corrigida = registrarEntregaTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[1].id,
      tipo_executor: "humano",
      autor_entrega: "Isabelle",
      artefato_estruturado: {
        roteiro_falado_blocos:
          "Versão 2 corrigida com Executor, Revisor e Titular",
        texto_apoio_tela: "Texto tela v2",
        legenda_post: "Legenda v2",
      },
    });
    expect(r2Corrigida.entrega.versao).toBe(2);

    // 7. Etapa 3: Tenta aprovar SEM marcar todo o Piso de Compliance Fixo -> deve bloquear!
    expect(() =>
      julgarGateTarefa({
        marca_id: MARCA_ELOSS_ID,
        tarefa_id: tarefas[2].id,
        avaliador: "Isabelle",
        papel: "revisor",
        decisao: "aprovado",
        checklist_compliance: {
          sem_promessa_financeira: true,
          sem_urgencia_artificial: false, // Faltou este!
          sem_claim_absoluta_sem_evidencia: true,
        },
        motivo: "Tentando aprovar sem compliance completo",
      })
    ).toThrow(/Piso de Compliance Fixo/);

    // 8. Etapa 3: Aprova com Piso de Compliance Fixo 100% preenchido -> libera Etapa 4 (Vídeo)
    const aprovacaoGate3 = julgarGateTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[2].id,
      avaliador: "Isabelle",
      papel: "revisor",
      decisao: "aprovado",
      checklist_compliance: {
        sem_promessa_financeira: true,
        sem_urgencia_artificial: true,
        sem_claim_absoluta_sem_evidencia: true,
      },
      motivo: "Copy v2 aprovado e 100% aderente ao método e compliance.",
    });
    expect(aprovacaoGate3.tarefaDestino?.ordem).toBe(4);
    expect(aprovacaoGate3.tarefaDestino?.status).toBe("pronta_para_execucao");

    // 9. Etapa 4 (Direção Visual / Vídeo) -> Etapa 5 (Gate Titular) -> Etapa 6 (Peça Pronta)
    registrarEntregaTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[3].id,
      tipo_executor: "gpt_assistido",
      autor_entrega: "Operador Vídeo",
      artefato_estruturado: {
        decupagem_visual_cenas: "Decupagem aprovada",
        headline_capa: "DELEGAR COM MÉTODO",
        prompt_imagem_capa: "Prompt visual capa Eloss",
        link_ou_referencia_peca: "https://eloss.internal/reels-final.mp4",
      },
    });

    julgarGateTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[4].id,
      avaliador: "Evandro (Titular)",
      papel: "titular",
      decisao: "aprovado",
      checklist_compliance: {
        sem_promessa_financeira: true,
        sem_urgencia_artificial: true,
        sem_claim_absoluta_sem_evidencia: true,
      },
      motivo: "Peça aprovada pelo Titular para publicação.",
    });

    const fechamento = registrarEntregaTarefa({
      marca_id: MARCA_ELOSS_ID,
      tarefa_id: tarefas[5].id,
      tipo_executor: "humano",
      autor_entrega: "Evandro",
      artefato_estruturado: {
        pacote_final_consolidado: "Reels #02 Pronto e Auditado",
        canal_destino: "Instagram Reels",
      },
    });

    expect(fechamento.proximaTarefa).toBeNull();

    const dbFinal = readMotorDb();
    const demandaFinal = dbFinal.demandas.find((d) => d.id === demanda.id);
    expect(demandaFinal?.status).toBe("peca_pronta");

    const eventosDemanda = dbFinal.trilha_proveniencia.filter(
      (ev) => ev.demanda_id === demanda.id
    );
    expect(eventosDemanda.length).toBeGreaterThanOrEqual(8);
  });
});
