const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function parseHm(value: string): { h: string; m: string } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return { h: "09", m: "00" };
  let h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  let min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  if (Number.isNaN(h)) h = 9;
  if (Number.isNaN(min)) min = 0;
  return { h: String(h).padStart(2, "0"), m: String(min).padStart(2, "0") };
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  /** Identificador estável para associar rótulos (acessibilidade). */
  id: string;
  /** Rótulo acessível (ex.: início do 1º período). */
  ariaLabel: string;
};

/**
 * Horário sempre em formato 24 h (seletores), independente do locale do navegador.
 */
export function TimeInput24h({ value, onChange, disabled, id, ariaLabel }: Props) {
  const { h, m } = parseHm(value);

  return (
    <div className="time-input-24" role="group" aria-label={ariaLabel}>
      <label htmlFor={`${id}-h`} className="visually-hidden">
        Hora ({ariaLabel})
      </label>
      <select
        id={`${id}-h`}
        className="time-input-24__select"
        disabled={disabled}
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
      >
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>
            {hh}h
          </option>
        ))}
      </select>
      <span className="time-input-24__sep" aria-hidden>
        :
      </span>
      <label htmlFor={`${id}-m`} className="visually-hidden">
        Minutos ({ariaLabel})
      </label>
      <select
        id={`${id}-m`}
        className="time-input-24__select"
        disabled={disabled}
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
      >
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
    </div>
  );
}
