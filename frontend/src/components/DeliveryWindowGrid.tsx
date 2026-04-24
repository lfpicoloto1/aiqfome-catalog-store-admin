import { DELIVERY_WINDOW_OPTIONS } from "../lib/weekSchedule.ts";

type Props = {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  legend?: string;
};

export function DeliveryWindowGrid({ value, disabled, onChange, legend = "Prazo exibido para o cliente" }: Props) {
  return (
    <fieldset className="delivery-window-grid" disabled={disabled}>
      {legend ? (
        <legend className="delivery-window-grid__legend">
          <geraldo-text variant="body-default" weight="medium" as="span">
            {legend}
          </geraldo-text>
        </legend>
      ) : null}
      <div className="delivery-window-grid__options" role="group" aria-label={legend}>
        {DELIVERY_WINDOW_OPTIONS.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`delivery-option-chip${selected ? " delivery-option-chip--selected" : ""}`}
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(opt)}
            >
              <geraldo-text variant="body-strong" as="span">
                {opt}
              </geraldo-text>
              <geraldo-text variant="caption" as="span">
                minutos
              </geraldo-text>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
