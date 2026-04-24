/** Modelo de horário por dia da semana (regra de negócio loja). */

export const DELIVERY_WINDOW_OPTIONS = ["15 - 30", "20 - 40", "40 - 60", "60 - 90", "90 - 120"] as const;

export const PREPARATION_MINUTES_OPTIONS = [10, 20, 30, 40, 50, 60] as const;

/** Nomes em minúsculas conforme exemplos da API (POST working-hours). */
export const API_WEEK_DAY_NAME: Record<number, string> = {
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sábado",
  7: "domingo",
};

/** Rótulos para interface (pt-BR). */
export const UI_WEEK_DAY_LABEL: Record<number, string> = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
};

export type WeekDayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DayScheduleDraft = {
  weekDayNumber: WeekDayNumber;
  /** Loja abre neste dia */
  open: boolean;
  firstStart: string;
  firstEnd: string;
  secondPeriodEnabled: boolean;
  secondStart: string;
  secondEnd: string;
};

export type StoreServiceDraft = {
  deliveryWindow: string;
  preparationMinutes: number;
};

export type ApiWorkingHourRow = {
  id?: number;
  store_id?: number;
  week_day_number?: number;
  hours?: string;
  status?: number;
};

function parseTimeRange(range: string): { start: string; end: string } {
  const m = range.trim().match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return { start: "09:00", end: "18:00" };
  const pad = (t: string) => {
    const [h, min] = t.split(":");
    return `${h.padStart(2, "0")}:${min.padStart(2, "0")}`;
  };
  return { start: pad(m[1]), end: pad(m[2]) };
}

/** Interpreta o texto retornado pelo GET (um ou dois períodos separados por |). */
export function parseApiHoursString(hoursStr: string | undefined): {
  firstStart: string;
  firstEnd: string;
  secondPeriodEnabled: boolean;
  secondStart: string;
  secondEnd: string;
} {
  if (!hoursStr || !hoursStr.trim()) {
    return {
      firstStart: "09:00",
      firstEnd: "18:00",
      secondPeriodEnabled: false,
      secondStart: "13:00",
      secondEnd: "18:00",
    };
  }
  const parts = hoursStr.split("|").map((p) => p.trim()).filter(Boolean);
  const first = parseTimeRange(parts[0] ?? "");
  const second = parts[1] ? parseTimeRange(parts[1]) : null;
  return {
    firstStart: first.start,
    firstEnd: first.end,
    secondPeriodEnabled: !!second,
    secondStart: second?.start ?? "13:00",
    secondEnd: second?.end ?? "18:00",
  };
}

export function defaultDaySchedule(weekDayNumber: WeekDayNumber): DayScheduleDraft {
  return {
    weekDayNumber,
    open: true,
    firstStart: "09:00",
    firstEnd: "18:00",
    secondPeriodEnabled: false,
    secondStart: "13:00",
    secondEnd: "18:00",
  };
}

/** Monta os 7 dias a partir da resposta GET /working-hours (completa dias faltantes). */
export function buildDraftFromApiRows(rows: ApiWorkingHourRow[]): DayScheduleDraft[] {
  const byDay = new Map<number, ApiWorkingHourRow>();
  for (const r of rows) {
    const n = r.week_day_number;
    if (typeof n === "number" && n >= 1 && n <= 7) byDay.set(n, r);
  }
  const out: DayScheduleDraft[] = [];
  for (let d = 1; d <= 7; d++) {
    const n = d as WeekDayNumber;
    const row = byDay.get(d);
    if (!row) {
      out.push(defaultDaySchedule(n));
      continue;
    }
    const parsed = parseApiHoursString(row.hours);
    out.push({
      weekDayNumber: n,
      open: row.status === 1,
      ...parsed,
    });
  }
  return out;
}

export function defaultServiceDraft(): StoreServiceDraft {
  return {
    deliveryWindow: "40 - 60",
    preparationMinutes: 30,
  };
}

/** Corpo POST /store/{id}/working-hours (substitui os dias enviados — aqui enviamos os 7). */
export function buildUpdateStoreHoursPayload(days: DayScheduleDraft[]): { working_hours: object[] } {
  const working_hours = days.map((d) => {
    const slug = API_WEEK_DAY_NAME[d.weekDayNumber];
    if (!d.open) {
      return {
        week_day_number: String(d.weekDayNumber),
        week_day_name: slug,
        status: "0",
        hours: { first_period: "00:00 - 00:00" },
      };
    }
    const hours: Record<string, string> = {
      first_period: `${d.firstStart} - ${d.firstEnd}`,
    };
    if (d.secondPeriodEnabled) {
      hours.second_period = `${d.secondStart} - ${d.secondEnd}`;
    }
    return {
      week_day_number: String(d.weekDayNumber),
      week_day_name: slug,
      status: "1",
      hours,
    };
  });
  return { working_hours };
}

export function validateDaySchedule(d: DayScheduleDraft): string | null {
  if (!d.open) return null;
  if (!d.firstStart || !d.firstEnd) return `Informe o 1º período em ${UI_WEEK_DAY_LABEL[d.weekDayNumber]}.`;
  if (d.secondPeriodEnabled && (!d.secondStart || !d.secondEnd)) {
    return `Informe o 2º período em ${UI_WEEK_DAY_LABEL[d.weekDayNumber]} ou desmarque a opção.`;
  }
  return null;
}

/** Segunda a sexta (número do dia 1–7 na API). */
export const BUSINESS_WEEKDAY_NUMBERS: readonly WeekDayNumber[] = [1, 2, 3, 4, 5];

/** Resumo em texto para o cabeçalho do acordeão (horários já em 24 h). */
export function formatDayScheduleSummary(d: DayScheduleDraft): string {
  if (!d.open) return "Fechado";
  const first = `${d.firstStart} às ${d.firstEnd}`;
  if (!d.secondPeriodEnabled) return first;
  return `${first} e ${d.secondStart} às ${d.secondEnd}`;
}

/** Replica o horário de um dia em todos os dias úteis (sábado e domingo inalterados). */
export function copyScheduleToBusinessWeekdays(
  drafts: DayScheduleDraft[],
  source: DayScheduleDraft,
): DayScheduleDraft[] {
  return drafts.map((row) => {
    if (!BUSINESS_WEEKDAY_NUMBERS.includes(row.weekDayNumber)) return row;
    return {
      ...row,
      open: source.open,
      firstStart: source.firstStart,
      firstEnd: source.firstEnd,
      secondPeriodEnabled: source.secondPeriodEnabled,
      secondStart: source.secondStart,
      secondEnd: source.secondEnd,
    };
  });
}
