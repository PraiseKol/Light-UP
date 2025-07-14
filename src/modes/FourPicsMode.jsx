// src/modes/FourPicsMode.jsx
import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'react-hot-toast';

const samplePuzzle = {
  answer: 'FAITH',
  images: [
    '/images/bible.avif',
    '/images/prayer.avif',
    '/images/cross.webp',
    '/images/church.jpg',
  ],
};

function shuffleArray(word) {
  const arr = word.toUpperCase().split('');
  const extras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (arr.length < 12) {
    const randChar = extras[Math.floor(Math.random() * extras.length)];
    arr.push(randChar);
  }
  return arr.sort(() => Math.random() - 0.5);
}

export default function FourPicsMode({ onComplete }) {
  const [input, setInput] = useState([]);
  const [letters, setLetters] = useState(shuffleArray(samplePuzzle.answer));

  const handleLetterClick = (letter, index) => {
    if (input.length < samplePuzzle.answer.length) {
      setInput([...input, { letter, index }]);
    }
  };

  const handleRemove = () => {
    const updated = [...input];
    updated.pop();
    setInput(updated);
  };

  const checkAnswer = () => {
    const guess = input.map(i => i.letter).join('');
    if (guess === samplePuzzle.answer) {
      toast.success('Correct!');
      setTimeout(() => onComplete(), 1000);
    } else {
      toast.error('Try again');
    }
  };

  const usedIndexes = input.map(i => i.index);

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="grid grid-cols-2 gap-4">
        {samplePuzzle.images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`hint-${i}`}
            className="w-32 h-32 object-cover rounded-xl shadow"
          />
        ))}
      </div>

      <div className="flex gap-2 text-2xl font-bold tracking-wider">
        {Array.from({ length: samplePuzzle.answer.length }).map((_, i) => (
          <div
            key={i}
            className="w-10 h-10 border-b-2 border-charcoal text-center"
          >
            {input[i]?.letter || ''}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-2">
        {letters.map((char, index) => (
          <Button
            key={index}
            size="sm"
            disabled={usedIndexes.includes(index)}
            onClick={() => handleLetterClick(char, index)}
            className="font-bold"
          >
            {char}
          </Button>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={handleRemove}>← Delete</Button>
        <Button onClick={checkAnswer} disabled={input.length !== samplePuzzle.answer.length}>
          Check
        </Button>
      </div>
    </div>
  );
}
