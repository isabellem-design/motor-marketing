import { NextRequest } from "next/server";
import { avaliarBatimentoPrazo, getExplicitClock } from "@/lib/clock";
import { getLiveBrandKnowledge } from "@/lib/knowledge-base";
import { MARCA_ELOSS_ID, readMotorDb } from "@/lib/store/motor-db";
import { sincronizarDemandasComSupabase } from "@/lib/store/supabase-pecas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let db = readMotorDb();
    const marcaId =
      request.nextUrl.searchParams.get("marca_id") || MARCA_ELOSS_ID;

    if (marcaId === MARCA_ELOSS_ID) {
      db = await sincronizarDemandasComSupabase(db);
    }

    const marcaAtiva =
      db.marcas.find((m) => m.id === marcaId) || db.marcas[0];

    const baseConhecimentoViva = await getLiveBrandKnowledge(marcaAtiva.id);
    const clock = getExplicitClock();

    const insumosRadarMarca = (db.insumos_radar || []).filter(
      (i) => i.marca_id === marcaAtiva.id
    );
    const pesquisasMarca = (db.pesquisas_mercado || []).filter(
      (p) => p.marca_id === marcaAtiva.id
    );
    const temasMarca = (db.temas_editoriais || []).filter(
      (t) => t.marca_id === marcaAtiva.id
    );
    const artigosBlogMarca = (db.artigos_blog_ancora || []).filter(
      (a) => a.marca_id === marcaAtiva.id
    );
    const resultadosCicloMarca = (db.resultados_ciclo || []).filter(
      (r) => r.marca_id === marcaAtiva.id
    );

    const demandasMarca = (db.demandas || []).filter(
      (d) => d.marca_id === marcaAtiva.id
    );
    const tarefasMarca = (db.tarefas_fluxo || []).filter(
      (t) => t.marca_id === marcaAtiva.id
    );
    const entregasMarca = (db.entregas || []).filter(
      (e) => e.marca_id === marcaAtiva.id
    );
    const decisoesMarca = (db.historico_decisoes || []).filter(
      (h) => h.marca_id === marcaAtiva.id
    );
    const provenienciaMarca = (db.trilha_proveniencia || [])
      .filter((p) => p.marca_id === marcaAtiva.id)
      .sort((a, b) =>
        b.timestamp_explicito.localeCompare(a.timestamp_explicito)
      );

    const excecoesMarca = (db.marca_metodo_excecoes || []).filter(
      (ex) => ex.marca_id === marcaAtiva.id
    );
    const governancaMarca = (db.governanca_automacao || []).filter(
      (g) => g.marca_id === marcaAtiva.id
    );

    const alertasBatimento = tarefasMarca
      .map((t) => {
        const alerta = avaliarBatimentoPrazo(t.prazo, t.status);
        if (!alerta) return null;
        return {
          tarefa_id: t.id,
          demanda_id: t.demanda_id,
          nome_etapa: t.nome_etapa,
          ...alerta,
        };
      })
      .filter(Boolean);

    return Response.json({
      relogio_explicito: clock,
      clock_servidor: clock.iso,
      marcas_disponiveis: db.marcas,
      marcas: db.marcas,
      marca_ativa: marcaAtiva,
      base_conhecimento_viva: baseConhecimentoViva,
      base_conhecimento_ao_vivo: baseConhecimentoViva,
      frentes: db.frentes,
      metodos_universais: db.metodos,
      excecoes_marca: excecoesMarca,
      governanca_automacao: governancaMarca,
      insumos_radar: insumosRadarMarca,
      pesquisas_mercado: pesquisasMarca,
      temas_editoriais: temasMarca,
      artigos_blog_ancora: artigosBlogMarca,
      resultados_ciclo: resultadosCicloMarca,
      demandas: demandasMarca,
      tarefas: tarefasMarca,
      tarefas_fluxo: tarefasMarca,
      entregas: entregasMarca,
      historico_decisoes: decisoesMarca,
      trilha_proveniencia: provenienciaMarca,
      alertas_batimento: alertasBatimento,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar contexto";
    return Response.json({ error: message }, { status: 400 });
  }
}
