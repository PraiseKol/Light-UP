// utils/score.js
export const calculateScore = (elapsedTime, totalTime = 30) => {
    const oneThird = totalTime / 3;
    if (elapsedTime <= oneThird) return 100;
    if (elapsedTime <= 2 * oneThird) return 75;
    if (elapsedTime <= totalTime) return 50;
    return 0;
  };
  