const DIRECTIONS = ['north', 'east', 'south', 'west'];
const STICKS = ['go', 'stay'];
const CLOSE_VIEWS = ['table', 'window'];

export const createFortuneRoom = () => ({
  view: 'north',
  direction: 'north',
  cylinder: 'table',
  sticks: { go: 'table', stay: 'side' },
  panelOpen: false,
  baffleRemoved: false,
  goDrawn: false,
  receiptOffered: false,
  receiptTaken: false,
});

const result = (state, event = null) => ({ state, event });
const stickAt = (state, place) => STICKS.find((stick) => state.sticks[stick] === place);
const cylinderReachable = (state) => CLOSE_VIEWS.includes(state.view) && state.cylinder === state.view;
const panelReachable = (state) => state.view === 'window' && state.cylinder === 'window';
const facingLu = (state) => state.view === 'north' || state.view === 'table';
const moveStick = (state, stick, place, extra = {}) => ({
  ...state,
  ...extra,
  sticks: { ...state.sticks, [stick]: place },
});
const cylinderBlocked = (state) => result(state, state.cylinder === 'hand' ? 'cylinder-held' : 'out-of-reach');

/** Pure room actions; inventory positions belong to the cylinder or the room, never the camera. */
export function reduceFortuneRoom(state, action) {
  const type = action?.type;
  if (type === 'reset') return result(createFortuneRoom());

  if (type === 'look') {
    const { view } = action;
    if (view === state.view) return result(state);
    if (DIRECTIONS.includes(view)) return result({ ...state, view, direction: view });
    if (view === 'ceiling') return result({ ...state, view });
    if ((view === 'table' && state.view === 'north') || (view === 'window' && state.view === 'east')) {
      return result({ ...state, view });
    }
    return result(state);
  }

  if (type === 'turn') {
    if (action.delta !== 1 && action.delta !== -1) return result(state);
    const direction = DIRECTIONS[(DIRECTIONS.indexOf(state.direction) + action.delta + 4) % 4];
    return result({ ...state, view: direction, direction });
  }

  if (type === 'back') {
    return state.view === state.direction ? result(state) : result({ ...state, view: state.direction });
  }

  if (type === 'takeCylinder') {
    if (!cylinderReachable(state)) return cylinderBlocked(state);
    return result({ ...state, cylinder: 'hand' }, 'cylinder-taken');
  }

  if (type === 'placeCylinder') {
    if (action.place !== undefined && !CLOSE_VIEWS.includes(action.place)) return result(state);
    if (state.cylinder !== 'hand') return result(state, 'nothing-held');
    if (!CLOSE_VIEWS.includes(state.view)) return result(state, 'out-of-reach');
    if (action.place !== undefined && action.place !== state.view) return result(state, 'invalid-route');
    return result({ ...state, cylinder: state.view }, `cylinder-placed-${state.view}`);
  }

  if (type === 'takeStick') {
    const { stick } = action;
    if (!STICKS.includes(stick)) return result(state);
    const place = state.sticks[stick];
    if (place === 'hand') return result(state);
    if (stickAt(state, 'hand')) return result(state, 'hand-occupied');
    if (place === 'table' && state.view !== 'table') return result(state, 'out-of-reach');
    if (['main', 'outlet'].includes(place) && !cylinderReachable(state)) return cylinderBlocked(state);
    if (place === 'side') {
      if (!panelReachable(state)) return cylinderBlocked(state);
      if (!state.panelOpen) return result(state, 'panel-closed');
    }
    const drawn = stick === 'go' && place === 'outlet';
    return result(moveStick(state, stick, 'hand', drawn ? { goDrawn: true } : {}), drawn ? 'go-drawn' : `${stick}-taken`);
  }

  if (type === 'insertStick' || type === 'putStick') {
    if (action.stick !== undefined && !STICKS.includes(action.stick)) return result(state);
    const stick = stickAt(state, 'hand');
    if (!stick) return result(state, 'nothing-held');
    if (action.stick !== undefined && action.stick !== stick) return result(state, 'invalid-route');
    if (type === 'putStick') {
      if (state.view !== 'table') return result(state, 'out-of-reach');
      return result(moveStick(state, stick, 'table'), `${stick}-put`);
    }
    if (!cylinderReachable(state)) return cylinderBlocked(state);
    if (stickAt(state, 'main')) return result(state, 'main-occupied');
    return result(moveStick(state, stick, 'main', stick === 'go' ? { goDrawn: false } : {}), `${stick}-inserted`);
  }

  if (type === 'returnStay') {
    if (!panelReachable(state)) return cylinderBlocked(state);
    if (!state.panelOpen) return result(state, 'panel-closed');
    if (stickAt(state, 'side')) return result(state, 'side-occupied');
    if (state.sticks.stay !== 'hand') return result(state, 'nothing-held');
    return result(moveStick(state, 'stay', 'side'), 'stay-returned');
  }

  if (type === 'shake') {
    if (!cylinderReachable(state)) return cylinderBlocked(state);
    if (stickAt(state, 'outlet')) return result(state, 'outlet-occupied');
    const stick = stickAt(state, state.baffleRemoved ? 'main' : 'side');
    if (!stick) return result(state, 'shake-empty');
    return result(moveStick(state, stick, 'outlet'), `shaken-${stick}`);
  }

  if (type === 'togglePanel' || type === 'removeBaffle' || type === 'restoreBaffle') {
    if (!panelReachable(state)) return cylinderBlocked(state);
    if (type === 'togglePanel') {
      return result({ ...state, panelOpen: !state.panelOpen }, state.panelOpen ? 'panel-closed' : 'panel-opened');
    }
    if (!state.panelOpen) return result(state, 'panel-closed');
    const baffleRemoved = type === 'removeBaffle';
    const event = baffleRemoved ? 'baffle-removed' : 'baffle-restored';
    return result(state.baffleRemoved === baffleRemoved ? state : { ...state, baffleRemoved }, event);
  }

  if (type === 'showLot') {
    if (!facingLu(state)) return result(state, 'out-of-reach');
    if (state.sticks.go !== 'hand' || !state.goDrawn) return result(state, 'lot-unproven');
    return result(state.receiptOffered ? state : { ...state, receiptOffered: true }, 'receipt-offered');
  }

  if (type === 'takeReceipt') {
    if (!facingLu(state)) return result(state, 'out-of-reach');
    if (state.receiptTaken) return result(state, 'receipt-held');
    if (!state.receiptOffered) return result(state, 'lot-unproven');
    return result({ ...state, receiptTaken: true }, 'receipt-taken');
  }

  if (type === 'depart') {
    return result(state, state.view === 'south' && state.receiptTaken ? 'departed' : 'departure-blocked');
  }

  return result(state);
}
