/** All user-facing text lives here so the tone stays consistent. See docs/DESIGN.md. */
export const copy = {
  emptyTitle: 'Nothing to cut yet',
  emptyBody: 'Add the boards you have and the parts you need. The arithmetic is on us.',
  loadExample: 'Show me an example',
  exampleLoaded: 'Example loaded — a sturdy little workbench.',

  stockHint: 'boards you have',
  partsHint: 'what you need',
  kerfHint: 'Blade width. 3 mm suits most table saws; thin-kerf blades are closer to 2.4 mm.',
  planingToggle: 'Rough-cut into planing blanks first',
  planingHint:
    'Parts are grouped into blanks no longer than the planing length. Trim covers snipe and the squaring cut at each end.',

  stepRough: 'Rough cut',
  stepPlane: 'Plane, then cut blanks to parts',
  oversize: 'Longer than the planing length',
  offcut: 'offcut',

  boards: (n: number) => (n === 1 ? 'board' : 'boards'),
  wasteVerdict(pct: number): string {
    if (pct <= 2) return `Only ${pct}% waste. Your lumberyard will miss you.`;
    if (pct <= 8) return `${pct}% waste — tidy work.`;
    if (pct <= 20) return `${pct}% waste. Keep the offcuts; small boxes need wood too.`;
    return `${pct}% waste. Different stock lengths might fit better.`;
  },
  unplacedVerdict: (n: number) =>
    `${n} ${n === 1 ? 'part still needs' : 'parts still need'} a home — see below.`,
  tooLong: (part: string, length: string, longest: string) =>
    `${part} (${length}) is longer than your longest board (${longest}). Even a very good saw can't help here.`,
  outOfStock: (count: number, part: string) =>
    `Ran out of boards for ${count} × ${part}. Add more stock or raise a quantity.`,
  noStock: 'Add at least one board length to cut from.',
  kerfLarge: 'That kerf is over 20 mm. Chainsaw? (Check the units.)',
  planingTooShort: 'The planing length must be longer than both trims together.',

  removed: (what: string) => `Removed ${what}.`,
  undo: 'Undo',
  saved: 'Saved',
  linkCopied: "Link copied — send it to whoever's holding the other end of the board.",
  copyPrompt: 'Copy this link:',
  imported: (name: string) => `Opened “${name}”.`,
  importFailed: "That file doesn't look like a cutlist project.",
  confirmShared: (name: string) =>
    `Open the shared project “${name}”? It replaces what you have open now (export it first if you want to keep it).`,
  celebrate: 'Near-zero waste. Take a bow.',
  sketchOn: 'Sketch mode. Pencil behind the ear.',
  sketchOff: 'Back to the clean drawing.',

  tips: [
    'Measure twice, cut once.',
    'Cut the longest parts first — they’re the hardest to find later.',
    'Write the length on every offcut. Future you says thanks.',
    'Snipe happens. That’s what trim allowance is for.',
    'A sharp blade is a safe blade.',
    'Press ? for keyboard shortcuts.',
    'Rough lumber moves when it is cut. Let it rest before final dimensioning.',
  ],
} as const;
