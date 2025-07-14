import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function LevelButton({ level, isUnlocked, onClick }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={isUnlocked ? { scale: 1.1 } : {}}
      transition={{ type: 'spring', stiffness: 200 }}
      className={`
        w-16 h-16 rounded-full font-bold shadow-xl transition-colors duration-300 flex items-center justify-center
        ${level.completed ? 'bg-gold text-black ring-4 ring-yellow-300' :
          isUnlocked ? 'bg-charcoal text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
      `}
      disabled={!isUnlocked}
      onClick={() => isUnlocked && onClick(level)}
    >
      {isUnlocked ? level.number : <Lock size={20} />}
    </motion.button>
  );
}
