import { NextRequest } from "next/server";
import { registrarEntregaTarefa } from "@/lib/engine/workflow-relay";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      marca_id,
      tipo_executor,
      autor_entrega,
      artefato_estruturado,
      notas_execucao,
    } = body;

    if (!marca_id || !artefato_estruturado) {
      return Response.json(
        {
          error:
            "marca_id e artefato_estruturado são obrigatórios para registrar a entrega.",
        },
        { status: 400 }
      );
    }

    const resultado = registrarEntregaTarefa({
      marca_id,
      tarefa_id: id,
      tipo_executor: tipo_executor || "humano",
      autor_entrega: autor_entrega || "Operador",
      artefato_estruturado,
      notas_execucao,
    });

    return Response.json(resultado);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao registrar entrega";
    return Response.json({ error: message }, { status: 400 });
  }
}
