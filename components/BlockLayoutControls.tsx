import React from 'react';
import {
  DEFAULT_BLOCK_STYLE, spanOf,
  SPAN_OPTIONS, WIDTH_OPTIONS, ALIGN_OPTIONS, SPACING_OPTIONS, SURFACE_OPTIONS, REVEAL_OPTIONS,
  type BlockStyle, type BlockSpan,
} from '../lib/blockStyle';

/**
 * One set of layout controls, used in both places a block can be edited.
 *
 * They started out inside the toolbar that floats over the live page, which
 * meant the admin panel — the screen you go to when you want to build a page
 * rather than touch up a word — could not change a block's layout at all. Same
 * controls, same wording, two hosts.
 *
 * Y esos dos hosts es lo que obliga a la forma rara del color de aquí:
 * `var(--token, <literal de siempre>)`.
 *
 *   · Dentro del panel (AdminPageForm) esto vive bajo `.tc-admin`, el token
 *     resuelve y los controles siguen al tema. Sin esto, el panel de Layout
 *     entero se pintaba en blanco sobre crema en tema claro — invisible.
 *   · Flotando sobre la web pública (BlockToolbar) NO hay `.tc-admin`, el
 *     token no existe y cae al literal: exactamente lo de hoy, píxel a píxel.
 *
 * Por eso este archivo queda fuera del guardián de tokens y por eso los
 * literales que ves no son deuda: son la rama pública del fallback. Cambiar
 * uno cambia cómo se ve la barra flotante encima de la web de la clienta.
 */

const CHIP = 'px-2.5 py-1.5 rounded text-[11px] leading-none transition-colors cursor-pointer';

export function Choice<T extends string>({ label, value, options, onChange, note }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  /** Replaces the selected option's own hint when the context changes it. */
  note?: string;
}) {
  const active = options.find(o => o.value === value);
  return (
    <div>
      <p className="text-[var(--fg-muted,#666)] text-[10px] tracking-[0.14em] uppercase mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            title={o.hint}
            className={`${CHIP} ${
              o.value === value
                ? 'bg-[var(--fg,#fff)] text-[var(--canvas,#000)] font-medium'
                : 'bg-[var(--surface-3,#ffffff0d)] text-[var(--fg-muted,#ffffff99)] hover:bg-[var(--surface-2,#ffffff1a)] hover:text-[var(--fg,#fff)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {(note ?? active?.hint) && (
        <p className="text-[var(--fg-faint,#555)] text-[10px] mt-1.5 leading-relaxed">{note ?? active?.hint}</p>
      )}
    </div>
  );
}

/** Twelfths of a row, drawn — the one choice that is genuinely about shape. */
const SPAN_BARS: Record<BlockSpan, number[]> = {
  full: [12], 'two-thirds': [8, 4], half: [6, 6], third: [4, 4, 4],
};

function SpanPicker({ value, onChange }: { value: BlockSpan; onChange: (v: BlockSpan) => void }) {
  return (
    <div>
      <p className="text-[var(--fg-muted,#666)] text-[10px] tracking-[0.14em] uppercase mb-1.5">Room on the row</p>
      <div className="grid grid-cols-4 gap-1">
        {SPAN_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            title={o.hint}
            aria-pressed={o.value === value}
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              o.value === value
                ? 'border-[var(--fg-muted,#ffffffb3)] bg-[var(--surface-3,#ffffff1a)]'
                : 'border-[var(--line,#ffffff1a)] bg-[var(--surface-1,#ffffff08)] hover:border-[var(--line-strong,#ffffff4d)]'
            }`}
          >
            <span className="flex gap-0.5 h-3 items-stretch">
              {SPAN_BARS[o.value].map((twelfths, i) => (
                <span
                  key={i}
                  style={{ flexGrow: twelfths }}
                  className={i === 0
                    ? o.value === value ? 'bg-[var(--fg,#fff)] rounded-sm' : 'bg-[var(--fg-muted,#ffffff80)] rounded-sm'
                    : 'bg-[var(--line-strong,#ffffff1f)] rounded-sm'}
                />
              ))}
            </span>
            <span className="block text-[9px] mt-1 text-[var(--fg-muted,#ffffff80)] leading-none truncate">{o.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[var(--fg-faint,#555)] text-[10px] mt-1.5 leading-relaxed">
        {SPAN_OPTIONS.find(o => o.value === value)?.hint}
      </p>
    </div>
  );
}

export default function BlockLayoutControls({ style, onStyle }: {
  style: BlockStyle | undefined;
  onStyle: (next: BlockStyle) => void;
}) {
  const s = { ...DEFAULT_BLOCK_STYLE, ...style };
  const span = spanOf(style);
  const shared = span !== 'full';
  const set = (patch: Partial<BlockStyle>) => onStyle({ ...style, ...patch });

  return (
    <div className="space-y-4">
      <SpanPicker value={span} onChange={v => set({ span: v })} />
      {/* Width and Spacing stay usable on a shared row, because they still do
          something there — they set the measure and the air for the whole row.
          Greying them out and saying they do not apply was a lie: rowLayout
          reads both from the first block of the row either way, so she would
          have seen a change she had just been told was impossible. */}
      <Choice
        label="Width" value={s.width} options={WIDTH_OPTIONS}
        onChange={v => set({ width: v })}
        note={shared ? 'On the first block of a row, this is the measure of the whole row.' : undefined}
      />
      <Choice label="Align"    value={s.align}   options={ALIGN_OPTIONS}   onChange={v => set({ align: v })} />
      <Choice label="Spacing"  value={s.spacing} options={SPACING_OPTIONS} onChange={v => set({ spacing: v })}
        note={shared ? 'On the first block of a row, this is the air around the whole row.' : undefined} />
      <Choice label="Surface"  value={s.surface} options={SURFACE_OPTIONS} onChange={v => set({ surface: v })} />
      <Choice label="Entrance" value={s.reveal}  options={REVEAL_OPTIONS}  onChange={v => set({ reveal: v })} />
    </div>
  );
}
