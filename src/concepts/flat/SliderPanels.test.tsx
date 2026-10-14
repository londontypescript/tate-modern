import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { elements } from './components/svgParse';
import { controlGroups } from './controls';
import { defaultLogoConfig, type LogoConfig } from './engine';
import { SliderPanels } from './SliderPanels';
import { withLeaf } from './testing/numericLeaves';

/** The value each slider is set to, by label, read from the markup the studio renders. */
function sliderValues(config: LogoConfig): number[] {
  const html = renderToStaticMarkup(createElement(SliderPanels, { config, setConfig: () => undefined }));
  expect(html, 'shown values').not.toMatch(/NaN|Infinity/);
  return elements(html, 'input').map((input) => Number(input.value));
}

describe('the flat sliders with a saved configuration holding bad numbers', () => {
  const labels = controlGroups.flatMap((g) => g.controls.map((c) => c.label));
  const at = (label: string) => labels.indexOf(label);

  it('show the values drawn, not the saved ones', () => {
    let saved = withLeaf(['emblem', 'layerCount'], 6.9);
    saved = withLeaf(['tile', 'textScale'], JSON.parse('1e400'), saved);
    saved = withLeaf(['animation', 'speed'], 1e308, saved);
    const values = sliderValues(saved);
    expect(values[at('Number of layers')]).toBe(7);
    expect(values[at('Letter size')]).toBe(defaultLogoConfig.tile.textScale);
    expect(values[at('Speed')]).toBe(5);
  });

  it('show a configuration made with the sliders as it is', () => {
    const values = sliderValues(defaultLogoConfig);
    expect(values).toEqual(controlGroups.flatMap((g) => g.controls.map((c) => c.get(defaultLogoConfig))));
  });
});
