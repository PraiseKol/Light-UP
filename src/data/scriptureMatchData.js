// Scripture Match Game Data

export const SCRIPTURE_PAIRS = [
  {
    id: 'john316',
    firstHalf: 'For God so loved the world',
    secondHalf: 'that He gave His only Son',
    reference: 'John 3:16',
    difficulty: 'easy'
  },
  {
    id: 'jer2911',
    firstHalf: 'For I know the plans I have for you',
    secondHalf: 'plans to prosper you and not to harm you',
    reference: 'Jeremiah 29:11',
    difficulty: 'easy'
  },
  {
    id: 'phil413',
    firstHalf: 'I can do all things',
    secondHalf: 'through Christ who strengthens me',
    reference: 'Philippians 4:13',
    difficulty: 'easy'
  },
  {
    id: 'ps231',
    firstHalf: 'The Lord is my shepherd',
    secondHalf: 'I shall not want',
    reference: 'Psalm 23:1',
    difficulty: 'easy'
  },
  {
    id: 'prov356',
    firstHalf: 'Trust in the Lord with all your heart',
    secondHalf: 'and lean not on your own understanding',
    reference: 'Proverbs 3:5-6',
    difficulty: 'medium'
  },
  {
    id: 'rom828',
    firstHalf: 'And we know that in all things',
    secondHalf: 'God works for the good of those who love Him',
    reference: 'Romans 8:28',
    difficulty: 'medium'
  },
  {
    id: 'is4031',
    firstHalf: 'But those who hope in the Lord',
    secondHalf: 'will renew their strength',
    reference: 'Isaiah 40:31',
    difficulty: 'medium'
  },
  {
    id: 'josh19',
    firstHalf: 'Be strong and courageous',
    secondHalf: 'for the Lord your God is with you',
    reference: 'Joshua 1:9',
    difficulty: 'easy'
  },
  {
    id: 'ps11810',
    firstHalf: 'Your word is a lamp to my feet',
    secondHalf: 'and a light to my path',
    reference: 'Psalm 119:105',
    difficulty: 'easy'
  },
  {
    id: 'matt633',
    firstHalf: 'But seek first His kingdom',
    secondHalf: 'and all these things will be given to you',
    reference: 'Matthew 6:33',
    difficulty: 'medium'
  },
  {
    id: 'heb111',
    firstHalf: 'Now faith is the substance',
    secondHalf: 'of things hoped for',
    reference: 'Hebrews 11:1',
    difficulty: 'medium'
  },
  {
    id: '1cor1313',
    firstHalf: 'And now these three remain',
    secondHalf: 'faith, hope and love',
    reference: '1 Corinthians 13:13',
    difficulty: 'easy'
  },
  {
    id: 'gal220',
    firstHalf: 'I have been crucified with Christ',
    secondHalf: 'and I no longer live, but Christ lives in me',
    reference: 'Galatians 2:20',
    difficulty: 'hard'
  },
  {
    id: 'eph28',
    firstHalf: 'For it is by grace you have been saved',
    secondHalf: 'through faith—and this is not from yourselves',
    reference: 'Ephesians 2:8',
    difficulty: 'hard'
  },
  {
    id: 'ps464',
    firstHalf: 'Be still',
    secondHalf: 'and know that I am God',
    reference: 'Psalm 46:10',
    difficulty: 'easy'
  }
];

export const SYMBOLS = [
  { id: 'cross', name: 'Cross', emoji: '✝️', relatedVerse: 'For the message of the cross is the power of God', reference: 'Galatians 2:20' },
  { id: 'dove', name: 'Dove', emoji: '🕊️', relatedVerse: 'The Spirit descended on Him like a dove', reference: 'Matthew 3:16' },
  { id: 'lamp', name: 'Lamp', emoji: '🪔', relatedVerse: 'Your word is a lamp to my feet', reference: 'Psalm 119:105' },
  { id: 'olive', name: 'Olive Branch', emoji: '🫒', relatedVerse: 'The dove returned with an olive leaf', reference: 'Genesis 8:11' },
  { id: 'fish', name: 'Fish', emoji: '🐟', relatedVerse: 'I will make you fishers of men', reference: 'Matthew 4:19' },
  { id: 'bread', name: 'Bread', emoji: '🍞', relatedVerse: 'I am the bread of life', reference: 'John 6:35' },
  { id: 'crown', name: 'Crown', emoji: '👑', relatedVerse: 'You will receive the crown of life', reference: 'James 1:12' },
  { id: 'heart', name: 'Heart', emoji: '❤️', relatedVerse: 'Love the Lord with all your heart', reference: 'Matthew 22:37' },
  { id: 'star', name: 'Star', emoji: '⭐', relatedVerse: 'We saw His star in the east', reference: 'Matthew 2:2' },
  { id: 'scroll', name: 'Scroll', emoji: '📜', relatedVerse: 'Blessed is the one who reads this scroll', reference: 'Revelation 1:3' }
];

export const COMPLETION_SCRIPTURES = [
  { text: 'Well done, good and faithful servant!', ref: 'Matthew 25:21' },
  { text: 'I have fought the good fight, I have finished the race.', ref: '2 Timothy 4:7' },
  { text: 'Be strong and do not give up, for your work will be rewarded.', ref: '2 Chronicles 15:7' },
  { text: 'The Lord has done great things for us, and we are filled with joy.', ref: 'Psalm 126:3' },
  { text: 'In all these things we are more than conquerors.', ref: 'Romans 8:37' },
  { text: 'Let us run with perseverance the race marked out for us.', ref: 'Hebrews 12:1' },
  { text: 'Whatever you do, work at it with all your heart.', ref: 'Colossians 3:23' },
  { text: 'Commit your work to the Lord, and your plans will be established.', ref: 'Proverbs 16:3' }
];

// Level configurations
export const LEVELS = [
  { level: 1, gridCols: 2, gridRows: 2, cards: 4, matchType: 'symbol_symbol', timeLimit: null },
  { level: 2, gridCols: 3, gridRows: 2, cards: 6, matchType: 'symbol_symbol', timeLimit: null },
  { level: 3, gridCols: 4, gridRows: 2, cards: 8, matchType: 'symbol_symbol', timeLimit: null },
  { level: 4, gridCols: 3, gridRows: 4, cards: 12, matchType: 'verse_pair', timeLimit: null },
  { level: 5, gridCols: 4, gridRows: 4, cards: 16, matchType: 'verse_pair', timeLimit: null },
  { level: 6, gridCols: 4, gridRows: 5, cards: 20, matchType: 'verse_pair', timeLimit: 120 },
  { level: 7, gridCols: 5, gridRows: 4, cards: 20, matchType: 'symbol_verse', timeLimit: 120 },
  { level: 8, gridCols: 5, gridRows: 5, cards: 24, matchType: 'mixed', timeLimit: 150 },
  { level: 9, gridCols: 6, gridRows: 4, cards: 24, matchType: 'mixed', timeLimit: 150 },
  { level: 10, gridCols: 6, gridRows: 5, cards: 30, matchType: 'mixed', timeLimit: 180 }
];

// Shuffle array helper
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate cards for a level
export const generateCards = (level) => {
  const config = LEVELS.find(l => l.level === level) || LEVELS[0];
  const numPairs = config.cards / 2;
  let cards = [];

  if (config.matchType === 'symbol_symbol') {
    // Use symbols only
    const selectedSymbols = shuffleArray(SYMBOLS).slice(0, numPairs);
    selectedSymbols.forEach((symbol, idx) => {
      cards.push({
        id: `${symbol.id}-a-${idx}`,
        pairId: symbol.id,
        type: 'symbol',
        content: symbol.emoji,
        label: symbol.name
      });
      cards.push({
        id: `${symbol.id}-b-${idx}`,
        pairId: symbol.id,
        type: 'symbol',
        content: symbol.emoji,
        label: symbol.name
      });
    });
  } else if (config.matchType === 'verse_pair') {
    // Use verse pairs (first half + second half)
    const selectedVerses = shuffleArray(SCRIPTURE_PAIRS).slice(0, numPairs);
    selectedVerses.forEach((verse, idx) => {
      cards.push({
        id: `${verse.id}-first-${idx}`,
        pairId: verse.id,
        type: 'verse_first',
        content: verse.firstHalf,
        reference: verse.reference
      });
      cards.push({
        id: `${verse.id}-second-${idx}`,
        pairId: verse.id,
        type: 'verse_second',
        content: verse.secondHalf,
        reference: verse.reference
      });
    });
  } else if (config.matchType === 'symbol_verse') {
    // Symbol + related verse
    const selectedSymbols = shuffleArray(SYMBOLS).slice(0, numPairs);
    selectedSymbols.forEach((symbol, idx) => {
      cards.push({
        id: `${symbol.id}-sym-${idx}`,
        pairId: symbol.id,
        type: 'symbol',
        content: symbol.emoji,
        label: symbol.name
      });
      cards.push({
        id: `${symbol.id}-verse-${idx}`,
        pairId: symbol.id,
        type: 'symbol_verse',
        content: symbol.relatedVerse,
        reference: symbol.reference
      });
    });
  } else {
    // Mixed mode - combine different types
    const halfPairs = Math.floor(numPairs / 2);
    
    // Symbol-symbol pairs
    const symbols = shuffleArray(SYMBOLS).slice(0, halfPairs);
    symbols.forEach((symbol, idx) => {
      cards.push({
        id: `${symbol.id}-a-${idx}`,
        pairId: symbol.id,
        type: 'symbol',
        content: symbol.emoji,
        label: symbol.name
      });
      cards.push({
        id: `${symbol.id}-b-${idx}`,
        pairId: symbol.id,
        type: 'symbol',
        content: symbol.emoji,
        label: symbol.name
      });
    });
    
    // Verse pairs
    const verses = shuffleArray(SCRIPTURE_PAIRS).slice(0, numPairs - halfPairs);
    verses.forEach((verse, idx) => {
      cards.push({
        id: `${verse.id}-first-${idx}`,
        pairId: verse.id,
        type: 'verse_first',
        content: verse.firstHalf,
        reference: verse.reference
      });
      cards.push({
        id: `${verse.id}-second-${idx}`,
        pairId: verse.id,
        type: 'verse_second',
        content: verse.secondHalf,
        reference: verse.reference
      });
    });
  }

  return shuffleArray(cards);
};
