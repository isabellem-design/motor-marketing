import { NextRequest } from "next/server";
import { julgarGateTarefa } from "@/lib/engine/workflow-relay";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      marca_id,
      avaliador,
      papel,
      decisao,
      checklist_compliance,
      motivo,
      feedback_qualitativo_metodo,
      ordem_destino_reprovacao,
    } = body;

    if (!marca_id || !decisao) {
      return Response.json(
        { error: "marca_id e decisao são obrigatórios." },
        { status: 400 }
      );
    }

    const resultado = julgarGateTarefa({
      marca_id,
      tarefa_id: id,
      avaliador: avaliador || "Avaliador",
      papel: papel || "revisor",
      decisao,
      checklist_compliance: checklist_compliance || {
        sem_promessa_financeira: false,
        sem_urgencia_artificial: false,
        sem_claim_absoluta_sem_evidencia: false,
      },
      motivo: motivo || "",
      feedback_qualitativo_metodo,
      ordem_destino_reprovacao,
    });

    return Response.json(resultado);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao julgar gate";
    return Response.json({ error: message }, { status: 400 });
  }
}
