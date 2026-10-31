import { useState } from 'react';
import { themes, type Theme } from '../engine';
import { bubbleFileName, renderBubbleSvg } from '../react/renderSvg';
import type { KernedFont } from '../wordmark/fonts';
import { downloadSvg } from './download';
import { groundName, homeGround, otherGround } from './grounds';
import { LockupPreviews } from './LockupPreviews';
import { LargePreviews, SizeRow } from './Previews';
import { SlotPreviews } from './SlotPreviews';
import { AvatarCrops, ForcedDetailGrid } from './StepPreviews';
import { themeLabels, TopicBar, TopicSection, type Topic } from './TopicLayout';

const home = { grounds: homeGround, label: (theme: Theme) => themeLabels[theme] } as const;

/**
 * The page's topics, each shown as its light and dark columns. Every topic
 * but the last shows a theme only on the ground it is drawn for; the last
 * puts each on the other one, to check nothing breaks when it lands there.
 */
function studioTopics(lettering: string, font: KernedFont): Topic[] {
  return [
    {
      id: 'large',
      nav: 'Large',
      title: 'Large, beside the reference',
      ...home,
      render: (theme, ground) => <LargePreviews theme={theme} ground={ground} lettering={lettering} />,
    },
    {
      id: 'sizes',
      nav: 'Real sizes',
      title: 'At real sizes, with the step each size gets',
      ...home,
      render: (theme, ground) => <SizeRow theme={theme} ground={ground} lettering={lettering} />,
    },
    {
      id: 'steps',
      nav: 'Every step',
      title: 'Every step at every size',
      ...home,
      render: (theme, ground) => <ForcedDetailGrid theme={theme} ground={ground} lettering={lettering} />,
    },
    {
      id: 'crops',
      nav: 'Circle crops',
      title: 'Cropped to a circle, as GitHub shows people’s avatars',
      ...home,
      render: (theme, ground) => <AvatarCrops theme={theme} ground={ground} lettering={lettering} />,
    },
    {
      id: 'lockup',
      nav: 'Lockup',
      title: 'Lockup',
      ...home,
      render: (theme) => <LockupPreviews theme={theme} font={font} lettering={lettering} />,
    },
    {
      id: 'slots',
      nav: 'Where it lands',
      title: 'Where the logo lands',
      note: 'Each slot’s image in the column of the theme it is made in, at the sizes it is seen.',
      ...home,
      render: (theme, ground) => <SlotPreviews theme={theme} ground={ground} lettering={lettering} font={font} />,
    },
    {
      id: 'mismatch',
      nav: 'Mismatch check',
      title: 'Mismatch check: each theme on the other background',
      note: 'Not the pairing being judged: each theme’s drawing where it isn’t meant to land, to see that nothing breaks.',
      apart: true,
      grounds: otherGround,
      label: (theme) => `${themeLabels[theme]} theme, on ${groundName(otherGround[theme])}`,
      render: (theme, ground) => (
        <div className="space-y-6">
          <LargePreviews theme={theme} ground={ground} lettering={lettering} />
          <SizeRow theme={theme} ground={ground} lettering={lettering} />
          <ForcedDetailGrid theme={theme} ground={ground} lettering={lettering} />
        </div>
      ),
    },
  ];
}

/** The studio once its fonts are in: the downloads, the topic bar, and every topic. */
export function StudioPage({ lettering, font }: { lettering: string; font: KernedFont }) {
  const [shown, setShown] = useState<Theme>('light');
  const topics = studioTopics(lettering, font);
  return (
    <>
      <TopicBar topics={topics} shown={shown} onShow={setShown} />
      <main className="space-y-10 p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">Download SVG</span>
          {themes.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => downloadSvg(bubbleFileName(theme), renderBubbleSvg(theme, lettering))}
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              {themeLabels[theme]}
            </button>
          ))}
        </div>
        {topics.map((topic) => (
          <TopicSection key={topic.id} topic={topic} shown={shown} />
        ))}
      </main>
    </>
  );
}
