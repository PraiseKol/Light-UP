import { useEffect, useState } from 'react';

export function LivesDisplay({ lives, lastLostAt }) {
  const [nextLifeIn, setNextLifeIn] = useState(null);

  useEffect(() => {
    if (lives >= 5 || !lastLostAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const last = new Date(lastLostAt);
      const nextLifeAt = new Date(last.getTime() +30 * 60 * 1000);
      const remaining = nextLifeAt - now;

      if (remaining <= 0) {
        setNextLifeIn(null);
        clearInterval(interval);
        return;
      }

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setNextLifeIn(`${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [lives, lastLostAt]);

  return (
    <div className="flex flex-col items-center leading-tight">
      <div className="heart-meter">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`heart-pip ${i < lives ? '' : 'is-empty'}`}>
            ❤️
          </span>
        ))}
      </div>
      {nextLifeIn && (
        <div className="text-[8px] sm:text-[10px] text-white/90 font-bold mt-0.5">
          +1 in {nextLifeIn}
        </div>
      )}
    </div>
  );
}
