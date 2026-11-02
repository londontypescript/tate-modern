const button = 'rounded-md border px-2.5 py-1 text-sm font-medium';

/** A toggle button's look: dark when pressed, plain otherwise, faded when it can't be pressed. */
export const choiceClass = (pressed: boolean) =>
  `${button} disabled:cursor-not-allowed disabled:opacity-40 ${pressed ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`;

/**
 * A named row of toggle buttons, one pressed. Plain buttons with
 * `aria-pressed` rather than radios: each choice applies at once, and they
 * need no arrow-key wiring.
 */
export function Choices<T extends string>({
  name,
  choices,
  labels,
  value,
  onChoose,
  disabled = false,
}: {
  name: string;
  choices: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChoose: (choice: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={name} className="flex items-center gap-1.5">
      <span className="mr-1 text-sm text-stone-600">{name}</span>
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={choice === value}
          disabled={disabled}
          onClick={() => onChoose(choice)}
          className={choiceClass(choice === value)}
        >
          {labels[choice]}
        </button>
      ))}
    </div>
  );
}
