import { createClient } from "@supabase/supabase-js";
import { getExplicitClock } from "@/lib/clock";
import { readMotorDb } from "@/lib/store/motor-db";
import { BaseConhecimentoMarca } from "@/lib/types";

const SUPABASE_TENANT_MAP: Record<string, string> = {
  eloss: "00000000-0000-0000-0000-000000000001",
};

/**
 * ABSTRAÇÃO ÚNICA DE BASE DE CONHECIMENTO POR MARCA ("buscar base da marca X")
 * - Marcas internas (Eloss, Trampô Space, Agentfaz) -> Consulta ao vivo no SUPABASE
 * - Marcas de clientes externos -> Consulta ao vivo no NOTION
 * Nunca é editada ou cacheada dentro do motor: o motor apenas lê ao vivo da fonte
 * de verdade no template único de 6 categorias.
 */
export async function getLiveBrandKnowledge(
  marcaId: string
): Promise<BaseConhecimentoMarca> {
  const db = readMotorDb();
  const marca = db.marcas.find((m) => m.id === marcaId);

  if (!marca) {
    throw new Error(`Marca não encontrada para marca_id=${marcaId}`);
  }

  const clock = getExplicitClock().iso;
  const basePadrao = db.bases_conhecimento_marca.find(
    (b) => b.marca_id === marcaId
  );

  if (!basePadrao) {
    throw new Error(
      `Registro de base não encontrado para a marca ${marca.nome}`
    );
  }

  // Se o Supabase real estiver configurado no ambiente, puxa os documentos ao vivo do Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    marca.fonte_conhecimento === "supabase" &&
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("SEU_PROJETO")
  ) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const tenantId = SUPABASE_TENANT_MAP[marca.slug] || marca.id;

      const [{ data: docs }, { data: regras }] = await Promise.all([
        supabase
          .from("documentos_regra")
          .select("nome, conteudo")
          .eq("empresa_id", tenantId),
        supabase
          .from("regras_marca")
          .select("nome, tipo, conteudo")
          .eq("empresa_id", tenantId)
          .eq("ativa", true),
      ]);

      const docTom = docs?.find((d) =>
        d.nome?.toLowerCase().includes("tom")
      )?.conteudo;
      const docBase = docs?.find((d) =>
        d.nome?.toLowerCase().includes("base factual")
      )?.conteudo;

      const regrasFormatadas =
        regras && regras.length > 0
          ? regras
              .map(
                (r) =>
                  `• ${r.nome}: ${
                    typeof r.conteudo === "string"
                      ? r.conteudo
                      : JSON.stringify(r.conteudo)
                  }`
              )
              .join("\n")
          : null;

      return {
        ...basePadrao,
        fonte_origem: "supabase",
        consultado_ao_vivo_em: clock,
        identidade_tom:
          docTom && !String(docTom).startsWith("PREENCHER:")
            ? String(docTom)
            : basePadrao.identidade_tom,
        posicionamento:
          docBase && !String(docBase).startsWith("PREENCHER:")
            ? String(docBase)
            : basePadrao.posicionamento,
        restricoes_conteudo: regrasFormatadas
          ? `${basePadrao.restricoes_conteudo}\n\nRegras ativas no Supabase:\n${regrasFormatadas}`
          : basePadrao.restricoes_conteudo,
      };
    } catch {
      // Fallback silencioso para os dados espelhados da fonte caso offline
    }
  }

  return {
    ...basePadrao,
    fonte_origem: marca.fonte_conhecimento,
    consultado_ao_vivo_em: clock,
  };
}

export async function updateLiveBrandKnowledge(
  marcaId: string,
  payload: Pick<
    BaseConhecimentoMarca,
    | "identidade_tom"
    | "publico"
    | "posicionamento"
    | "produtos_catalogo"
    | "restricoes_conteudo"
    | "historico_resumo"
  >
): Promise<BaseConhecimentoMarca> {
  const db = readMotorDb();
  const idx = db.bases_conhecimento_marca.findIndex(
    (b) => b.marca_id === marcaId
  );
  if (idx === -1) {
    throw new Error(`Base não encontrada para marca_id=${marcaId}`);
  }
  const clock = getExplicitClock().iso;
  const atualizada: BaseConhecimentoMarca = {
    ...db.bases_conhecimento_marca[idx],
    ...payload,
    consultado_ao_vivo_em: clock,
    atualizado_em: clock,
  };
  db.bases_conhecimento_marca[idx] = atualizada;
  return atualizada;
}
