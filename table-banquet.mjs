export const TABLE_LAYOUT = {
  guest: { x: 0.24, y: 0.27, rx: 0.18, ry: 0.19 },
  lu: { x: 0.76, y: 0.27, rx: 0.18, ry: 0.19 },
  stopped: { x: 0.61, y: 0.52 },
  bounds: { minX: 0.12, maxX: 0.88, minY: 0.17, maxY: 0.85 },
};

const ITEMS = new Set(['meal', 'self', 'stack']);
const VIEWS = new Set(['front', 'table']);
const TEA_TARGETS = new Set(['guest', 'lu']);

const finitePosition = (position) => (
  position !== null
  && typeof position === 'object'
  && Number.isFinite(position.x)
  && Number.isFinite(position.y)
);

const inEllipse = (position, seat) => {
  const dx = (position.x - seat.x) / seat.rx;
  const dy = (position.y - seat.y) / seat.ry;
  return dx * dx + dy * dy <= 1;
};

export function mealZone(position) {
  if (!finitePosition(position)) return 'neutral';
  if (inEllipse(position, TABLE_LAYOUT.guest)) return 'guest';
  if (inEllipse(position, TABLE_LAYOUT.lu)) return 'lu';
  return 'neutral';
}

export const createTableBanquet = () => ({
  view: 'front',
  positions: {
    meal: { x: 0.45, y: 0.64 },
    self: { x: 0.82, y: 0.38 },
    stack: { x: 0.15, y: 0.73 },
  },
  selected: null,
  lotDrawn: false,
  bitten: false,
  serving: false,
  paperFree: false,
  receiptTaken: false,
  teaTried: { guest: false, lu: false },
});

const result = (state, event = null) => ({ state, event });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizedPosition = (x, y) => ({
  x: clamp(x, TABLE_LAYOUT.bounds.minX, TABLE_LAYOUT.bounds.maxX),
  y: clamp(y, TABLE_LAYOUT.bounds.minY, TABLE_LAYOUT.bounds.maxY),
});

export function reduceTableBanquet(state, action) {
  const type = action?.type;

  if (type === 'reset') return result(createTableBanquet());

  if (type === 'look') {
    if (!VIEWS.has(action.view)) return result(state);
    return result({ ...state, view: action.view });
  }

  if (type === 'select') {
    if (!ITEMS.has(action.item)) return result(state);
    return result({ ...state, selected: action.item });
  }

  if (type === 'cancel') {
    if (state.selected === null) return result(state);
    return result({ ...state, selected: null });
  }

  if (type === 'drawLot') {
    return state.lotDrawn
      ? result(state, 'lot-already')
      : result({ ...state, lotDrawn: true }, 'lot-drawn');
  }

  if (type === 'pour') {
    if (!TEA_TARGETS.has(action.target)) return result(state);
    return result({
      ...state,
      teaTried: { ...state.teaTried, [action.target]: true },
    }, `tea-${action.target}`);
  }

  if (type === 'takeReceipt') {
    if (state.receiptTaken) return result(state, 'receipt-held');
    if (!state.paperFree) return result(state, 'paper-held');
    return result({ ...state, receiptTaken: true }, 'receipt-taken');
  }

  if (type !== 'move' || !ITEMS.has(action.item)) return result(state);
  if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) return result(state);

  const item = action.item;
  const position = normalizedPosition(action.x, action.y);
  let next = {
    ...state,
    positions: { ...state.positions, [item]: position },
    selected: null,
  };

  if (item !== 'meal') return result(next, 'object-moved');

  const zone = mealZone(position);
  if (zone === 'guest') {
    next = { ...next, bitten: true, serving: true };
    const event = state.serving ? 'bowl-moved' : state.bitten ? 'refed' : 'fed';
    return result(next, event);
  }

  if (zone === 'lu') {
    next = {
      ...next,
      positions: { ...next.positions, meal: { ...TABLE_LAYOUT.stopped } },
      serving: false,
      paperFree: true,
    };
    return result(next, 'intercepted');
  }

  next = { ...next, serving: false };
  return result(next, state.serving ? 'stopped' : 'bowl-moved');
}
