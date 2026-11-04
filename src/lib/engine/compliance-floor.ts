import { ChecklistComplianceFixo } from "@/lib/types";

/**
 * PISO DE COMPLIANCE FIXO (Fundação Agentfaz)
 * Estas 3 travas ficam fora da escada de automação em qualquer nível (1, 2 ou 3).
 * Nunca se tornam gate automático sem verificação explícita.
 */
export const REGRAS_PISO_COMPLIANCE = [
  {
    chave: "sem_promessa_financeira" as const,
    titulo: "Sem promessa de resultado financeiro",
    descricao:
      "A peça não promete ganho financeiro garantido, retorno exato ou enriquecimento.",
  },
  {
    chave: "sem_urgencia_artificial" as const,
    titulo: "Sem urgência artificial ou escassez falsa",
    descricao:
      "A peça não usa contadores falsos, vagas fictícias ou pressão artificial sem lastro real.",
  },
  {
    chave: "sem_claim_absoluta_sem_evidencia" as const,
    titulo: "Sem claim absoluta sem evidência",
    descricao:
      "A peça não usa superlativos absolutos ('o único', '100% garantido', 'nunca falha') sem prova verificável.",
  },
];

export interface ResultadoValidacaoCompliance {
  valido: boolean;
  itens_pendentes: string[];
  alertas_lexicos_detectados: string[];
}

const TERMOS_SUSPEITOS_COMPLIANCE: Array<{
  regex: RegExp;
  motivo: string;
}> = [
  {
    regex: /\b(lucro garantido|retorno garantido|ganhe r\$|fature r\$|enriqueça)\b/i,
    motivo: "Possível promessa de resultado financeiro detectada no texto.",
  },
  {
    regex: /\b(últimas? vagas? agora|só pelos próximos minutos|acaba hoje para sempre)\b/i,
    motivo: "Possível gatilho de urgência artificial detectado no texto.",
  },
  {
    regex: /\b(100%\s*garantido|nunca falha|o único método do mundo|infalível)\b/i,
    motivo: "Possível claim absoluta sem evidência detectada no texto.",
  },
];

export function validarPisoComplianceFixo(
  checklist: ChecklistComplianceFixo,
  textoArtefatoConcatenado = ""
): ResultadoValidacaoCompliance {
  const itensPendentes: string[] = [];

  for (const regra of REGRAS_PISO_COMPLIANCE) {
    if (!checklist[regra.chave]) {
      itensPendentes.push(regra.titulo);
    }
  }

  const alertasLexicos: string[] = [];
  if (textoArtefatoConcatenado.trim().length > 0) {
    for (const item of TERMOS_SUSPEITOS_COMPLIANCE) {
      if (item.regex.test(textoArtefatoConcatenado)) {
        alertasLexicos.push(item.motivo);
      }
    }
  }

  return {
    valido: itensPendentes.length === 0,
    itens_pendentes: itensPendentes,
    alertas_lexicos_detectados: alertasLexicos,
  };
}
