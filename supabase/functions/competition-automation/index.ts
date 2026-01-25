import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Competition timing constants (must match client-side)
const ROUND_DURATIONS: Record<number, number> = {
  1: 120,  // 2 minutes
  2: 60,   // 1 minute
  3: 60,   // 1 minute
  4: 120   // 2 minutes (final)
};

const COUNTDOWN_DURATION = 30;  // 30 seconds
const BREAK_DURATION = 30;      // 30 seconds

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { competitionId } = await req.json();

    if (!competitionId) {
      return new Response(
        JSON.stringify({ error: 'competitionId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get competition
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('*, competition_players(*), competition_rounds(*)')
      .eq('id', competitionId)
      .single();

    if (compError || !competition) {
      return new Response(
        JSON.stringify({ error: 'Competition not found', details: compError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const phaseEndsAt = competition.phase_ends_at ? new Date(competition.phase_ends_at) : null;

    // Check if phase has ended
    if (!phaseEndsAt || now < phaseEndsAt) {
      return new Response(
        JSON.stringify({ 
          status: 'waiting', 
          phase: competition.phase,
          remainingMs: phaseEndsAt ? phaseEndsAt.getTime() - now.getTime() : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process phase transition
    let result;
    switch (competition.phase) {
      case 'countdown':
        result = await startRoundActive(supabase, competitionId, competition.current_round);
        break;

      case 'round_active':
        result = await endRoundAndStartBreak(supabase, competitionId, competition.current_round);
        break;

      case 'break':
        const nextRound = competition.current_round + 1;
        if (nextRound > 4) {
          result = await completeCompetition(supabase, competitionId);
        } else {
          result = await startCountdownForRound(supabase, competitionId, nextRound);
        }
        break;

      default:
        result = { status: 'no_action', phase: competition.phase };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Competition automation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Start round_active phase
async function startRoundActive(supabase: any, competitionId: string, roundNumber: number) {
  const now = new Date();
  const roundDuration = ROUND_DURATIONS[roundNumber] || 60;
  const roundEndsAt = new Date(now.getTime() + roundDuration * 1000);

  // Reset current_round_score for all qualified players
  await supabase
    .from('competition_players')
    .update({ current_round_score: 0 })
    .eq('competition_id', competitionId)
    .eq('is_qualified', true);

  // Get group letters for this round
  const groupLetters = getGroupLettersForRound(roundNumber);

  // Check if round already exists
  const { data: existingRound } = await supabase
    .from('competition_rounds')
    .select('id')
    .eq('competition_id', competitionId)
    .eq('round_number', roundNumber)
    .maybeSingle();

  if (!existingRound) {
    // Create round record
    await supabase
      .from('competition_rounds')
      .insert({
        competition_id: competitionId,
        round_number: roundNumber,
        group_a_letter: groupLetters[0],
        group_b_letter: groupLetters[1],
        started_at: now.toISOString(),
        status: 'in_progress'
      });
  } else {
    // Update existing round
    await supabase
      .from('competition_rounds')
      .update({
        started_at: now.toISOString(),
        status: 'in_progress'
      })
      .eq('id', existingRound.id);
  }

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

  return { status: 'round_started', roundNumber, endsAt: roundEndsAt.toISOString() };
}

// End round and start break
async function endRoundAndStartBreak(supabase: any, competitionId: string, roundNumber: number) {
  const now = new Date();

  // Get round data
  const { data: round } = await supabase
    .from('competition_rounds')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('round_number', roundNumber)
    .single();

  if (!round) {
    return { status: 'error', message: 'Round not found' };
  }

  // Determine winner and loser (tie goes to group A/C/E)
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

  // For rounds 1-3: eliminate losing group
  if (roundNumber < 4 && losingGroup) {
    await supabase
      .from('competition_players')
      .update({
        is_qualified: false,
        round_eliminated: roundNumber
      })
      .eq('competition_id', competitionId)
      .eq('group_letter', losingGroup);

    // Regroup remaining players for next round
    await regroupPlayersForNextRound(supabase, competitionId, roundNumber + 1);
  }

  // If round 4 (final), complete competition
  if (roundNumber === 4) {
    return await completeCompetition(supabase, competitionId);
  }

  // Start break phase
  const breakEndsAt = new Date(now.getTime() + BREAK_DURATION * 1000);
  
  await supabase
    .from('competitions')
    .update({
      phase: 'break',
      phase_ends_at: breakEndsAt.toISOString()
    })
    .eq('id', competitionId);

  return { 
    status: 'break_started', 
    winningGroup, 
    losingGroup, 
    breakEndsAt: breakEndsAt.toISOString() 
  };
}

// Regroup qualified players for next round
async function regroupPlayersForNextRound(supabase: any, competitionId: string, nextRound: number) {
  const { data: qualifiedPlayers } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true);

  if (!qualifiedPlayers || qualifiedPlayers.length === 0) return;

  const groupLetters = getGroupLettersForRound(nextRound);
  
  // Shuffle players
  const shuffledPlayers = [...qualifiedPlayers].sort(() => Math.random() - 0.5);
  const halfCount = Math.floor(shuffledPlayers.length / 2);

  // Assign new groups
  for (let i = 0; i < shuffledPlayers.length; i++) {
    const groupLetter = nextRound === 4 ? null : (i < halfCount ? groupLetters[0] : groupLetters[1]);
    await supabase
      .from('competition_players')
      .update({ group_letter: groupLetter })
      .eq('id', shuffledPlayers[i].id);
  }
}

// Start countdown for next round
async function startCountdownForRound(supabase: any, competitionId: string, roundNumber: number) {
  const now = new Date();
  const countdownEndsAt = new Date(now.getTime() + COUNTDOWN_DURATION * 1000);

  const statusMap: Record<number, string> = { 
    1: 'round_1', 
    2: 'round_2', 
    3: 'round_3', 
    4: 'final' 
  };

  await supabase
    .from('competitions')
    .update({
      phase: 'countdown',
      phase_ends_at: countdownEndsAt.toISOString(),
      current_round: roundNumber,
      status: statusMap[roundNumber]
    })
    .eq('id', competitionId);

  return { 
    status: 'countdown_started', 
    roundNumber, 
    countdownEndsAt: countdownEndsAt.toISOString() 
  };
}

// Complete competition
async function completeCompetition(supabase: any, competitionId: string) {
  // Get top 3 players by total_score
  const { data: players } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('is_qualified', true)
    .order('total_score', { ascending: false })
    .limit(3);

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

  return { 
    status: 'completed', 
    winners: players?.map((p: any) => ({ 
      user_id: p.user_id, 
      player_name: p.player_name, 
      total_score: p.total_score 
    })) 
  };
}

// Helper function
function getGroupLettersForRound(round: number): [string | null, string | null] {
  switch (round) {
    case 1: return ['A', 'B'];
    case 2: return ['C', 'D'];
    case 3: return ['E', 'F'];
    default: return [null, null];
  }
}
