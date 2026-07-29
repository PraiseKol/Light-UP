import { supabase } from "@/lib/supabaseClient";

// ============= COMPETITION TIMING CONSTANTS =============
// NOTE: these must match the values hard-coded inside the
// process_competition_phase_transition() Postgres function (the actual
// authority now — see the migration "competition_server_side_automation").
// Kept here only for client-side display (timer text etc.), not for
// driving any actual state transitions anymore.
export const ROUND_DURATIONS = {
  1: 120,  // 2 minutes
  2: 60,   // 1 minute
  3: 60,   // 1 minute
  4: 120   // 2 minutes (final)
};

export const COUNTDOWN_DURATION = 30;  // 30 seconds before round starts
export const BREAK_DURATION = 30;      // 30 seconds between rounds


// ============= COMPETITION MANAGEMENT =============

// Cancel an active competition (admin only). Runs as one atomic Postgres
// transaction server-side now — previously this was 4 sequential client
// deletes with no rollback if one failed partway through.
export async function cancelCompetition(competitionId) {
  const { data, error } = await supabase.rpc('cancel_competition_admin', {
    p_competition_id: competitionId,
  });
  if (error) {
    console.error('Error cancelling competition:', error);
    return false;
  }
  return !!data;
}

// Create a new competition
export async function createCompetition(players) {
  const { data: { user } } = await supabase.auth.getUser();

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

// Get the current/most recent competition — used for both the live
// player/viewer screens (while active) AND the results board (once
// completed). Previously this excluded status='completed' entirely,
// which meant the results screen went blank the instant a competition
// finished, since this was the only fetch it used.
export async function getActiveCompetition() {
  const { data, error } = await supabase
    .from('competitions')
    .select(`
      *,
      competition_players (*),
      competition_rounds (*)
    `)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching competition:', error);
  }
  return data;
}

// Full per-round history (group + score for every round each player
// played) — powers the round-by-round results board.
export async function getCompetitionRoundHistory(competitionId) {
  const { data, error } = await supabase
    .from('competition_player_rounds')
    .select('*')
    .eq('competition_id', competitionId);

  if (error) {
    console.error('Error fetching round history:', error);
    return [];
  }
  return data || [];
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
// (Admin-only action, still fine as a direct client write — RLS already
// requires admin role for competition_players writes.)
export async function groupPlayersForCompetition(competitionId) {
  const { data: players, error: fetchError } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true);

  if (fetchError) {
    console.error('Error fetching players to group:', fetchError);
    return false;
  }

  const count = players?.length || 0;
  if (count !== 16 && count !== 24) {
    console.error(`Need exactly 16 or 24 players to group (got ${count})`);
    return false;
  }

  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const half = count / 2;

  for (let i = 0; i < shuffledPlayers.length; i++) {
    const groupLetter = i < half ? 'A' : 'B';
    const { error } = await supabase
      .from('competition_players')
      .update({ group_letter: groupLetter })
      .eq('id', shuffledPlayers[i].id);
    if (error) console.error('Error assigning group to player:', shuffledPlayers[i].id, error);
  }

  const { error: phaseError } = await supabase
    .from('competitions')
    .update({ phase: 'grouped' })
    .eq('id', competitionId);
  if (phaseError) console.error('Error updating competition to grouped:', phaseError);

  return true;
}

// Step 2: Start the automated competition (30-second countdown then Round 1)
export async function startAutomatedCompetition(competitionId) {
  const now = new Date();
  const countdownEndsAt = new Date(now.getTime() + COUNTDOWN_DURATION * 1000);

  const { error } = await supabase
    .from('competitions')
    .update({
      phase: 'countdown',
      phase_ends_at: countdownEndsAt.toISOString(),
      current_round: 1,
      status: 'round_1'
    })
    .eq('id', competitionId);

  if (error) {
    console.error('Error starting competition:', error);
    return false;
  }
  return true;
}

// Process phase transition. As of the server-side automation fix, this is
// now a thin wrapper around a Postgres RPC (process_competition_phase_transition)
// that runs with elevated privilege and holds a row lock for the duration
// of the transaction — so it's safe to call from ANY connected client
// (previously this ran the transition logic directly from the browser,
// which only worked if the caller happened to be an admin, since the
// writes it made were RLS-locked; non-admin callers silently failed).
//
// A pg_cron job (`competition-automation-sweep`, every 10s) calls the same
// RPC as a backup, so competitions now advance even with nobody connected
// — this client-side call just makes it feel instant when someone is.
export async function processPhaseTransition(competitionId) {
  const { data, error } = await supabase.rpc('process_competition_phase_transition', {
    p_competition_id: competitionId,
  });

  if (error) {
    console.error('Error processing phase transition:', error);
    return { status: 'error', message: error.message };
  }

  return data;
}

// ============= GAMEPLAY FUNCTIONS =============

// Submit an answer
export async function submitCompetitionAnswer(competitionId, playerId, questionId, score, isCorrect) {
  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select('current_round')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) {
    console.error('Error fetching competition for answer submission:', compError);
    return null;
  }

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

// Get questions for a competition round. Previously used the fragile
// `.order('random()')` client-side pattern with no protection against the
// same question repeating across rounds of one competition — now backed
// by a real server-side RPC that does true random selection AND tracks
// which questions this competition has already used.
export async function getCompetitionQuestions(competitionId, limit = 10) {
  const { data, error } = await supabase.rpc('get_competition_round_questions', {
    p_competition_id: competitionId,
    p_limit: limit,
  });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
  return data || [];
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
