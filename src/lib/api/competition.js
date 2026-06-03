import { supabase } from "@/lib/supabaseClient";

// ============= COMPETITION TIMING CONSTANTS =============
export const ROUND_DURATIONS = {
  1: 120,  // 2 minutes
  2: 60,   // 1 minute
  3: 60,   // 1 minute
  4: 120   // 2 minutes (final)
};

export const COUNTDOWN_DURATION = 30;  // 30 seconds before round starts
export const BREAK_DURATION = 30;      // 30 seconds between rounds




// ============= COMPETITION MANAGEMENT =============

// Cancel an active competition (admin only)
export async function cancelCompetition(competitionId) {
  try {
    // Delete all related data in order (due to foreign key constraints)
    await supabase.from('competition_answers').delete().eq('competition_id', competitionId);
    await supabase.from('competition_rounds').delete().eq('competition_id', competitionId);
    await supabase.from('competition_players').delete().eq('competition_id', competitionId);
    await supabase.from('competitions').delete().eq('id', competitionId);
    return true;
  } catch (error) {
    console.error('Error cancelling competition:', error);
    return false;
  }
}

// Create a new competition
export async function createCompetition(players) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create competition
  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .insert({
      status: 'waiting',
      current_round: 0,
      phase: 'idle',
      created_by: user?.id
    })
    .select()
    .single();

  if (compError) {
    console.error('Error creating competition:', compError);
    return null;
  }

  // Add players
  const playerInserts = players.map(p => ({
    competition_id: competition.id,
    user_id: p.user_id,
    player_name: p.player_name,
    selection_type: p.selection_type || 'manual'
  }));

  const { error: playersError } = await supabase
    .from('competition_players')
    .insert(playerInserts);

  if (playersError) {
    console.error('Error adding players:', playersError);
    return null;
  }

  return competition;
}

// Get active competition
export async function getActiveCompetition() {
  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      competition_players (*),
      competition_rounds (*)
    `)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching competition:', error);
  }
  return data;
}

// Get competition by ID
export async function getCompetitionById(id) {
  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      competition_players (*),
      competition_rounds (*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching competition:', error);
    return null;
  }
  return data;
}

// ============= AUTOMATED COMPETITION FLOW =============

// Step 1: Group players into initial groups (A & B). Supports 16 or 24 players.
export async function groupPlayersForCompetition(competitionId) {
  const { data: players } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true);

  const count = players?.length || 0;
  if (count !== 16 && count !== 24) {
    console.error(`Need exactly 16 or 24 players to group (got ${count})`);
    return false;
  }

  // Shuffle and assign evenly to groups A and B
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const half = count / 2;

  for (let i = 0; i < shuffledPlayers.length; i++) {
    const groupLetter = i < half ? 'A' : 'B';
    await supabase
      .from('competition_players')
      .update({ group_letter: groupLetter })
      .eq('id', shuffledPlayers[i].id);
  }

  // Update competition to show players are grouped
  await supabase
    .from('competitions')
    .update({ phase: 'grouped' })
    .eq('id', competitionId);

  return true;
}


// Step 2: Start the automated competition (30-second countdown then Round 1)
export async function startAutomatedCompetition(competitionId) {
  const now = new Date();
  const countdownEndsAt = new Date(now.getTime() + COUNTDOWN_DURATION * 1000);

  await supabase
    .from('competitions')
    .update({
      phase: 'countdown',
      phase_ends_at: countdownEndsAt.toISOString(),
      current_round: 1,
      status: 'round_1'
    })
    .eq('id', competitionId);

  return true;
}

// Process phase transition (called when phase_ends_at is reached)
export async function processPhaseTransition(competitionId) {
  const { data: competition } = await supabase
    .from('competitions')
    .select('*, competition_players(*), competition_rounds(*)')
    .eq('id', competitionId)
    .single();

  if (!competition) return null;

  const now = new Date();
  const phaseEndsAt = competition.phase_ends_at ? new Date(competition.phase_ends_at) : null;

  // Check if phase has actually ended
  if (!phaseEndsAt || now < phaseEndsAt) {
    return { status: 'waiting', competition };
  }

  // Process based on current phase
  switch (competition.phase) {
    case 'countdown':
      return await startRoundActive(competitionId, competition.current_round);

    case 'round_active':
      return await endRoundAndStartBreak(competitionId, competition.current_round);

    case 'break':
      const nextRound = competition.current_round + 1;
      if (nextRound > 4) {
        return await completeCompetitionFinal(competitionId);
      }
      // Start countdown for next round
      return await startCountdownForRound(competitionId, nextRound);

    default:
      return { status: 'unknown', competition };
  }
}

// Start round_active phase (players can answer questions)
async function startRoundActive(competitionId, roundNumber) {
  const now = new Date();
  const roundDuration = ROUND_DURATIONS[roundNumber] || 60;
  const roundEndsAt = new Date(now.getTime() + roundDuration * 1000);

  // Reset current_round_score for all qualified players
  await supabase
    .from('competition_players')
    .update({ current_round_score: 0 })
    .eq('competition_id', competitionId)
    .eq('is_qualified', true);

  // Create round record
  const groupLetters = getGroupLettersForRound(roundNumber);
  
  const { data: round } = await supabase
    .from('competition_rounds')
    .insert({
      competition_id: competitionId,
      round_number: roundNumber,
      group_a_letter: groupLetters[0],
      group_b_letter: groupLetters[1],
      started_at: now.toISOString(),
      status: 'in_progress'
    })
    .select()
    .single();

  // Update competition phase
  await supabase
    .from('competitions')
    .update({
      phase: 'round_active',
      phase_ends_at: roundEndsAt.toISOString(),
      round_started_at: now.toISOString(),
      round_ends_at: roundEndsAt.toISOString()
    })
    .eq('id', competitionId);

  return { status: 'round_started', round };
}

// End round and start break (eliminate losing group, regroup winners)
async function endRoundAndStartBreak(competitionId, roundNumber) {
  const now = new Date();
  const breakEndsAt = new Date(now.getTime() + BREAK_DURATION * 1000);

  // Get round data
  const { data: round } = await supabase
    .from('competition_rounds')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('round_number', roundNumber)
    .single();

  if (!round) return { status: 'error', message: 'Round not found' };

  // Determine winner and loser
  const losingGroup = round.group_a_score < round.group_b_score 
    ? round.group_a_letter 
    : round.group_b_letter;
  const winningGroup = round.group_a_score >= round.group_b_score 
    ? round.group_a_letter 
    : round.group_b_letter;

  // Mark round as completed
  await supabase
    .from('competition_rounds')
    .update({
      status: 'completed',
      winning_group: winningGroup,
      ended_at: now.toISOString()
    })
    .eq('id', round.id);

  // For rounds 1-3: eliminate losing group and regroup winners
  if (roundNumber < 4) {
    // Eliminate losing group
    await supabase
      .from('competition_players')
      .update({
        is_qualified: false,
        round_eliminated: roundNumber
      })
      .eq('competition_id', competitionId)
      .eq('group_letter', losingGroup);

    // Regroup remaining players for next round
    await regroupPlayersForNextRound(competitionId, roundNumber + 1);
  }

  // If round 4 (final), go straight to completion
  if (roundNumber === 4) {
    return await completeCompetitionFinal(competitionId);
  }

  // Update competition to break phase
  await supabase
    .from('competitions')
    .update({
      phase: 'break',
      phase_ends_at: breakEndsAt.toISOString()
    })
    .eq('id', competitionId);

  return { status: 'break_started', winningGroup, losingGroup };
}

// Regroup qualified players for next round
async function regroupPlayersForNextRound(competitionId, nextRound) {
  const { data: qualifiedPlayers } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true);

  if (!qualifiedPlayers) return;

  const groupLetters = getGroupLettersForRound(nextRound);
  const shuffledPlayers = [...qualifiedPlayers].sort(() => Math.random() - 0.5);
  const halfCount = Math.floor(shuffledPlayers.length / 2);

  for (let i = 0; i < shuffledPlayers.length; i++) {
    const groupLetter = nextRound === 4 ? null : (i < halfCount ? groupLetters[0] : groupLetters[1]);
    await supabase
      .from('competition_players')
      .update({ group_letter: groupLetter })
      .eq('id', shuffledPlayers[i].id);
  }
}

// Start countdown for next round (after break)
async function startCountdownForRound(competitionId, roundNumber) {
  const now = new Date();
  const countdownEndsAt = new Date(now.getTime() + COUNTDOWN_DURATION * 1000);

  const statusMap = { 1: 'round_1', 2: 'round_2', 3: 'round_3', 4: 'final' };

  await supabase
    .from('competitions')
    .update({
      phase: 'countdown',
      phase_ends_at: countdownEndsAt.toISOString(),
      current_round: roundNumber,
      status: statusMap[roundNumber]
    })
    .eq('id', competitionId);

  return { status: 'countdown_started', roundNumber };
}

// Complete competition with final rankings
async function completeCompetitionFinal(competitionId) {
  const { data: players } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true)
    .order('total_score', { ascending: false })
    .limit(3);

  if (!players || players.length < 3) {
    // Handle case with less than 3 players
    console.error('Not enough qualified players for final ranking');
  }

  await supabase
    .from('competitions')
    .update({
      status: 'completed',
      phase: 'completed',
      phase_ends_at: null,
      completed_at: new Date().toISOString(),
      winner_user_id: players?.[0]?.user_id || null,
      second_place_user_id: players?.[1]?.user_id || null,
      third_place_user_id: players?.[2]?.user_id || null
    })
    .eq('id', competitionId);

  return { status: 'completed', winners: players };
}

// Helper function to get group letters for each round
function getGroupLettersForRound(round) {
  switch (round) {
    case 1: return ['A', 'B'];
    case 2: return ['C', 'D'];
    case 3: return ['E', 'F'];
    default: return [null, null];
  }
}




// ============= GAMEPLAY FUNCTIONS =============

// Submit an answer
export async function submitCompetitionAnswer(competitionId, playerId, questionId, score, isCorrect) {
  const { data: competition } = await supabase
    .from('competitions')
    .select('current_round')
    .eq('id', competitionId)
    .single();

  if (!competition) return null;

  const { data, error } = await supabase
    .from('competition_answers')
    .insert({
      competition_id: competitionId,
      round_number: competition.current_round,
      player_id: playerId,
      question_id: questionId,
      score,
      is_correct: isCorrect
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting answer:', error);
    return null;
  }

  return data;
}

// Get player's competition entry
export async function getPlayerCompetitionEntry(competitionId, userId) {
  const { data, error } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching player entry:', error);
  }
  return data;
}

// Get questions for competition round
export async function getCompetitionQuestions(limit = 10) {
  const { data, error } = await supabase
    .from('multiplayer_quiz')
    .select('*')
    .order('random()')
    .limit(limit);

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  return data;
}

// Search players for manual selection
export async function searchPlayers(searchTerm) {
  const { data, error } = await supabase
    .from('game_users')
    .select('user_id, player_name')
    .ilike('player_name', `%${searchTerm}%`)
    .limit(10);

  if (error) {
    console.error('Error searching players:', error);
    return [];
  }
  return data;
}

// Get all players sorted by total_score (for Top 7 display)
export async function getAllCompetitionPlayersSorted(competitionId) {
  const { data, error } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .order('total_score', { ascending: false });

  if (error) {
    console.error('Error fetching all players:', error);
    return [];
  }
  return data;
}
