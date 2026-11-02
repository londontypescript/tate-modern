import { useState } from 'react';
import { choiceClass } from './Choices';
import { downloadSvg } from './download';
import { downloadBlob, svgToPng } from './slotDownload';

type Format = 'svg' | 'png';

interface Props {
  /** The file as it is downloaded, drawn only when a button is pressed. */
  svg: () => string;
  /** The PNG's pixel size: the SVG's own canvas. */
  size: { width: number; height: number };
  /** The file's name in each format; given the SVG, so a name can carry a hash of the drawing. */
  fileName: (format: Format, svg: string) => string;
  /** Turns both buttons off, when there is nothing that can be drawn. */
  disabled?: boolean;
}

/**
 * The SVG and PNG download buttons. The PNG is the same SVG drawn by the
 * browser at the image's own size, so the two never differ.
 */
export function Downloads({ svg, size, fileName, disabled = false }: Props) {
  const [failure, setFailure] = useState<string>();
  // The browser can take several seconds over the first PNG, so the button says it is working.
  const [making, setMaking] = useState(false);
  const saveSvg = () => {
    const file = svg();
    downloadSvg(fileName('svg', file), file);
  };
  const savePng = () => {
    setFailure(undefined);
    setMaking(true);
    const file = svg();
    svgToPng(file, size)
      .then((png) => downloadBlob(fileName('png', file), png))
      .catch((error: unknown) => setFailure(error instanceof Error ? error.message : String(error)))
      .finally(() => setMaking(false));
  };
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-sm text-stone-600">Download</span>
        <button type="button" onClick={saveSvg} disabled={disabled} className={choiceClass(false)}>
          SVG
        </button>
        <button type="button" onClick={savePng} disabled={disabled || making} className={choiceClass(false)}>
          {making ? 'Making the PNG…' : 'PNG'}
        </button>
      </div>
      {failure && (
        <p role="alert" className="text-sm text-red-700">
          The PNG could not be made: {failure}
        </p>
      )}
    </>
  );
}
