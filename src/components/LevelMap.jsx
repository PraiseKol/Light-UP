// src/components/LevelMap.jsx
import LevelButton from './LevelButton';

export default function LevelMap({ phase, onSelectLevel }) {
  return (
    <div className="p-6 bg-gradient-to-br from-white via-gold/10 to-charcoal/5 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-charcoal mb-6 text-center">
        Phase {phase.phaseNumber}
      </h2>
      <div className="grid grid-cols-5 gap-6 place-items-center">
        {phase.levels.map((level, i) => {
          const isFirst = i === 0;
          const prevCompleted = i > 0 && phase.levels[i - 1].completed;
          const isUnlocked = isFirst || prevCompleted || level.completed;

          return (
            <LevelButton
              key={level.id}
              level={level}
              isUnlocked={isUnlocked}
              onClick={onSelectLevel}
            />
          );
        })}
      </div>
    </div>
  );
}
