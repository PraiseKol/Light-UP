import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/utils/sound";

// const soundMap = {
//   default: null,
//   shifts: "/sounds/shifts.m4a",
//   peace: "/sounds/peace.m4a",
//   juba: "/sounds/juba.mp3",
// };

export default function SettingsModal({
  isOpen,
  onClose,
  gameUser,
  onSave,
  sound, // <-- now a prop from App.jsx
  setSound, // <-- function to update App.jsx state
}) {
  const [name, setName] = useState(gameUser?.player_name || "");
  const [loading, setLoading] = useState(false);
  const [effectsOn, setEffectsOn] = useState(gameUser?.effects_on ?? true);

  const audioRef = useRef(null);
  const navigate = useNavigate();

  // Play preview audio when sound prop changes (user selects a new sound)
  // useEffect(() => {
  //   if (!audioRef.current) return;

  //   if (soundMap[sound]) {
  //     audioRef.current.src = soundMap[sound];
  //     audioRef.current.volume = 0.3;
  //     audioRef.current.loop = true;
  //     audioRef.current.play().catch(() => {
  //       // ignore autoplay errors silently
  //     });
  //   } else {
  //     audioRef.current.pause();
  //     audioRef.current.currentTime = 0;
  //     audioRef.current.src = "";
  //   }

  //   return () => {
  //     if (audioRef.current) audioRef.current.pause();
  //   };
  // }, [sound]);

  // When gameUser changes, sync local inputs for name and effectsOn only
  useEffect(() => {
    setName(gameUser?.player_name || "");
    setEffectsOn(gameUser?.effects_on ?? true);
  }, [gameUser]);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("game_users")
      .update({
        player_name: name,
        sound, // send current selected sound prop to DB
        effects_on: effectsOn,
      })
      .eq("user_id", gameUser.user_id);

    setLoading(false);

    if (!error) {
      onSave({
        name,
        sound,
        effectsOn,
      });
      onClose();
    } else {
      alert("Failed to save settings");
    }
  };

  const handleAdminLogin = () => {
    onClose();
    navigate("/admin/login");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-gradient-to-br from-white via-blue-50 to-sky-100 p-6 rounded-2xl shadow-2xl w-[90%] max-w-md border border-blue-200">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-100/10 to-transparent pointer-events-none" />

        <h2 className="text-2xl font-bold text-blue-800 mb-4 text-center">
          ⚙️ Player Settings
        </h2>
        <div className="text-center text-xs text-blue-900"><i>Refresh after saving to see changes </i> </div>
        {/* Player Name */}
        <div className="mb-4">
          <label className="text-sm text-gray-700 mb-1 block font-medium">
            Player Name
          </label>
          <input
            className="w-full border border-blue-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your player name"
          />
        </div>

        {/* Effects Toggle */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="text-sm font-medium text-gray-800">✨ Effects</span>
          <button
            onClick={() => {
              const newEffects = !effectsOn;
              setEffectsOn(newEffects);
              playSound("switch", newEffects); // 🔊 play toggle sound
            }}
            className={`px-4 py-1.5 text-sm rounded-full font-semibold shadow-sm transition-all ${
              effectsOn
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {effectsOn ? "On" : "Off"}
          </button>
        </div>

        {/* Sound Picker */}
        <div className="flex flex-col border-t border-gray-200 pt-4">
          <label className="text-sm font-medium mb-1 text-gray-800">
            🔊 Sound
          </label>
          <select
            className="border border-blue-300 px-3 py-2 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            value={sound}
            onChange={(e) => setSound(e.target.value)} // call setSound from props immediately
          >
            <option value="default">Coming Soon</option>
            {/* <option value="shifts">Time for Shifts - Godswill Oyor</option>
            <option value="peace">Sound of Peace - Joshua Mike-Bamiloye</option>
            <option value="juba">Juba - Anendlessocean</option> */}
          </select>

          {/* Hidden audio player for preview */}
          <audio ref={audioRef} style={{ display: "none" }} />
        </div>

        {/* Admin Login */}
        {gameUser?.is_admin && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <Button
              onClick={() => {
                playSound("click", effectsOn); // 🔊 sound effect
                handleAdminLogin();
              }}
              variant="secondary"
              className="w-full bg-purple-600 text-white hover:bg-purple-500 rounded-lg shadow-md"
            >
              🛡 Admin Login
            </Button>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
          <Button
            onClick={() => {
              playSound("back", effectsOn); // 🔊 sound effect
              onClose();
            }}
            variant="ghost"
            className="px-4 py-2 rounded-lg"
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              playSound("select", effectsOn); // 🔊 play save sound
              handleSave();
            }}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
