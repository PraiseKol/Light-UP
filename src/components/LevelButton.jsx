import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

export default function LevelButton({ level, isUnlocked, onClick }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }} // animate hover for all
      transition={{ type: 'spring', stiffness: 200 }}
      className={`
        w-16 h-16 rounded-full font-bold shadow-xl transition-colors duration-300 flex items-center justify-center
        ${level.completed ? 'bg-gold text-black ring-4 ring-yellow-300' :
          isUnlocked ? 'bg-black text-white' :
          'bg-black text-yellow-400 cursor-not-allowed'}
      `}
      disabled={!isUnlocked}
      onClick={() => isUnlocked && onClick(level)}
    >
      {isUnlocked ? level.number : (
        <Lightbulb size={22} className="animate-pulse text-yellow-300" />
      )}
    </motion.button>
  );
}
