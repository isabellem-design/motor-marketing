import { NextRequest } from "next/server";
import { criarDemandaReelsSemanal } from "@/lib/engine/workflow-relay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marca_id, formato_canal, titulo, briefing, prazo_horas } = body;

    if (!marca_id || !titulo || !briefing?.pauta_central) {
      return Response.json(
        {
          error:
            "marca_id, título e pauta_central do briefing são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const resultado = criarDemandaReelsSemanal({
      marca_id,
      formato_canal,
      titulo,
      briefing,
      prazo_horas,
    });

    return Response.json(resultado, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar demanda";
    return Response.json({ error: message }, { status: 400 });
  }
}
