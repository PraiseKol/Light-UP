export function calculateUpdatedLives(lives, lastLostAt) {
  const MAX_LIVES = 5;
  const MINUTES_PER_LIFE = 30;

  if (lives >= MAX_LIVES || !lastLostAt) {
    return { lives, newLastLostAt: null, nextLifeIn: null };
  }

  const now = new Date();
  const last = new Date(lastLostAt);
  const diffMs = now - last;
  const diffMinutes = Math.floor(diffMs / 60000); // Convert ms to minutes

  const regenCount = Math.floor(diffMinutes / MINUTES_PER_LIFE);
  const updatedLives = Math.min(MAX_LIVES, lives + regenCount);

  let newLastLostAt = last;
  if (updatedLives < MAX_LIVES && regenCount > 0) {
    // Shift last_life_lost_at forward by minutes recovered
    const minutesRecovered = regenCount * MINUTES_PER_LIFE;
    newLastLostAt = new Date(last.getTime() + minutesRecovered * 60000);
  } else if (updatedLives === MAX_LIVES) {
    newLastLostAt = null; // Reset if fully regenerated
  }

  // For UI purposes: how many minutes left to next life
  let nextLifeIn = null;
  if (updatedLives < MAX_LIVES) {
    const minutesSinceLast = diffMinutes % MINUTES_PER_LIFE;
    nextLifeIn = MINUTES_PER_LIFE - minutesSinceLast;
  }

  return {
    lives: updatedLives,
    newLastLostAt,
    nextLifeIn,
  };
}
