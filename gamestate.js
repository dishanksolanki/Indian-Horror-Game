// gameState.js — tiny shared state for cross-room puzzle flags.
// Kept deliberately minimal: a plain object that room modules import and
// read/write directly. No inventory UI exists yet in this project, so this
// is just enough to let room17's hammer unlock room16's planked door.
export const gameState = {
  hasHammer: false,
};
