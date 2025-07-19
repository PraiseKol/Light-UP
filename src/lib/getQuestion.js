import { supabase } from "lib/supabaseClient";

export async function getQuestion(phaseNumber, levelNumber) {
  if (!phaseNumber || !levelNumber) {
    console.warn("⚠️ Invalid input to getQuestion:", { phaseNumber, levelNumber });
    return null;
  }

  const { data, error } = await supabase
    .from("quiz")
    .select("*")
    .eq("phase_number", phaseNumber)
    .eq("level_number", levelNumber)
    .single();

  if (error) {
    console.error("❌ Error fetching question:", error);
    return null;
  }

  return data;
}
