/**
 * Disciplina transversal: Relógio Explícito e Batimento Proativo.
 * Toda decisão, prompt compilado e evento recebe a data/hora injetada pelo motor;
 * nenhum agente ou etapa deve assumir tempo decorrido por conta própria.
 */

export interface ClockSnapshot {
  iso: string;
  timezone: string;
  formatado_br: string;
  epoch_ms: number;
}

export function getExplicitClock(now: Date = new Date()): ClockSnapshot {
  const formatado = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now);

  return {
    iso: now.toISOString(),
    timezone: "America/Sao_Paulo (UTC-3)",
    formatado_br: formatado,
    epoch_ms: now.getTime(),
  };
}

export function addHoursToClock(baseIso: string, hours: number): string {
  const d = new Date(baseIso);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

export interface AlertaBatimentoPrazo {
  tipo: "atrasado" | "vencendo_em_breve" | "gate_parado";
  severidade: "critica" | "atencao";
  mensagem: string;
  horas_restantes_ou_atraso: number;
}

export function avaliarBatimentoPrazo(
  prazoIso: string,
  statusTarefaOuDemanda: string,
  now: Date = new Date()
): AlertaBatimentoPrazo | null {
  if (
    statusTarefaOuDemanda === "aprovada" ||
    statusTarefaOuDemanda === "peca_pronta" ||
    statusTarefaOuDemanda === "publicada"
  ) {
    return null;
  }

  const diffMs = new Date(prazoIso).getTime() - now.getTime();
  const diffHoras = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

  if (diffHoras < 0) {
    return {
      tipo: "atrasado",
      severidade: "critica",
      mensagem: `Prazo estourado há ${Math.abs(diffHoras)}h`,
      horas_restantes_ou_atraso: diffHoras,
    };
  }

  if (diffHoras <= 12) {
    return {
      tipo:
        statusTarefaOuDemanda === "aguardando_gate" ||
        statusTarefaOuDemanda === "em_gate"
          ? "gate_parado"
          : "vencendo_em_breve",
      severidade: "atencao",
      mensagem: `Vence em ${diffHoras}h`,
      horas_restantes_ou_atraso: diffHoras,
    };
  }

  return null;
}
