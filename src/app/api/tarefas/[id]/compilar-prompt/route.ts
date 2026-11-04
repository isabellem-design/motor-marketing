import { NextRequest } from "next/server";
import { compileTaskPromptLive } from "@/lib/engine/prompt-compiler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { marca_id, ator } = body;

    if (!marca_id) {
      return Response.json(
        { error: "marca_id é obrigatório para compilar o prompt." },
        { status: 400 }
      );
    }

    const pacote = await compileTaskPromptLive(marca_id, id, ator);
    return Response.json(pacote);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao compilar prompt";
    return Response.json({ error: message }, { status: 400 });
  }
}
