import { useCallback, useEffect, useState } from "react";
import {
  createStoreDeliveryCostsRadius,
  getStoreDeliveryCosts,
  updateStoreDeliveryCostsRadius,
} from "../api.ts";
import { ActionButton } from "./ActionButton.tsx";
import { FeedbackStrip } from "./FeedbackStrip.tsx";
import {
  type DeliveryRadiusRow,
  buildRadiusCreatePayload,
  buildRadiusPutPayload,
  emptyRadiusRow,
  parseDeliveryRadiusRows,
  radiusKeyPresentInPayload,
} from "../lib/deliveryRadius.ts";

type Props = {
  accessToken: string;
};

type Feedback = { kind: "success" | "error"; text: string } | null;

function validateRows(rows: DeliveryRadiusRow[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.distance_km <= 0) return `Linha ${i + 1}: informe a distância em km (maior que zero).`;
    if (r.delivery_code.trim() === "") return `Linha ${i + 1}: dê um nome curto para a faixa (ex.: até 5 km).`;
    if (r.value < 0 || r.return_tax_value < 0) return `Linha ${i + 1}: valores não podem ser negativos.`;
  }
  return null;
}

export function DeliveryRadiusSection({ accessToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [hadRadiusKey, setHadRadiusKey] = useState(false);
  const [rows, setRows] = useState<DeliveryRadiusRow[]>([]);

  const loadCosts = useCallback(
    async (opts?: { skipFeedbackClear?: boolean }) => {
      setLoading(true);
      if (!opts?.skipFeedbackClear) setFeedback(null);
      try {
        const json = await getStoreDeliveryCosts(accessToken);
        setHadRadiusKey(radiusKeyPresentInPayload(json));
        const parsed = parseDeliveryRadiusRows(json);
        setRows(parsed.length > 0 ? parsed : [emptyRadiusRow()]);
      } catch (e) {
        setRows([emptyRadiusRow()]);
        setHadRadiusKey(false);
        setFeedback({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void loadCosts();
  }, [loadCosts]);

  const updateRow = (index: number, patch: Partial<DeliveryRadiusRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRadiusRow()]);
  const removeRow = (index: number) => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const saveRadius = async () => {
    const toSend = rows.filter((r) => r.distance_km > 0 && r.delivery_code.trim() !== "");
    if (toSend.length === 0) {
      setFeedback({
        kind: "error",
        text: "Inclua ao menos uma faixa com distância (km) maior que zero e um nome curto para identificá-la.",
      });
      return;
    }
    const err = validateRows(toSend);
    if (err) {
      setFeedback({ kind: "error", text: err });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const withId = toSend.filter((r): r is DeliveryRadiusRow & { id: number } => r.id != null);
      const withoutId = toSend.filter((r) => r.id == null);
      if (withId.length > 0) {
        await updateStoreDeliveryCostsRadius(accessToken, buildRadiusPutPayload(withId));
      }
      if (withoutId.length > 0) {
        await createStoreDeliveryCostsRadius(accessToken, buildRadiusCreatePayload(withoutId));
      }
      await loadCosts({ skipFeedbackClear: true });
      setFeedback({ kind: "success", text: "Entrega por raio atualizada com sucesso." });
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;
  const parsedCount = rows.filter((r) => r.distance_km > 0 && r.delivery_code.trim() !== "").length;
  const showNoRadiusFromApi = !loading && !hadRadiusKey;

  return (
    <div className="schedule-block schedule-block--action">
      <section className="app-panel-card schedule-card" aria-labelledby="schedule-radius-title">
        <div className="app-panel-card__header">
          <geraldo-text id="schedule-radius-title" variant="h3-section" weight="medium" as="h3">
            Entrega por raio
          </geraldo-text>
        </div>
        <div className="card-lede">
          <geraldo-text variant="body-default" as="p">
            Ajuste o valor de entrega para cada distância. Faixas que já existem na loja aparecem com um
            número de referência; faixas novas você inclui na tabela e confirma ao salvar. Outras regras de preço
            ficam por conta do Aiqfome e não aparecem aqui.
          </geraldo-text>
        </div>

        {feedback ? (
          <div className="delivery-radius-feedback">
            <FeedbackStrip tone={feedback.kind === "success" ? "success" : "danger"} onDismiss={() => setFeedback(null)}>
              {feedback.text}
            </FeedbackStrip>
          </div>
        ) : null}

        {showNoRadiusFromApi ? (
          <div className="empty-state delivery-radius-empty">
            <geraldo-badge tone="neutral">Ainda sem cadastro</geraldo-badge>
            <geraldo-text variant="body-default" as="p">
              Não encontramos faixas de entrega por distância para esta loja. Você pode cadastrar abaixo e salvar, se a
              sua conta permitir.
            </geraldo-text>
          </div>
        ) : null}

        {!loading && hadRadiusKey && parsedCount === 0 ? (
          <div className="empty-state delivery-radius-empty">
            <geraldo-text variant="body-default" as="p">
              Não há faixas de entrega por raio cadastradas. Adicione linhas abaixo e salve.
            </geraldo-text>
          </div>
        ) : null}

        <div className="delivery-radius-editor">
          <div className="delivery-radius-table-wrap" role="region" aria-label="Faixas de entrega por distância">
            <table className="delivery-radius-table">
              <thead>
                <tr>
                  <th scope="col">Ref.</th>
                  <th scope="col">Distância (km)</th>
                  <th scope="col">Valor de entrega</th>
                  <th scope="col">Taxa volta</th>
                  <th scope="col">Código / nome da faixa</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id != null ? `id-${r.id}` : `new-${i}`}>
                    <td className="delivery-radius-id-cell">
                      {r.id != null ? (
                        <span className="delivery-radius-id" title="Número interno desta faixa na aiqfome">
                          {r.id}
                        </span>
                      ) : (
                        <span className="delivery-radius-id delivery-radius-id--new">—</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="delivery-radius-input"
                        disabled={busy}
                        value={r.distance_km || ""}
                        onChange={(e) => updateRow(i, { distance_km: Number(e.target.value) || 0 })}
                        aria-label={`Distância km linha ${i + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="delivery-radius-input"
                        disabled={busy}
                        value={r.value || ""}
                        onChange={(e) => updateRow(i, { value: Number(e.target.value) || 0 })}
                        aria-label={`Valor de entrega linha ${i + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="delivery-radius-input"
                        disabled={busy}
                        value={r.return_tax_value || ""}
                        onChange={(e) => updateRow(i, { return_tax_value: Number(e.target.value) || 0 })}
                        aria-label={`Taxa volta linha ${i + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="delivery-radius-input delivery-radius-input--text"
                        disabled={busy}
                        value={r.delivery_code}
                        onChange={(e) => updateRow(i, { delivery_code: e.target.value })}
                        placeholder="Ex.: até 10 km"
                        aria-label={`Código da faixa linha ${i + 1}`}
                      />
                    </td>
                    <td>
                      <ActionButton
                        variant="ghost"
                        color="primary"
                        size="sm"
                        disabled={busy || rows.length <= 1}
                        onClick={() => removeRow(i)}
                      >
                        Remover
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="delivery-radius-toolbar">
            <ActionButton variant="filled" color="primary" size="sm" disabled={busy} onClick={addRow}>
              Adicionar faixa
            </ActionButton>
          </div>
        </div>

        <div className="card-footer-actions card-footer-actions--end">
          <ActionButton variant="filled" color="primary" loading={saving} disabled={busy} onClick={() => void saveRadius()}>
            Salvar entrega por raio
          </ActionButton>
        </div>
      </section>
    </div>
  );
}
