import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  getActiveCompetition, 
  getPlayerCompetitionEntry,
  getCompetitionQuestions,
  submitCompetitionAnswer
} from '@/lib/api/competition';
import { Trophy, Clock, Users, Zap, Crown, Star, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { calculateScore } from '@/utils/score';
import { playSound } from '@/utils/sound';

export default function CompetitionPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [playerEntry, setPlayerEntry] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('competition-player')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, handleCompetitionUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_rounds' }, handleCompetitionUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_players' }, handlePlayerUpdate)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Round timer
  useEffect(() => {
    if (competition?.round_ends_at && competition.status !== 'waiting' && competition.status !== 'completed') {
      const interval = setInterval(() => {
        const endTime = new Date(competition.round_ends_at).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setRoundTimeLeft(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [competition?.round_ends_at, competition?.status]);

  async function loadInitialData() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    const comp = await getActiveCompetition();
    setCompetition(comp);

    if (comp && authUser) {
      const entry = await getPlayerCompetitionEntry(comp.id, authUser.id);
      setPlayerEntry(entry);

      if (comp.status !== 'waiting' && comp.status !== 'completed') {
        const qs = await getCompetitionQuestions(20);
        setQuestions(qs);
        setQuestionStartTime(Date.now());
      }
    }

    setLoading(false);
  }

  async function handleCompetitionUpdate() {
    const comp = await getActiveCompetition();
    setCompetition(comp);

    if (comp && comp.status !== 'waiting' && comp.status !== 'completed' && questions.length === 0) {
      const qs = await getCompetitionQuestions(20);
      setQuestions(qs);
      setQuestionStartTime(Date.now());
    }
  }

  async function handlePlayerUpdate() {
    if (competition && user) {
      const entry = await getPlayerCompetitionEntry(competition.id, user.id);
      setPlayerEntry(entry);
    }
  }

  async function handleAnswer(answer) {
    if (!playerEntry || selectedAnswer !== null) return;

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || answeredQuestions.has(currentQuestion.id)) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.answer;
    const elapsedTime = (Date.now() - questionStartTime) / 1000;
    const score = isCorrect ? calculateScore(elapsedTime, 30) : 0;

    playSound(isCorrect ? 'correct' : 'incorrect');

    await submitCompetitionAnswer(
      competition.id,
      playerEntry.id,
      currentQuestion.id,
      score,
      isCorrect
    );

    setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));

    // Move to next question after delay
    setTimeout(() => {
      setSelectedAnswer(null);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setQuestionStartTime(Date.now());
      }
    }, 1000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-christmasGold border-t-transparent rounded-full" />
      </div>
    );
  }

  // No active competition
  if (!competition) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col items-center justify-center p-4">
        <Trophy className="w-20 h-20 text-christmasGold/50 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">No Active Competition</h1>
        <p className="text-white/60 text-center mb-6">Check back later for upcoming competitions!</p>
        <button
          onClick={() => navigate('/map')}
          className="px-6 py-3 bg-gradient-to-r from-christmasGreen to-green-600 text-white rounded-xl font-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Map
        </button>
      </div>
    );
  }

  // Player not in competition
  if (!playerEntry) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col items-center justify-center p-4">
        <Users className="w-20 h-20 text-christmasGold/50 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">You're Not in This Competition</h1>
        <p className="text-white/60 text-center mb-6">Only qualified players can participate. Watch the action instead!</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/competition/view')}
            className="px-6 py-3 bg-gradient-to-r from-christmasGold to-yellow-500 text-black rounded-xl font-bold flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            Watch Live
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/20"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // Player eliminated
  if (!playerEntry.is_qualified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">😢</div>
        <h1 className="text-2xl font-bold text-white mb-2">Eliminated in Round {playerEntry.round_eliminated}</h1>
        <p className="text-white/60 text-center mb-2">Your final score: {playerEntry.total_score}</p>
        <p className="text-white/60 text-center mb-6">Better luck next time!</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/competition/view')}
            className="px-6 py-3 bg-gradient-to-r from-christmasGold to-yellow-500 text-black rounded-xl font-bold flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            Watch Remaining Rounds
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/20"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // Waiting for competition to start
  if (competition.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col items-center justify-center p-4">
        <Trophy className="w-20 h-20 text-christmasGold animate-bounce mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Competition Starting Soon!</h1>
        <p className="text-white/60 text-center mb-4">You're qualified! Get ready to compete.</p>
        <div className="bg-black/30 rounded-xl p-4 text-center">
          <p className="text-christmasGold font-bold">Your Group: {playerEntry.group_letter || 'TBD'}</p>
          <p className="text-white/60 text-sm mt-1">Groups will be assigned when competition starts</p>
        </div>
      </div>
    );
  }

  // Competition completed
  if (competition.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col items-center justify-center p-4">
        <Crown className="w-20 h-20 text-christmasGold mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Competition Complete!</h1>
        <p className="text-white/60 text-center mb-6">Your final score: {playerEntry.total_score}</p>
        <button
          onClick={() => navigate('/competition/view')}
          className="px-6 py-3 bg-gradient-to-r from-christmasGold to-yellow-500 text-black rounded-xl font-bold flex items-center gap-2"
        >
          <Trophy className="w-5 h-5" />
          View Results
        </button>
      </div>
    );
  }

  // Active gameplay
  const currentQuestion = questions[currentQuestionIndex];
  const currentRound = competition.competition_rounds?.find(r => r.round_number === competition.current_round);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col">
      {/* Header */}
      <div className="p-4 bg-black/30 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-christmasGold" />
            <span className="text-white font-bold">Round {competition.current_round}</span>
            {playerEntry.group_letter && (
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                playerEntry.group_letter === 'A' || playerEntry.group_letter === 'C' || playerEntry.group_letter === 'E'
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-red-500/30 text-red-300'
              }`}>
                Group {playerEntry.group_letter}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-christmasGold">
            <Clock className="w-5 h-5" />
            <span className="font-mono font-bold">
              {Math.floor((roundTimeLeft || 0) / 60)}:{((roundTimeLeft || 0) % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Group Scores */}
        {currentRound && competition.current_round < 4 && (
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg p-2 text-center ${
              playerEntry.group_letter === currentRound.group_a_letter
                ? 'bg-blue-500/30 border border-blue-500'
                : 'bg-blue-500/10'
            }`}>
              <div className="text-xs text-blue-300">Group {currentRound.group_a_letter}</div>
              <div className="text-xl font-bold text-white">{currentRound.group_a_score}</div>
            </div>
            <div className={`rounded-lg p-2 text-center ${
              playerEntry.group_letter === currentRound.group_b_letter
                ? 'bg-red-500/30 border border-red-500'
                : 'bg-red-500/10'
            }`}>
              <div className="text-xs text-red-300">Group {currentRound.group_b_letter}</div>
              <div className="text-xl font-bold text-white">{currentRound.group_b_score}</div>
            </div>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="flex-1 p-4 flex flex-col">
        {currentQuestion ? (
          <>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-pink-300 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">Question {currentQuestionIndex + 1}/{questions.length}</span>
                <div className="flex items-center gap-1 text-christmasGold">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold">{playerEntry.current_round_score}</span>
                </div>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options?.map((option, idx) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.answer;
                const showResult = selectedAnswer !== null;

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null}
                    className={`p-4 rounded-xl font-medium text-left transition-all ${
                      showResult
                        ? isCorrect
                          ? 'bg-green-500 text-white border-2 border-green-400'
                          : isSelected
                            ? 'bg-red-500 text-white border-2 border-red-400'
                            : 'bg-white/80 text-gray-600 border-2 border-gray-200'
                        : 'bg-white/90 text-gray-800 border-2 border-pink-200 hover:border-pink-400 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <span className="text-sm sm:text-base">{option}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Star className="w-16 h-16 text-christmasGold mx-auto mb-4" />
              <p className="text-white text-xl font-bold">All Questions Answered!</p>
              <p className="text-white/60">Wait for the round to end...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
