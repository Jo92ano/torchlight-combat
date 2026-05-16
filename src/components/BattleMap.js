import React, { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================
// CONSTANTS
// ============================================================
const CELL_SIZE = 40;
const COLS = 50;
const ROWS = 50;

// ============================================================
// TERRAIN DEFINITIONS
// ============================================================
const TERRAIN_TYPES = {
  empty:     { color: 'transparent', label: '',          effect: null },
  high:      { color: '#8B6914AA',   label: 'High',      effect: 'high_ground' },
  low:       { color: '#1a3a5cAA',   label: 'Low',       effect: 'low_ground' },
  difficult: { color: '#2d5a1bAA',   label: 'Difficult', effect: 'difficult' },
  hazard:    { color: '#8B1a1aAA',   label: 'Hazard',    effect: 'hazard' },
  wall:      { color: '#444444FF',   label: 'Wall',      effect: 'impassable' },
};

// ============================================================
// OBSTACLE DEFINITIONS
// ============================================================
const OBSTACLE_TYPES = [
  // --- Terrain objects ---
  { id: 'tree',           label: 'Tree',          icon: '🌲', blocks: true  },
  { id: 'boulder',        label: 'Boulder',       icon: '🪨', blocks: true  },
  { id: 'pillar',         label: 'Pillar',        icon: '🏛️', blocks: true  },
  { id: 'barrel',         label: 'Barrel',        icon: '🛢️', blocks: false },
  { id: 'fire',           label: 'Fire',          icon: '🔥', blocks: false },
  { id: 'water',          label: 'Water',         icon: '🌊', blocks: false },
  // --- Doors & Passages ---
  { id: 'door_open',      label: 'Door (open)',   icon: '🚪', blocks: false },
  { id: 'door_locked',    label: 'Door (locked)', icon: '🔒', blocks: true  },
  { id: 'door_barricade', label: 'Barricaded',    icon: '🚧', blocks: true  },
  { id: 'hole',           label: 'Hole/Passage',  icon: '🕳️', blocks: false },
  { id: 'ladder',         label: 'Ladder/Hatch',  icon: '🪜', blocks: false },
  { id: 'door_hidden',    label: 'Hidden door',   icon: '🚪', blocks: true  },
  { id: 'door_secret',    label: 'Secret door',   icon: '🔍', blocks: false },
  // --- Windows ---
  { id: 'window',         label: 'Window',        icon: '🪟', blocks: true  },
  { id: 'window_open',    label: 'Window (open)', icon: '🔓', blocks: false },
  // --- Light Sources ---
  { id: 'candle',         label: 'Candle',        icon: '🕯️', blocks: false },
  { id: 'lantern',        label: 'Lantern',       icon: '🔦', blocks: false },
  { id: 'torch',          label: 'Wall Torch',    icon: '🪔', blocks: false },
  { id: 'magic_light',    label: 'Magic Light',   icon: '⭐', blocks: false },
  { id: 'darkness',       label: 'Darkness',      icon: '🌑', blocks: false },
  // --- Furniture & Cover ---
  { id: 'chair',          label: 'Chair',         icon: '🪑', blocks: false },
  { id: 'bed',            label: 'Bed',           icon: '🛏️', blocks: false },
  { id: 'mirror',         label: 'Mirror',        icon: '🪞', blocks: false },
  { id: 'bookshelf',      label: 'Bookshelf',     icon: '📚', blocks: true  },
  { id: 'weapon_rack',    label: 'Weapon Rack',   icon: '🗡️', blocks: false },
  { id: 'alchemy',        label: 'Alchemy Table', icon: '⚗️', blocks: false },
  // --- Interactables ---
  { id: 'chest',          label: 'Chest',         icon: '📦', blocks: false },
  { id: 'chest_open',     label: 'Opened Chest',  icon: '🗃️', blocks: false },
  // --- Traps & Hazards ---
  { id: 'trap',           label: 'Trap',          icon: '⚠️', blocks: false },
  { id: 'trap_hidden',    label: 'Hidden Trap',   icon: '🔴', blocks: false },
  { id: 'web',            label: 'Web',           icon: '🕸️', blocks: false },
  { id: 'poison_vent',    label: 'Poison Vent',   icon: '☠️', blocks: false },
  { id: 'rune_trap',      label: 'Rune Trap',     icon: '⚡', blocks: false },
];

// ============================================================
// PROCEDURAL MAP GENERATORS
// ============================================================
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance  = (percent)  => Math.random() * 100 < percent;
const emptyTerrain = () => Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'));
const placeObstacle = (obstacles, row, col, type) => {
  obstacles.push({ id: Date.now() + Math.random(), row, col, type });
};

// ---- TAVERN ----
const generateTavern = () => {
  const terrain = emptyTerrain();
  const obstacles = [];

  for (let r = 0; r < 14; r++)
    for (let c = 0; c < 14; c++)
      if (r === 0 || r === 13 || c === 0 || c === 13) terrain[r][c] = 'wall';

  for (let c = 2; c <= 8; c++) terrain[2][c] = 'wall';
  for (let c = 9; c <= 12; c++) terrain[4][c] = 'wall';
  for (let r = 1; r <= 4; r++) terrain[r][9] = 'wall';
  terrain[2][9] = 'empty';
  terrain[13][6] = 'empty';

  placeObstacle(obstacles, 13, 6, 'door_open');
  placeObstacle(obstacles, 2, 9, 'door_locked');
  placeObstacle(obstacles, 0, 3, 'window');
  placeObstacle(obstacles, 0, 10, 'window');
  placeObstacle(obstacles, 13, 3, 'window');

  const tableSpots = [[5,2],[5,5],[5,8],[8,2],[8,5],[8,8],[11,3],[11,7]];
  tableSpots.forEach(([r, c]) => {
    if (chance(80)) {
      placeObstacle(obstacles, r, c, 'barrel');
      if (chance(60)) placeObstacle(obstacles, r+1, c, 'chair');
    }
  });

  placeObstacle(obstacles, 3, 10, 'barrel');
  placeObstacle(obstacles, 3, 11, 'barrel');
  placeObstacle(obstacles, 2, 11, 'chest');
  if (chance(50)) placeObstacle(obstacles, 3, 11, 'alchemy');
  placeObstacle(obstacles, 1, 1,   'torch');
  placeObstacle(obstacles, 1, 12,  'torch');
  placeObstacle(obstacles, 7, 12,  'fire');
  placeObstacle(obstacles, 12, 1,  'lantern');
  placeObstacle(obstacles, 12, 12, 'lantern');
  placeObstacle(obstacles, 1, 11,  'bookshelf');

  return { terrain, obstacles };
};

// ---- CAVE ----
const generateCave = () => {
  const terrain = emptyTerrain();
  const obstacles = [];

  for (let r = 0; r < 18; r++) {
    for (let c = 0; c < 18; c++) {
      const dist = Math.min(r, c, 17 - r, 17 - c);
      if (dist === 0) terrain[r][c] = 'wall';
      else if (dist === 1 && chance(60)) terrain[r][c] = 'wall';
      else if (dist === 2 && chance(25)) terrain[r][c] = 'wall';
    }
  }

  [[4,12],[10,5],[14,13]].forEach(([pr, pc]) => {
    for (let r = pr - 1; r <= pr + 1; r++)
      for (let c = pc - 1; c <= pc + 1; c++)
        if (r > 0 && r < ROWS && c > 0 && c < COLS && terrain[r][c] !== 'wall')
          if (chance(70)) terrain[r][c] = 'low';
  });

  for (let r = 3; r < 15; r++)
    for (let c = 3; c < 15; c++)
      if (terrain[r][c] === 'empty' && chance(20)) terrain[r][c] = 'difficult';

  for (let i = 0; i < 8; i++) {
    const r = randInt(2, 16);
    const c = randInt(2, 16);
    if (terrain[r][c] === 'empty') placeObstacle(obstacles, r, c, 'boulder');
  }

  for (let i = 0; i < 3; i++)
    placeObstacle(obstacles, randInt(1, 4), randInt(1, 4), 'web');

  for (let i = 0; i < 3; i++)
    placeObstacle(obstacles, randInt(3, 15), randInt(3, 15), 'trap_hidden');

  if (chance(50)) placeObstacle(obstacles, randInt(5, 12), randInt(5, 12), 'poison_vent');
  if (chance(40)) placeObstacle(obstacles, randInt(5, 12), randInt(5, 12), 'rune_trap');

  for (let i = 0; i < 4; i++)
    placeObstacle(obstacles, randInt(2, 16), randInt(2, 16), 'torch');

  placeObstacle(obstacles, randInt(12, 16), randInt(12, 16), 'chest');
  placeObstacle(obstacles, randInt(1, 3), randInt(1, 3), 'ladder');

  return { terrain, obstacles };
};

// ---- FOREST ----
const generateForest = () => {
  const terrain = emptyTerrain();
  const obstacles = [];

  for (let r = 0; r < 18; r++) {
    for (let c = 0; c < 18; c++) {
      const dist = Math.min(r, c, 17 - r, 17 - c);
      if (dist <= 1) {
        terrain[r][c] = 'wall';
        if (chance(60)) placeObstacle(obstacles, r, c, 'tree');
      } else if (dist === 2 && chance(40)) {
        terrain[r][c] = 'difficult';
        if (chance(50)) placeObstacle(obstacles, r, c, 'tree');
      }
    }
  }

  for (let i = 0; i < 6; i++) {
    const r = randInt(3, 14);
    const c = randInt(3, 14);
    if (terrain[r][c] === 'empty') {
      terrain[r][c] = 'difficult';
      placeObstacle(obstacles, r, c, 'tree');
    }
  }

  for (let r = 3; r < 15; r++)
    for (let c = 3; c < 15; c++)
      if (terrain[r][c] === 'empty' && chance(15)) terrain[r][c] = 'difficult';

  for (let i = 0; i < 3; i++) {
    const r = randInt(3, 14);
    const c = randInt(3, 14);
    if (terrain[r][c] !== 'wall') placeObstacle(obstacles, r, c, 'web');
  }

  for (let i = 0; i < 3; i++) {
    const r = randInt(4, 13);
    const c = randInt(4, 13);
    if (terrain[r][c] === 'empty') placeObstacle(obstacles, r, c, 'trap_hidden');
  }

  if (chance(60)) placeObstacle(obstacles, 8, 8, 'fire');
  if (chance(50)) placeObstacle(obstacles, randInt(2, 5), randInt(2, 5), 'chest');

  return { terrain, obstacles };
};

// ---- DUNGEON ----
const generateDungeon = () => {
  const terrain = emptyTerrain();
  const obstacles = [];

  for (let r = 0; r < 14; r++)
    for (let c = 0; c < 14; c++)
      if (r === 0 || r === 13 || c === 0 || c === 13) terrain[r][c] = 'wall';

  terrain[0][6]  = 'empty';
  terrain[13][6] = 'empty';
  terrain[6][0]  = 'empty';
  terrain[6][13] = 'empty';

  placeObstacle(obstacles, 0,  6, chance(50) ? 'door_open' : 'door_locked');
  placeObstacle(obstacles, 13, 6, 'door_open');
  placeObstacle(obstacles, 6,  0, chance(50) ? 'door_barricade' : 'door_open');

  [[2,2],[2,11],[11,2],[11,11]].forEach(([r, c]) => {
    terrain[r][c] = 'wall';
    placeObstacle(obstacles, r, c, 'pillar');
  });

  placeObstacle(obstacles, 0,  3,  'torch');
  placeObstacle(obstacles, 0,  10, 'torch');
  placeObstacle(obstacles, 13, 3,  'torch');
  placeObstacle(obstacles, 13, 10, 'torch');

  if (chance(60)) placeObstacle(obstacles, randInt(2, 4), randInt(2, 4), 'weapon_rack');
  if (chance(40)) placeObstacle(obstacles, randInt(2, 4), randInt(9, 11), 'bookshelf');

  for (let i = 0; i < randInt(1, 3); i++)
    placeObstacle(obstacles, randInt(3, 10), randInt(3, 10), chance(50) ? 'trap' : 'trap_hidden');

  if (chance(40)) placeObstacle(obstacles, randInt(5, 8), randInt(5, 8), 'rune_trap');
  placeObstacle(obstacles, randInt(9, 11), randInt(9, 11), 'chest');

  const side = randInt(0, 3);
  if (side === 0) placeObstacle(obstacles, 0,  randInt(2, 11), 'door_hidden');
  if (side === 1) placeObstacle(obstacles, 13, randInt(2, 11), 'door_hidden');
  if (side === 2) placeObstacle(obstacles, randInt(2, 11), 0,  'door_hidden');
  if (side === 3) placeObstacle(obstacles, randInt(2, 11), 13, 'door_hidden');

  if (chance(30)) terrain[randInt(4,8)][randInt(4,8)] = 'hazard';

  return { terrain, obstacles };
};

// ---- TOWN SQUARE ----
const generateTownSquare = () => {
  const terrain = emptyTerrain();
  const obstacles = [];

  for (let c = 0; c < 20; c++) { terrain[9][c] = 'empty'; terrain[10][c] = 'empty'; }
  for (let r = 0; r < 20; r++) { terrain[r][9] = 'empty'; terrain[r][10] = 'empty'; }

  const buildings = [
    { r1:1,  c1:1,  r2:7,  c2:7  },
    { r1:1,  c1:12, r2:7,  c2:18 },
    { r1:12, c1:1,  r2:18, c2:7  },
    { r1:12, c1:12, r2:18, c2:18 },
  ];

  buildings.forEach(({ r1, c1, r2, c2 }) => {
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++)
        if (r === r1 || r === r2 || c === c1 || c === c2) terrain[r][c] = 'wall';

    const midC = Math.floor((c1 + c2) / 2);
    terrain[r2][midC] = 'empty';
    placeObstacle(obstacles, r2, midC, 'door_open');
    placeObstacle(obstacles, r1, c1 + 1, 'window');
    placeObstacle(obstacles, r1, c2 - 1, 'window');
    placeObstacle(obstacles, r1+2, c1+2, 'bookshelf');
    if (chance(50)) placeObstacle(obstacles, r2-2, c2-2, 'chest');
  });

  placeObstacle(obstacles, 9, 9, 'barrel');

  [[4,8],[4,11],[15,8],[15,11],[8,4],[11,4],[8,15],[11,15]].forEach(([r,c]) => {
    placeObstacle(obstacles, r, c, 'lantern');
  });

  [[3,9],[3,11],[16,9],[16,11],[9,3],[11,3]].forEach(([r,c]) => {
    if (chance(70)) placeObstacle(obstacles, r, c, 'barrel');
  });

  [[2,8],[5,8],[2,11],[5,11],[14,8],[17,8],[14,11],[17,11]].forEach(([r,c]) => {
    if (chance(60)) placeObstacle(obstacles, r, c, 'tree');
  });

  if (chance(40)) placeObstacle(obstacles, randInt(3,7), randInt(3,7), 'trap_hidden');

  return { terrain, obstacles };
};

// ---- BANDIT CAMP ----
const generateBanditCamp = () => {
  const terrain = emptyTerrain();
  const obstacles = [];

  for (let r = 0; r < 18; r++) {
    for (let c = 0; c < 18; c++) {
      const dist = Math.min(r, c, 17-r, 17-c);
      if (dist <= 1 && chance(50)) {
        terrain[r][c] = 'difficult';
        placeObstacle(obstacles, r, c, 'tree');
      }
    }
  }

  [[5,5],[5,12],[12,5],[12,12],[8,8]].forEach(([r,c]) => {
    if (chance(70)) placeObstacle(obstacles, r, c, 'fire');
  });

  [[3,8],[3,10],[14,8],[14,10]].forEach(([r,c]) => {
    if (chance(60)) placeObstacle(obstacles, r, c, 'lantern');
  });

  for (let i = 0; i < 6; i++) {
    const r = randInt(3, 15);
    const c = randInt(3, 15);
    if (terrain[r][c] === 'empty') placeObstacle(obstacles, r, c, 'barrel');
  }

  if (chance(70)) placeObstacle(obstacles, randInt(4,8), randInt(4,8), 'weapon_rack');
  placeObstacle(obstacles, randInt(2,5), randInt(2,5), 'chest');
  if (chance(40)) placeObstacle(obstacles, randInt(2,5), randInt(2,5), 'chest_open');

  for (let i = 0; i < 4; i++)
    placeObstacle(obstacles, randInt(2, 16), randInt(2, 16), 'trap_hidden');

  placeObstacle(obstacles, randInt(1,3), randInt(7,10), 'door_barricade');
  if (chance(40)) placeObstacle(obstacles, randInt(13,16), randInt(13,16), 'web');

  return { terrain, obstacles };
};

// ---- PRESETS ----
const MAP_PRESETS = [
  { id: 'tavern',  label: 'Tavern',       icon: '🍺' },
  { id: 'cave',    label: 'Cave',         icon: '🕳️' },
  { id: 'forest',  label: 'Forest',       icon: '🌲' },
  { id: 'dungeon', label: 'Dungeon Room', icon: '⚔️' },
  { id: 'town',    label: 'Town Square',  icon: '🏘️' },
  { id: 'bandit',  label: 'Bandit Camp',  icon: '🔥' },
];

const GENERATORS = {
  tavern:  generateTavern,
  cave:    generateCave,
  forest:  generateForest,
  dungeon: generateDungeon,
  town:    generateTownSquare,
  bandit:  generateBanditCamp,
};

// ============================================================
// PAINT TOOLBAR
// ============================================================
const PAINT_TOOLS = [
  { id: 'select',    label: 'Select',    icon: '🖱️' },
  { id: 'high',      label: 'High',      icon: '▲'  },
  { id: 'low',       label: 'Low',       icon: '▼'  },
  { id: 'difficult', label: 'Difficult', icon: '🌿' },
  { id: 'hazard',    label: 'Hazard',    icon: '🔴' },
  { id: 'wall',      label: 'Wall',      icon: '🧱' },
  { id: 'erase',     label: 'Erase',     icon: '🧹' },
];

// ============================================================
// HELPERS
// ============================================================
const calcDistance = (r1, c1, r2, c2) =>
  Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) * 5;

const getTerrainEffect = (terrain) =>
  TERRAIN_TYPES[terrain]?.effect || null;

// ============================================================
// MAIN BATTLE MAP COMPONENT
// ============================================================
function BattleMap({ combatants, currentTurn }) {

  const [terrain, setTerrain] = useState(
    () => Array(ROWS).fill(null).map(() => Array(COLS).fill('empty'))
  );
  const [obstacles, setObstacles]           = useState([]);
  const [tokenPositions, setTokenPositions] = useState({});
  const [activeTool, setActiveTool]         = useState('select');
  const isPainting                          = useRef(false);
  const [rangeSelection, setRangeSelection] = useState([]);
  const [dragging, setDragging]             = useState(null);
  const [showGeneratePicker, setShowGeneratePicker] = useState(false);

  // ---- Close generate picker on outside click ----
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.generate-wrapper')) {
        setShowGeneratePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);


  // ============================================================
  // GENERATE MAP
  // ============================================================
  const generateMap = (presetId) => {
    const generator = GENERATORS[presetId];
    if (!generator) return;
    const { terrain: newTerrain, obstacles: newObstacles } = generator();
    setTerrain(newTerrain);
    setObstacles(newObstacles);
    setShowGeneratePicker(false);
  };


  // ============================================================
  // PAINT CELL
  // ============================================================
  const paintCell = useCallback((row, col) => {
    setTerrain(prev => {
      const next = prev.map(r => [...r]);
      if (activeTool === 'erase') {
        next[row][col] = 'empty';
      } else if (TERRAIN_TYPES[activeTool]) {
        next[row][col] = activeTool;
      }
      return next;
    });
  }, [activeTool]);


  // ============================================================
  // MOUSE HANDLERS
  // ============================================================
  const handleCellMouseDown = (row, col) => {
    if (activeTool === 'select') return;
    isPainting.current = true;
    paintCell(row, col);
  };

  const handleCellMouseEnter = (row, col) => {
    if (!isPainting.current || activeTool === 'select') return;
    paintCell(row, col);
  };

  const handleMouseUp = () => { isPainting.current = false; };


  // ============================================================
  // RANGE SELECTION
  // ============================================================
  const handleTokenClick = (combatantId) => {
    if (activeTool !== 'select') return;
    setRangeSelection(prev => {
      if (prev.length === 0) return [combatantId];
      if (prev.length === 1) {
        if (prev[0] === combatantId) return [];
        return [prev[0], combatantId];
      }
      return [combatantId];
    });
  };


  // ============================================================
  // DRAG HANDLERS
  // ============================================================
  const handleSidebarTokenDragStart = (e, combatantId) => {
    setDragging({ type: 'new-token', id: combatantId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTokenOnGridDragStart = (e, combatantId) => {
    setDragging({ type: 'token', id: combatantId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleObstacleSidebarDragStart = (e, obstacleType) => {
    setDragging({ type: 'new-obstacle', obstacleType });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleObstacleOnGridDragStart = (e, obstacleId) => {
    setDragging({ type: 'obstacle', id: obstacleId });
    e.dataTransfer.effectAllowed = 'move';
  };


  // ============================================================
  // DROP ON CELL
  // ============================================================
  const handleCellDrop = (e, row, col) => {
    e.preventDefault();
    if (!dragging) return;

    if (dragging.type === 'new-token' || dragging.type === 'token') {
      setTokenPositions(prev => ({ ...prev, [dragging.id]: { row, col } }));
    }
    if (dragging.type === 'new-obstacle') {
      setObstacles(prev => [...prev, { id: Date.now(), row, col, type: dragging.obstacleType }]);
    }
    if (dragging.type === 'obstacle') {
      setObstacles(prev => prev.map(o => o.id === dragging.id ? { ...o, row, col } : o));
    }

    setDragging(null);
  };

  const handleCellDragOver = (e) => e.preventDefault();


  // ============================================================
  // REMOVE OBSTACLE
  // ============================================================
  const handleObstacleRightClick = (e, obstacleId) => {
    e.preventDefault();
    setObstacles(prev => prev.filter(o => o.id !== obstacleId));
  };


  // ============================================================
  // RANGE INFO
  // ============================================================
  const getRangeInfo = () => {
    if (rangeSelection.length !== 2) return null;
    const [id1, id2] = rangeSelection;
    const pos1 = tokenPositions[id1];
    const pos2 = tokenPositions[id2];
    if (!pos1 || !pos2) return null;

    const c1 = combatants.find(c => c.id === id1);
    const c2 = combatants.find(c => c.id === id2);

    let distance = calcDistance(pos1.row, pos1.col, pos2.row, pos2.col);
    const t1 = terrain[pos1.row][pos1.col];
    const t2 = terrain[pos2.row][pos2.col];
    const h1 = t1 === 'high' ? 10 : t1 === 'low' ? -10 : 0;
    const h2 = t2 === 'high' ? 10 : t2 === 'low' ? -10 : 0;
    const heightDiff  = Math.abs(h1 - h2);
    const heightBonus = Math.floor(heightDiff / 10) * 5;

    return {
      name1: c1?.name || '?',
      name2: c2?.name || '?',
      distance: distance + heightBonus,
      heightDiff,
    };
  };

  const rangeInfo = getRangeInfo();


  // ============================================================
  // TERRAIN BADGE FOR SIDEBAR
  // ============================================================
  const getTerrainBadge = (combatantId) => {
    const pos = tokenPositions[combatantId];
    if (!pos) return null;
    const effect = getTerrainEffect(terrain[pos.row][pos.col]);
    if (effect === 'high_ground') return '▲';
    if (effect === 'low_ground')  return '▼';
    if (effect === 'difficult')   return '🌿';
    if (effect === 'hazard')      return '🔴';
    return null;
  };


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="section">
      <h2>🗺️ Battle Map</h2>

      {/* ---- Paint Toolbar ---- */}
      <div className="map-toolbar">
        {PAINT_TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
          >
            <span>{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* ---- Generate Map Row ---- */}
      <div className="generate-row">
        <div className="generate-wrapper">
          <button
            className="generate-main-btn"
            onClick={() => setShowGeneratePicker(p => !p)}
          >
            🎲 Generate Map
          </button>

          {showGeneratePicker && (
            <div className="generate-dropdown">
              <div className="generate-dropdown-title">Choose a map type</div>
              {MAP_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  className="generate-option"
                  onClick={() => generateMap(preset.id)}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Range Banner ---- */}
      {rangeInfo && (
        <div className="range-banner">
          📏 {rangeInfo.name1} → {rangeInfo.name2}: <strong>{rangeInfo.distance}ft</strong>
          {rangeInfo.heightDiff > 0 && (
            <span className="height-note"> (includes {rangeInfo.heightDiff}ft height difference)</span>
          )}
        </div>
      )}

      {/* ---- Main Layout ---- */}
      <div className="map-layout">

        {/* ---- Sidebar ---- */}
        <div className="map-sidebar">
          <div className="sidebar-section-label">Combatants</div>
          {combatants.length === 0 && (
            <div className="sidebar-empty">Add combatants in the initiative tracker</div>
          )}
          {combatants.map((c, index) => {
            const badge    = getTerrainBadge(c.id);
            const isActive = index === currentTurn;
            const isOnMap  = !!tokenPositions[c.id];
            return (
              <div
                key={c.id}
                className={`sidebar-token ${isActive ? 'active' : ''} ${isOnMap ? 'on-map' : ''}`}
                draggable
                onDragStart={e => handleSidebarTokenDragStart(e, c.id)}
                title={`Drag ${c.name} onto the map`}
              >
                <div
                  className="token-circle"
                  style={{ background: c.token.color + '33', border: `2px solid ${c.token.color}` }}
                >
                  <i className={`ra ${c.token.icon}`} style={{ color: c.token.color }} />
                </div>
                <span className="sidebar-token-name">{c.name}</span>
                {badge && <span className="terrain-badge">{badge}</span>}
                {isOnMap && (
                  <button
                    className="remove-from-map-btn"
                    onClick={() => setTokenPositions(prev => {
                      const updated = { ...prev };
                      delete updated[c.id];
                      return updated;
                    })}
                    title="Remove from map"
                  >✕</button>
                )}
              </div>
            );
          })}

          {/* ---- Obstacles ---- */}
          <div className="sidebar-section-label" style={{ marginTop: 16 }}>Obstacles</div>
          {OBSTACLE_TYPES.map(obs => (
            <div
              key={obs.id}
              className="sidebar-obstacle"
              draggable
              onDragStart={e => handleObstacleSidebarDragStart(e, obs.id)}
              title={`Drag ${obs.label} onto the map`}
            >
              <span>{obs.icon}</span>
              <span>{obs.label}</span>
            </div>
          ))}
        </div>

        {/* ---- Grid ---- */}
        <div
          className="map-grid-wrapper"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="map-grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
              gridTemplateRows:    `repeat(${ROWS}, ${CELL_SIZE}px)`,
            }}
          >
            {Array(ROWS).fill(null).map((_, row) =>
              Array(COLS).fill(null).map((_, col) => {
                const cellTerrain = terrain[row][col];
                const terrainDef  = TERRAIN_TYPES[cellTerrain];
                const obstacle    = obstacles.find(o => o.row === row && o.col === col);
                const tokensHere  = combatants.filter(c => {
                  const pos = tokenPositions[c.id];
                  return pos && pos.row === row && pos.col === col;
                });
                const isRangeStart = rangeSelection[0] && tokenPositions[rangeSelection[0]]?.row === row && tokenPositions[rangeSelection[0]]?.col === col;
                const isRangeEnd   = rangeSelection[1] && tokenPositions[rangeSelection[1]]?.row === row && tokenPositions[rangeSelection[1]]?.col === col;

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`map-cell ${isRangeStart || isRangeEnd ? 'range-highlight' : ''}`}
                    style={{ background: terrainDef.color }}
                    onMouseDown={() => handleCellMouseDown(row, col)}
                    onMouseEnter={() => handleCellMouseEnter(row, col)}
                    onDragOver={handleCellDragOver}
                    onDrop={e => handleCellDrop(e, row, col)}
                  >
                    {/* Obstacle */}
                    {obstacle && (
                      <span
                        className="cell-obstacle"
                        draggable
                        onDragStart={e => handleObstacleOnGridDragStart(e, obstacle.id)}
                        onContextMenu={e => handleObstacleRightClick(e, obstacle.id)}
                        title={`${obstacle.type} — right-click to remove`}
                      >
                        {OBSTACLE_TYPES.find(o => o.id === obstacle.type)?.icon}
                      </span>
                    )}

                    {/* Tokens */}
                    {tokensHere.map(c => {
                      const isActive   = combatants.indexOf(c) === currentTurn;
                      const isSelected = rangeSelection.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          className={`grid-token ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${c.hp === 0 ? 'dead' : ''}`}
                          style={{
                            background: c.token.color + '33',
                            border: `2px solid ${c.token.color}`,
                            boxShadow: isActive ? `0 0 8px ${c.token.color}` : 'none',
                            opacity: c.hp === 0 ? 0.4 : 1,
                          }}
                          draggable
                          onDragStart={e => handleTokenOnGridDragStart(e, c.id)}
                          onClick={() => handleTokenClick(c.id)}
                          title={c.name}
                        >
                          {c.hp === 0
                            ? <span style={{ fontSize: '0.9rem' }}>💀</span>
                            : <i className={`ra ${c.token.icon}`} style={{ color: c.token.color, fontSize: '0.9rem' }} />
                          }
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ---- Legend ---- */}
      <div className="map-legend">
        <span className="legend-item" style={{ background: '#8B691444' }}>▲ High ground</span>
        <span className="legend-item" style={{ background: '#1a3a5c44' }}>▼ Low ground</span>
        <span className="legend-item" style={{ background: '#2d5a1b44' }}>🌿 Difficult</span>
        <span className="legend-item" style={{ background: '#8B1a1a44' }}>🔴 Hazard</span>
        <span className="legend-item" style={{ background: '#44444444' }}>🧱 Wall</span>
      </div>

    </div>
  );
}

export default BattleMap;