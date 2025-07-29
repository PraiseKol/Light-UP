import { useState } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";

export default function SettingsModal({ isOpen, onClose, gameUser, onSave }) {
  const [name, setName] = useState(gameUser?.player_name || "");
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(true); // dummy
  const [wallpaper, setWallpaper] = useState("default"); // dummy

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("game_users")
      .update({ player_name: name })
      .eq("user_id", gameUser.user_id);

    setLoading(false);

    if (!error) {
      onSave(name);
      onClose();
    } else {
      alert("Failed to save name");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">Player Settings</h2>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Player Name</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your player name"
          />
        </div>

        {/* Dummy Sound Toggle */}
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-sm font-medium">Sound</span>
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`px-3 py-1 text-sm rounded-full ${
              soundOn ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {soundOn ? "On" : "Off"}
          </button>
        </div>

        {/* Dummy Wallpaper Picker */}
        <div className="flex flex-col border-t pt-4">
          <label className="text-sm font-medium mb-1">Wallpaper</label>
          <select
            className="border px-3 py-1 rounded text-sm"
            value={wallpaper}
            onChange={(e) => setWallpaper(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="forest">Forest</option>
            <option value="stars">Starry Night</option>
            <option value="ocean">Ocean</option>
          </select>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
