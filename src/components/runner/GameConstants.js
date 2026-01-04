// Game configuration constants
export const GAME_CONFIG = {
  // Lane settings
  LANES: 3,
  LANE_WIDTH: 80, // pixels
  
  // Speed settings
  BASE_SPEED: 5,
  SPEED_INCREMENT: 0.5,
  SPEED_INCREMENT_INTERVAL: 5000, // ms
  MAX_SPEED: 15,
  
  // Jump/Slide settings
  JUMP_DURATION: 600,
  SLIDE_DURATION: 500,
  JUMP_HEIGHT: 120,
  
  // Spawn settings
  OBSTACLE_SPAWN_INTERVAL: 1500, // ms base
  COLLECTIBLE_SPAWN_INTERVAL: 800, // ms base
  MIN_OBSTACLE_GAP: 800, // ms
  
  // Scoring
  DISTANCE_SCORE_MULTIPLIER: 1,
  SCROLL_VALUE: 10,
  LIGHT_ORB_MULTIPLIER: 1.5,
  OLIVE_BRANCH_VALUE: 25,
  CROWN_VALUE: 100,
  
  // Power-up durations (base, increases with level)
  SHIELD_DURATION: 3000,
  WINGS_DURATION: 4000,
  SPEED_BOOST_DURATION: 3000,
  LAMP_DURATION: 5000,
};

// Obstacle types
export const OBSTACLES = {
  FALLEN_PILLAR: {
    id: 'fallen_pillar',
    name: 'Fallen Pillar',
    action: 'slide', // Must slide to avoid
    height: 60,
    width: 70,
    color: '#8B7355',
  },
  BROKEN_BRIDGE: {
    id: 'broken_bridge',
    name: 'Broken Bridge',
    action: 'jump', // Must jump to avoid
    height: 40,
    width: 80,
    color: '#654321',
  },
  RIVER_GAP: {
    id: 'river_gap',
    name: 'River Gap',
    action: 'jump',
    height: 30,
    width: 90,
    color: '#4A90D9',
  },
  ROCK_SLIDE: {
    id: 'rock_slide',
    name: 'Rock Slide',
    action: 'avoid', // Must change lanes
    height: 80,
    width: 70,
    color: '#696969',
  },
  NARROW_PASSAGE: {
    id: 'narrow_passage',
    name: 'Narrow Passage',
    action: 'center', // Must be in center lane
    height: 100,
    width: 200,
    color: '#8B4513',
  },
};

// Collectible types
export const COLLECTIBLES = {
  SCROLL: {
    id: 'scroll',
    name: 'Scroll',
    emoji: '📜',
    value: 10,
    rarity: 0.6, // 60% chance
    color: '#F4E4BC',
  },
  LIGHT_ORB: {
    id: 'light_orb',
    name: 'Light Orb',
    emoji: '✨',
    value: 0, // Multiplier, not direct value
    multiplier: 1.5,
    rarity: 0.25, // 25% chance
    color: '#FFD700',
  },
  OLIVE_BRANCH: {
    id: 'olive_branch',
    name: 'Olive Branch',
    emoji: '🌿',
    value: 25,
    rarity: 0.12, // 12% chance
    color: '#6B8E23',
  },
  CROWN: {
    id: 'crown',
    name: 'Crown',
    emoji: '👑',
    value: 100,
    rarity: 0.03, // 3% chance
    color: '#FFD700',
  },
};

// Power-ups
export const POWER_UPS = {
  SHIELD_OF_FAITH: {
    id: 'shield_of_faith',
    name: 'Shield of Faith',
    emoji: '🛡️',
    description: 'Temporary invincibility',
    color: '#4169E1',
    baseDuration: 3000,
    durationPerLevel: 1000,
  },
  WINGS_OF_GRACE: {
    id: 'wings_of_grace',
    name: 'Wings of Grace',
    emoji: '🕊️',
    description: 'Fly above obstacles',
    color: '#FFFFFF',
    baseDuration: 4000,
    durationPerLevel: 800,
  },
  SPEED_OF_SPIRIT: {
    id: 'speed_of_spirit',
    name: 'Speed of Spirit',
    emoji: '⚡',
    description: 'Speed boost with score multiplier',
    color: '#FFD700',
    baseDuration: 3000,
    durationPerLevel: 500,
  },
  LAMP_OF_TRUTH: {
    id: 'lamp_of_truth',
    name: 'Lamp of Truth',
    emoji: '🏮',
    description: 'Highlights safe paths',
    color: '#FFA500',
    baseDuration: 5000,
    durationPerLevel: 1000,
  },
};

// Characters
export const CHARACTERS = {
  FAITH_RUNNER: {
    id: 'faith_runner',
    name: 'Faith Runner',
    description: 'A humble traveler on the path of faith',
    cost: 0, // Default unlocked
    color: '#8B4513',
    glowColor: '#FFD700',
  },
  SHEPHERD_TRAVELER: {
    id: 'shepherd_traveler',
    name: 'Shepherd Traveler',
    description: 'Guides the flock through valleys',
    cost: 1000,
    color: '#2F4F4F',
    glowColor: '#98FB98',
  },
  SCROLL_BEARER: {
    id: 'scroll_bearer',
    name: 'Scroll Bearer',
    description: 'Carries the sacred scriptures',
    cost: 2500,
    color: '#8B0000',
    glowColor: '#FFE4B5',
  },
  LIGHT_MESSENGER: {
    id: 'light_messenger',
    name: 'Light Messenger',
    description: 'Brings light to darkness',
    cost: 5000,
    color: '#FFFFFF',
    glowColor: '#FFFACD',
  },
  DESERT_PILGRIM: {
    id: 'desert_pilgrim',
    name: 'Desert Pilgrim',
    description: 'Endures the harsh wilderness',
    cost: 10000,
    color: '#DEB887',
    glowColor: '#F0E68C',
  },
};

// Environments
export const ENVIRONMENTS = {
  DESERT_PATH: {
    id: 'desert_path',
    name: 'Desert Path',
    description: 'Ancient roads through sand and rock',
    colors: {
      sky: '#87CEEB',
      ground: '#EDC9AF',
      accent: '#D2691E',
    },
    obstacles: ['fallen_pillar', 'rock_slide', 'narrow_passage'],
  },
  HOLY_CITY: {
    id: 'holy_city',
    name: 'Holy City Roads',
    description: 'Stone streets of the sacred city',
    colors: {
      sky: '#E6E6FA',
      ground: '#D3D3D3',
      accent: '#8B7355',
    },
    obstacles: ['fallen_pillar', 'broken_bridge', 'narrow_passage'],
  },
  VALLEY_OF_LIGHT: {
    id: 'valley_of_light',
    name: 'Valley of Light',
    description: 'Glowing paths through verdant hills',
    colors: {
      sky: '#FFE4B5',
      ground: '#90EE90',
      accent: '#FFD700',
    },
    obstacles: ['river_gap', 'rock_slide', 'broken_bridge'],
  },
  MOUNTAIN_TRAILS: {
    id: 'mountain_trails',
    name: 'Mountain Trails',
    description: 'Narrow paths along steep cliffs',
    colors: {
      sky: '#B0C4DE',
      ground: '#808080',
      accent: '#A0522D',
    },
    obstacles: ['broken_bridge', 'rock_slide', 'river_gap', 'narrow_passage'],
  },
};

// Scripture quotes for game over
export const SCRIPTURES = [
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Be strong and courageous. Do not be afraid.", ref: "Joshua 1:9" },
  { text: "Trust in the Lord with all your heart.", ref: "Proverbs 3:5" },
  { text: "For I know the plans I have for you.", ref: "Jeremiah 29:11" },
  { text: "The joy of the Lord is your strength.", ref: "Nehemiah 8:10" },
  { text: "He gives strength to the weary.", ref: "Isaiah 40:29" },
  { text: "Walk by faith, not by sight.", ref: "2 Corinthians 5:7" },
  { text: "Let your light shine before others.", ref: "Matthew 5:16" },
  { text: "With God all things are possible.", ref: "Matthew 19:26" },
  { text: "The Lord will fight for you; you need only be still.", ref: "Exodus 14:14" },
  { text: "God is our refuge and strength.", ref: "Psalm 46:1" },
];
