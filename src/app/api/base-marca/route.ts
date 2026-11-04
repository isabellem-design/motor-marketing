import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { getExplicitClock } from "@/lib/clock";
import { updateLiveBrandKnowledge } from "@/lib/knowledge-base";
import { readMotorDb, writeMotorDb } from "@/lib/store/motor-db";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      marca_id,
      tipo_atualizacao,
      base_conhecimento,
      metodo_id,
      regras_excecao,
      autor,
    } = body;

    if (!marca_id) {
      return Response.json(
        { error: "marca_id é obrigatório." },
        { status: 400 }
      );
    }

    if (tipo_atualizacao === "excecao_metodo") {
      const db = readMotorDb();
      const clock = getExplicitClock().iso;
      const idx = db.marca_metodo_excecoes.findIndex(
        (e) => e.marca_id === marca_id && e.metodo_id === metodo_id
      );

      if (idx !== -1) {
        db.marca_metodo_excecoes[idx].regras_excecao = regras_excecao;
        db.marca_metodo_excecoes[idx].atualizado_em = clock;
      } else {
        db.marca_metodo_excecoes.push({
          id: crypto.randomUUID(),
          marca_id,
          metodo_id,
          regras_excecao,
          ativo: true,
          atualizado_em: clock,
        });
      }

      db.trilha_proveniencia.push({
        id: crypto.randomUUID(),
        marca_id,
        demanda_id: "00000000-0000-0000-0000-000000000000",
        tarefa_id: null,
        entrega_id: null,
        decisao_id: null,
        evento: "EXCECAO_METODO_MARCA_ATUALIZADA",
        ator: autor || "Operador",
        detalhes: { metodo_id, regras_excecao },
        timestamp_explicito: clock,
      });

      writeMotorDb(db);
      return Response.json({ ok: true });
    }

    const atualizada = await updateLiveBrandKnowledge(
      marca_id,
      base_conhecimento,
      autor || "Operador"
    );
    return Response.json({ base_conhecimento_viva: atualizada });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar base da marca";
    return Response.json({ error: message }, { status: 400 });
  }
}
