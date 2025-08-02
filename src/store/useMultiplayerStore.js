import { create } from "zustand";

export const useMultiplayerStore = create((set) => ({
  game: null,             // game object from multiplayer_games
  players: [],            // all players in this game
  questions: [],          // randomized quiz questions
  currentIndex: 0,        // current question index for THIS player
  score: 0,               // THIS player's score
  timeLeft: 0,            // global match timer in seconds

  setGame: (g) => set({ game: g }),
  setPlayers: (p) => set({ players: p }),
  setQuestions: (q) => set({ questions: q }),
  setTimeLeft: (t) => set({ timeLeft: t }),
  nextQuestion: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
  incrementScore: () => set((state) => ({ score: state.score + 1 })),
  reset: () => set({
    game: null,
    players: [],
    questions: [],
    currentIndex: 0,
    score: 0,
    timeLeft: 0
  })
}));
