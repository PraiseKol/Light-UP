import { supabase } from "./supabaseClient";

export const fetchRandomScripture = async () => {
  const { data, error } = await supabase
    .from("scriptures")
    .select("text")
    .order("id", { ascending: true });

  if (error) {
    console.error("❌ Supabase error:", error);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn("⚠️ No scriptures found in the database.");
    return null;
  }

  // console.log("✅ Scriptures fetched from Supabase:", data);

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex].text;
};
