import type { ReactNode } from 'react';
import { themes, type Theme } from '../engine';

interface TopicBase {
  /** The section's id, which the topic bar links to. */
  id: string;
  /** The topic bar's short name for it. */
  nav: string;
  title: string;
  note?: string;
  /** Set apart from the topics above it by a rule, as a check rather than a view. */
  apart?: boolean;
}

/** A topic shown in each theme's column, and on which ground. */
interface ColumnTopic extends TopicBase {
  /** Each column's panel colour. */
  grounds: Record<Theme, string>;
  /** Each column's sticky label. */
  label: (theme: Theme) => string;
  /** The column's contents: the theme's drawing, captioned for the panel's colour. */
  render: (theme: Theme, ground: string) => ReactNode;
}

/**
 * A topic whose items don't come in light and dark pairs (some slots exist
 * only on their fixed background), so splitting it into columns would leave
 * one looking empty: it takes the full width instead.
 */
interface FullTopic extends TopicBase {
  full: () => ReactNode;
}

export type Topic = ColumnTopic | FullTopic;

export const themeLabels: Record<Theme, string> = { light: 'Light', dark: 'Dark' };

/** The topic bar's height; the column labels stick just below it. */
const barHeight = 'h-12';
const belowBar = 'md:top-12';

/**
 * The bar that stays at the top while scrolling: a link to each topic and,
 * on a narrow window where the columns can't sit side by side, the Light /
 * Dark toggle that picks the one shown.
 */
export function TopicBar({
  topics,
  shown,
  onShow,
}: {
  topics: readonly Topic[];
  shown: Theme;
  onShow: (theme: Theme) => void;
}) {
  return (
    <div
      className={`sticky top-0 z-20 flex ${barHeight} items-center gap-4 border-b border-stone-200 bg-white/95 px-6 backdrop-blur`}
    >
      {/* Two toggle buttons rather than tabs: the columns they pick aren't tab panels, and plain buttons need no arrow-key wiring. */}
      <div role="group" aria-label="Theme shown" className="flex shrink-0 gap-1 rounded-lg bg-stone-200 p-1 md:hidden">
        {themes.map((theme) => (
          <button
            key={theme}
            type="button"
            aria-pressed={theme === shown}
            onClick={() => onShow(theme)}
            className={`rounded-md px-3 py-0.5 text-sm font-medium transition-colors ${
              theme === shown ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {themeLabels[theme]}
          </button>
        ))}
      </div>
      <nav aria-label="Topics" className="min-w-0 overflow-x-auto">
        <ul className="flex gap-4 text-sm whitespace-nowrap">
          {topics.map((topic) => (
            <li key={topic.id}>
              <a href={`#${topic.id}`} className="font-medium text-stone-600 hover:text-stone-900">
                {topic.nav}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/**
 * A topic as a Light column and a Dark column side by side, each on its
 * panel. A column scrolls sideways inside itself when its contents are wider
 * than half the page. On a narrow window only the toggled column shows.
 */
export function TopicSection({ topic, shown }: { topic: Topic; shown: Theme }) {
  return (
    <section
      id={topic.id}
      aria-labelledby={`${topic.id}-title`}
      className={`scroll-mt-16 space-y-3 ${topic.apart ? 'border-t-2 border-stone-300 pt-8' : ''}`}
    >
      <div>
        <h2 id={`${topic.id}-title`} className="text-base font-semibold">
          {topic.title}
        </h2>
        {topic.note && <p className="text-sm text-stone-600">{topic.note}</p>}
      </div>
      {'full' in topic ? (
        topic.full()
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {themes.map((theme) => (
            <div key={theme} data-theme={theme} className={`min-w-0 ${theme === shown ? '' : 'hidden md:block'}`}>
              <h3
                className={`z-10 bg-stone-100 py-1.5 text-xs font-semibold tracking-wide text-stone-600 uppercase md:sticky ${belowBar}`}
              >
                {topic.label(theme)}
              </h3>
              <div
                className="overflow-x-auto rounded-lg border border-stone-200 p-4"
                style={{ backgroundColor: topic.grounds[theme] }}
              >
                {topic.render(theme, topic.grounds[theme])}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
