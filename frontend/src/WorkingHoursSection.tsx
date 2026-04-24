import { useCallback, useEffect, useState } from "react";
import {
  getStoreWeekSchedule,
  updateDeliveryWindow,
  updateStoreHoursByDay,
  updateStorePreparationTime,
} from "./api.ts";
import { ActionButton } from "./components/ActionButton.tsx";
import { DeliveryRadiusSection } from "./components/DeliveryRadiusSection.tsx";
import { DeliveryWindowGrid } from "./components/DeliveryWindowGrid.tsx";
import { FeedbackStrip } from "./components/FeedbackStrip.tsx";
import { OpenSwitch } from "./components/OpenSwitch.tsx";
import { TimeInput24h } from "./components/TimeInput24h.tsx";
import {
  type ApiWorkingHourRow,
  type DayScheduleDraft,
  type StoreServiceDraft,
  type WeekDayNumber,
  UI_WEEK_DAY_LABEL,
  buildDraftFromApiRows,
  buildUpdateStoreHoursPayload,
  defaultServiceDraft,
  validateDaySchedule,
  copyScheduleToBusinessWeekdays,
  formatDayScheduleSummary,
  PREPARATION_MINUTES_OPTIONS,
  DELIVERY_WINDOW_OPTIONS,
} from "./lib/weekSchedule.ts";

type Props = {
  accessToken: string;
  initialPreparationMinutes?: number | null;
  initialDeliveryWindow?: string | null;
  /** Chamado após salvar preparo + prazo (ex.: atualizar resumo da loja no painel). */
  onDeliverySettingsSaved?: () => void;
};

type Feedback = { kind: "success" | "error"; text: string } | null;

function parseWhRows(payload: unknown): ApiWorkingHourRow[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is ApiWorkingHourRow => typeof r === "object" && r !== null);
}

function normalizeDeliveryWindow(v: string | null | undefined): string | null {
  if (!v || !v.trim()) return null;
  const t = v.trim().replace(/\s*-\s*/g, " - ");
  return (DELIVERY_WINDOW_OPTIONS as readonly string[]).includes(t) ? t : null;
}

function nearestPreparationMinutes(n: number | null | undefined): number {
  if (n == null || Number.isNaN(n)) return 30;
  const allowed = [...PREPARATION_MINUTES_OPTIONS];
  let best = allowed[0];
  let bestDist = Infinity;
  for (const a of allowed) {
    const d = Math.abs(a - n);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

function patchDay(days: DayScheduleDraft[], n: WeekDayNumber, patch: Partial<DayScheduleDraft>): DayScheduleDraft[] {
  return days.map((d) => (d.weekDayNumber === n ? { ...d, ...patch } : d));
}

export function WorkingHoursSection({
  accessToken,
  initialPreparationMinutes,
  initialDeliveryWindow,
  onDeliverySettingsSaved,
}: Props) {
  const [rows, setRows] = useState<ApiWorkingHourRow[]>([]);
  const [dayDrafts, setDayDrafts] = useState<DayScheduleDraft[]>(() => buildDraftFromApiRows([]));
  const [serviceDraft, setServiceDraft] = useState<StoreServiceDraft>(() => defaultServiceDraft());

  const [scheduleLoading, setScheduleLoading] = useState(false);
  /** Escrita em curso: qual fluxo está ativo (spinner no botão correspondente). */
  const [writeOp, setWriteOp] = useState<null | "hours" | "service">(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [expandedDays, setExpandedDays] = useState<Set<WeekDayNumber>>(() => new Set());

  const toggleDayExpanded = (n: WeekDayNumber) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  useEffect(() => {
    setServiceDraft((prev) => ({
      ...prev,
      preparationMinutes: nearestPreparationMinutes(initialPreparationMinutes ?? undefined),
      deliveryWindow: normalizeDeliveryWindow(initialDeliveryWindow) ?? prev.deliveryWindow,
    }));
  }, [initialPreparationMinutes, initialDeliveryWindow]);

  const loadWeekSchedule = useCallback(
    async (opts?: { skipFeedbackClear?: boolean; announceSynced?: boolean }) => {
      setScheduleLoading(true);
      if (!opts?.skipFeedbackClear) setFeedback(null);
      try {
        const json = await getStoreWeekSchedule(accessToken);
        const parsed = parseWhRows(json);
        setRows(parsed);
        setDayDrafts(buildDraftFromApiRows(parsed));
        if (opts?.announceSynced) {
          setFeedback({ kind: "success", text: "Horários sincronizados com sucesso." });
        }
      } catch (e) {
        setRows([]);
        setFeedback({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      } finally {
        setScheduleLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void loadWeekSchedule();
  }, [loadWeekSchedule]);

  const saveWeekScheduleFromForm = async () => {
    for (const d of dayDrafts) {
      const err = validateDaySchedule(d);
      if (err) {
        setFeedback({ kind: "error", text: err });
        return;
      }
    }
    setWriteOp("hours");
    setFeedback(null);
    try {
      await updateStoreHoursByDay(accessToken, buildUpdateStoreHoursPayload(dayDrafts));
      await loadWeekSchedule({ skipFeedbackClear: true });
      setFeedback({ kind: "success", text: "Horários atualizados com sucesso." });
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setWriteOp(null);
    }
  };

  const saveServiceSettingsFromForm = async () => {
    const prep = serviceDraft.preparationMinutes;
    if (prep % 10 !== 0) {
      setFeedback({ kind: "error", text: "O tempo de preparo precisa ser múltiplo de 10 minutos." });
      return;
    }
    setWriteOp("service");
    setFeedback(null);
    try {
      await updateStorePreparationTime(accessToken, { preparation_time: prep });
      await updateDeliveryWindow(accessToken, { delivery_time: serviceDraft.deliveryWindow });
      await loadWeekSchedule({ skipFeedbackClear: true });
      setFeedback({ kind: "success", text: "Preparo e prazo de entrega atualizados com sucesso." });
      onDeliverySettingsSaved?.();
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setWriteOp(null);
    }
  };

  const writeBusy = writeOp !== null;
  const formDisabled = writeBusy;
  const anyBusy = scheduleLoading || writeBusy;

  return (
    <section className="section-block section-block--schedule" id="horarios-prazos" aria-label="Horários e prazos">
      {feedback ? (
        <FeedbackStrip tone={feedback.kind === "success" ? "success" : "danger"} onDismiss={() => setFeedback(null)}>
          {feedback.text}
        </FeedbackStrip>
      ) : null}

      <div className="schedule-panels">
          <div className="schedule-block schedule-block--info">
            <geraldo-card radius="outer" elevation="mid" className="schedule-card">
              <geraldo-text slot="header" variant="h3-section" weight="medium" as="h3">
                Horários da sua loja
              </geraldo-text>
              <div className="card-lede">
                <geraldo-text variant="body-default" as="p">
                  Visão geral do que está cadastrado na plataforma. Os horários carregam ao abrir o painel; use
                  &quot;Sincronizar&quot; só se quiser atualizar manualmente.
                </geraldo-text>
              </div>

              {scheduleLoading && rows.length === 0 ? (
                <div className="empty-state">
                  <geraldo-text variant="body-default" as="p">
                    Carregando horários da plataforma…
                  </geraldo-text>
                </div>
              ) : rows.length > 0 ? (
                <div className="wh-grid" role="list">
                  {rows.map((r) => (
                    <div key={r.id ?? `${r.week_day_number}-${r.hours}`} className="wh-cell" role="listitem">
                      <span className="wh-cell__day">
                        <geraldo-text variant="caption" as="span">
                          {UI_WEEK_DAY_LABEL[r.week_day_number as WeekDayNumber] ?? `Dia ${r.week_day_number ?? "?"}`}
                        </geraldo-text>
                      </span>
                      <span className="wh-cell__hours">
                        <geraldo-text variant="body-strong" as="span">
                          {r.hours ?? "—"}
                        </geraldo-text>
                      </span>
                      <geraldo-badge tone={r.status === 1 ? "success" : "neutral"}>
                        {r.status === 1 ? "Aberto" : "Fechado"}
                      </geraldo-badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <geraldo-text variant="body-default" as="p">
                    Nenhum horário foi retornado pela plataforma. Verifique permissões ou tente &quot;Sincronizar&quot;.
                  </geraldo-text>
                </div>
              )}

              <div slot="footer" className="card-footer-actions">
                <ActionButton
                  variant="filled"
                  color="primary"
                  loading={scheduleLoading}
                  disabled={anyBusy}
                  onClick={() => void loadWeekSchedule({ announceSynced: true })}
                >
                  Sincronizar
                </ActionButton>
              </div>
            </geraldo-card>
          </div>

          <div className="schedule-block schedule-block--action">
            <geraldo-card radius="outer" elevation="mid" className="schedule-card">
              <geraldo-text slot="header" variant="h3-section" weight="medium" as="h3">
                Alterar horários por dia
              </geraldo-text>
              <div className="card-lede">
                <geraldo-text variant="body-default" as="p">
                  Toque no dia para expandir e editar horários em formato 24 horas. O resumo mostra o estado atual
                  antes de salvar.
                </geraldo-text>
              </div>

              <div className="day-accordion-list">
                {dayDrafts.map((d) => {
                  const expanded = expandedDays.has(d.weekDayNumber);
                  const summary = formatDayScheduleSummary(d);
                  const n = d.weekDayNumber;
                  return (
                    <div
                      key={n}
                      className={`day-accordion${expanded ? " day-accordion--open" : ""}`}
                    >
                      <div className="day-accordion__bar">
                        <button
                          type="button"
                          className="day-accordion__trigger"
                          aria-expanded={expanded}
                          id={`day-trigger-${n}`}
                          aria-controls={`day-panel-${n}`}
                          disabled={anyBusy}
                          onClick={() => toggleDayExpanded(n)}
                        >
                          <span
                            className={`day-accordion__chevron${expanded ? " day-accordion__chevron--open" : ""}`}
                            aria-hidden
                          />
                          <span className="day-accordion__trigger-main">
                            <geraldo-text variant="body-strong" as="span" className="day-accordion__label">
                              {UI_WEEK_DAY_LABEL[n]}
                            </geraldo-text>
                            <geraldo-text variant="body-default" as="span" className="day-accordion__summary">
                              {summary}
                            </geraldo-text>
                          </span>
                          <geraldo-badge tone={d.open ? "success" : "neutral"}>
                            {d.open ? "Aberto" : "Fechado"}
                          </geraldo-badge>
                        </button>
                        <div
                          className="day-accordion__switch"
                          role="group"
                          aria-label={`${UI_WEEK_DAY_LABEL[n]}: alternar dia aberto ou fechado para clientes`}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <OpenSwitch
                            checked={d.open}
                            disabled={formDisabled}
                            onChecked={(open) =>
                              setDayDrafts((prev) => patchDay(prev, n, { open }))
                            }
                          />
                        </div>
                      </div>

                      {expanded ? (
                        <div
                          id={`day-panel-${n}`}
                          role="region"
                          aria-labelledby={`day-trigger-${n}`}
                          className="day-accordion__panel"
                        >
                          {d.open ? (
                            <div className="day-accordion__periods">
                              <div className="time-period-block">
                                <geraldo-text variant="caption" as="span">
                                  1º período
                                </geraldo-text>
                                <div className="time-input-pair">
                                  <div className="time-field">
                                    <span className="time-field__label">Início</span>
                                    <TimeInput24h
                                      id={`d${n}-p1a`}
                                      ariaLabel={`Início do 1º período — ${UI_WEEK_DAY_LABEL[n]}`}
                                      value={d.firstStart}
                                      disabled={formDisabled}
                                      onChange={(firstStart) =>
                                        setDayDrafts((prev) => patchDay(prev, n, { firstStart }))
                                      }
                                    />
                                  </div>
                                  <div className="time-field">
                                    <span className="time-field__label">Fim</span>
                                    <TimeInput24h
                                      id={`d${n}-p1b`}
                                      ariaLabel={`Fim do 1º período — ${UI_WEEK_DAY_LABEL[n]}`}
                                      value={d.firstEnd}
                                      disabled={formDisabled}
                                      onChange={(firstEnd) =>
                                        setDayDrafts((prev) => patchDay(prev, n, { firstEnd }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                              <label className="second-period-toggle">
                                <input
                                  type="checkbox"
                                  checked={d.secondPeriodEnabled}
                                  disabled={formDisabled}
                                  onChange={(e) =>
                                    setDayDrafts((prev) =>
                                      patchDay(prev, n, { secondPeriodEnabled: e.target.checked }),
                                    )
                                  }
                                />
                                <geraldo-text variant="body-default" as="span">
                                  Segundo período no mesmo dia
                                </geraldo-text>
                              </label>
                              {d.secondPeriodEnabled ? (
                                <div className="time-period-block">
                                  <geraldo-text variant="caption" as="span">
                                    2º período
                                  </geraldo-text>
                                  <div className="time-input-pair">
                                    <div className="time-field">
                                      <span className="time-field__label">Início</span>
                                      <TimeInput24h
                                        id={`d${n}-p2a`}
                                        ariaLabel={`Início do 2º período — ${UI_WEEK_DAY_LABEL[n]}`}
                                        value={d.secondStart}
                                        disabled={formDisabled}
                                        onChange={(secondStart) =>
                                          setDayDrafts((prev) => patchDay(prev, n, { secondStart }))
                                        }
                                      />
                                    </div>
                                    <div className="time-field">
                                      <span className="time-field__label">Fim</span>
                                      <TimeInput24h
                                        id={`d${n}-p2b`}
                                        ariaLabel={`Fim do 2º período — ${UI_WEEK_DAY_LABEL[n]}`}
                                        value={d.secondEnd}
                                        disabled={formDisabled}
                                        onChange={(secondEnd) =>
                                          setDayDrafts((prev) => patchDay(prev, n, { secondEnd }))
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <geraldo-text variant="caption" as="p" className="day-closed-note">
                              Este dia aparecerá como fechado para clientes. Use o interruptor acima para abrir o dia e
                              definir períodos.
                            </geraldo-text>
                          )}
                          <div className="day-accordion__copy-row">
                            <ActionButton
                              variant="filled"
                              color="primary"
                              size="sm"
                              disabled={formDisabled}
                              onClick={() => {
                                setDayDrafts((prev) => {
                                  const source = prev.find((x) => x.weekDayNumber === n) ?? d;
                                  return copyScheduleToBusinessWeekdays(prev, source);
                                });
                                setFeedback({
                                  kind: "success",
                                  text: "Horários copiados para os dias úteis. Use Salvar horários para enviar à plataforma.",
                                });
                              }}
                            >
                              Copiar horário para todos os dias úteis
                            </ActionButton>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div slot="footer" className="card-footer-actions card-footer-actions--end">
                <ActionButton
                  variant="filled"
                  color="primary"
                  loading={writeOp === "hours"}
                  disabled={anyBusy}
                  onClick={() => void saveWeekScheduleFromForm()}
                >
                  Salvar horários
                </ActionButton>
              </div>
            </geraldo-card>
          </div>

          <div className="schedule-block schedule-block--action">
            <geraldo-card radius="outer" elevation="mid" className="schedule-card">
              <geraldo-text slot="header" variant="h3-section" weight="medium" as="h3">
                Preparo e prazo de entrega
              </geraldo-text>
              <div className="card-lede">
                <geraldo-text variant="body-default" as="p">
                  Escolha o tempo de preparo (de 10 em 10 minutos) e o prazo de entrega que o cliente vê no app. Um
                  único botão salva os dois na aiqfome.
                </geraldo-text>
              </div>

              <div className="service-form">
                <fieldset className="prep-minutes-grid" disabled={formDisabled}>
                  <legend className="prep-minutes-grid__legend">
                    <geraldo-text variant="body-default" weight="medium" as="span">
                      Tempo de preparo permitido (minutos)
                    </geraldo-text>
                  </legend>
                  <div className="prep-minutes-grid__options">
                    {PREPARATION_MINUTES_OPTIONS.map((m) => {
                      const selected = serviceDraft.preparationMinutes === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`prep-option-chip${selected ? " prep-option-chip--selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() => setServiceDraft((s) => ({ ...s, preparationMinutes: m }))}
                        >
                          <geraldo-text variant="body-strong" as="span">
                            {m}
                          </geraldo-text>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <DeliveryWindowGrid
                  value={serviceDraft.deliveryWindow}
                  disabled={formDisabled}
                  onChange={(deliveryWindow) => setServiceDraft((s) => ({ ...s, deliveryWindow }))}
                />
              </div>

              <div slot="footer" className="card-footer-actions card-footer-actions--end">
                <ActionButton
                  variant="filled"
                  color="primary"
                  loading={writeOp === "service"}
                  disabled={anyBusy}
                  onClick={() => void saveServiceSettingsFromForm()}
                >
                  Salvar preparo e prazo de entrega
                </ActionButton>
              </div>
            </geraldo-card>
          </div>

          <DeliveryRadiusSection accessToken={accessToken} />
        </div>
    </section>
  );
}
