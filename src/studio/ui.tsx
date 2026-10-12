import type { ReactNode } from 'react';

// Small Tailwind building blocks for the studio UI.

/** The range and label of a numeric slider. */
export interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

/** A numeric control bound to one field of a concept's configuration. */
export interface SliderControl<T> extends SliderSpec {
  get: (config: T) => number;
  set: (config: T, value: number) => T;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-stone-700">{title}</h2>
      {children}
    </section>
  );
}

export function Slider({
  control,
  value,
  onChange,
}: {
  control: SliderSpec;
  value: number;
  onChange: (value: number) => void;
}) {
  const decimals = Math.max(0, -Math.floor(Math.log10(control.step)));
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-stone-600">
        <span>{control.label}</span>
        <span className="font-mono tabular-nums">
          {value.toFixed(decimals)}
          {control.unit}
        </span>
      </span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-blue-600"
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-600"
      />
      {label}
    </label>
  );
}

export function Button({
  onClick,
  primary = false,
  danger = false,
  small = false,
  disabled = false,
  type = 'button',
  children,
}: {
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  small?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${
        primary
          ? 'bg-blue-600 text-white enabled:hover:bg-blue-700'
          : danger
            ? 'border border-red-200 bg-white text-red-700 enabled:hover:bg-red-50'
            : 'border border-stone-300 bg-white text-stone-800 enabled:hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="mt-3 flex items-center justify-between gap-2 text-sm text-stone-700">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColourInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3 flex items-center justify-between gap-2 text-sm text-stone-700">
      {label}
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-stone-500">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-stone-300 bg-white"
        />
      </span>
    </label>
  );
}
