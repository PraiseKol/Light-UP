import { supabase } from "@/lib/supabaseClient";

// Fetch top players from monthly leaderboard (default 20 for competition)
export async function fetchMonthlyTopPlayers(limit = 20) {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

  const { data: progressData, error: progressError } = await supabase
    .from('progress')
    .select('user_id, score')
    .gte('completed_at', startOfMonth.toISOString())
    .lte('completed_at', endOfMonth.toISOString());

  if (progressError) {
    console.error('Error fetching monthly progress:', progressError);
    return [];
  }

  // Aggregate scores by user
  const userScores = {};
  progressData.forEach(entry => {
    if (!userScores[entry.user_id]) {
      userScores[entry.user_id] = 0;
    }
    userScores[entry.user_id] += entry.score || 0;
  });

  // Sort and get top players
  const sortedUsers = Object.entries(userScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  // Fetch player names
  const userIds = sortedUsers.map(([userId]) => userId);
  const { data: usersData } = await supabase
    .from('game_users')
    .select('user_id, player_name')
    .in('user_id', userIds);

  const userMap = {};
  usersData?.forEach(u => {
    userMap[u.user_id] = u.player_name;
  });

  return sortedUsers.map(([userId, score], idx) => ({
    user_id: userId,
    player_name: userMap[userId] || 'Unknown Player',
    score,
    rank: idx + 1,
    selection_type: 'monthly_top'
  }));
}

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
    .single();

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
    .single();

  if (error) {
    console.error('Error fetching competition:', error);
    return null;
  }
  return data;
}

// Start a round
export async function startRound(competitionId, roundNumber) {
  const roundDuration = 60; // 1 minute per round
  const now = new Date();
  const endsAt = new Date(now.getTime() + roundDuration * 1000);

  // Get players for this round
  const { data: players } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true);

  if (!players || players.length === 0) return null;

  // Assign groups based on round
  const groupLetters = getGroupLettersForRound(roundNumber);
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const halfCount = Math.floor(shuffledPlayers.length / 2);

  // Update players with group assignments
  for (let i = 0; i < shuffledPlayers.length; i++) {
    const groupLetter = i < halfCount ? groupLetters[0] : groupLetters[1];
    await supabase
      .from('competition_players')
      .update({ 
        group_letter: roundNumber === 4 ? null : groupLetter,
        current_round_score: 0
      })
      .eq('id', shuffledPlayers[i].id);
  }

  // Create round record
  const { data: round, error: roundError } = await supabase
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

  if (roundError) {
    console.error('Error creating round:', roundError);
    return null;
  }

  // Update competition status
  const statusMap = { 1: 'round_1', 2: 'round_2', 3: 'round_3', 4: 'final' };
  await supabase
    .from('competitions')
    .update({
      status: statusMap[roundNumber],
      current_round: roundNumber,
      round_started_at: now.toISOString(),
      round_ends_at: endsAt.toISOString()
    })
    .eq('id', competitionId);

  return round;
}

function getGroupLettersForRound(round) {
  switch (round) {
    case 1: return ['A', 'B'];
    case 2: return ['C', 'D'];
    case 3: return ['E', 'F'];
    default: return [null, null];
  }
}

// End a round and eliminate losing group
export async function endRound(competitionId, roundNumber) {
  const { data: round } = await supabase
    .from('competition_rounds')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('round_number', roundNumber)
    .single();

  if (!round) return null;

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
      ended_at: new Date().toISOString()
    })
    .eq('id', round.id);

  // Eliminate losing group players (only for rounds 1-3)
  if (roundNumber < 4) {
    await supabase
      .from('competition_players')
      .update({
        is_qualified: false,
        round_eliminated: roundNumber
      })
      .eq('competition_id', competitionId)
      .eq('group_letter', losingGroup);
  }

  return { winningGroup, losingGroup };
}

// Complete competition with final rankings
export async function completeCompetition(competitionId) {
  const { data: players } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true)
    .order('total_score', { ascending: false })
    .limit(3);

  if (!players || players.length < 3) return null;

  await supabase
    .from('competitions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      winner_user_id: players[0]?.user_id,
      second_place_user_id: players[1]?.user_id,
      third_place_user_id: players[2]?.user_id
    })
    .eq('id', competitionId);

  return players;
}

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
    .single();

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
