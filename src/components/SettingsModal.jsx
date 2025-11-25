import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/utils/sound";
import { Lock } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { 
  subscribeToPushNotifications, 
  requestNotificationPermission,
  areNotificationsEnabled 
} from "@/utils/pushNotifications";

// Avatar configuration with unlock requirements
const AVATARS = [
  { id: 'avatar1', name: 'Dove', emoji: '🕊️', unlockPhase: 0 },
  { id: 'avatar2', name: 'Lamb', emoji: '🐑', unlockPhase: 0 },
  { id: 'avatar3', name: 'Lion', emoji: '🦁', unlockPhase: 5 },
  { id: 'avatar4', name: 'Eagle', emoji: '🦅', unlockPhase: 10 },
  { id: 'avatar5', name: 'Crown', emoji: '👑', unlockPhase: 20 },
];

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
  sound,
  setSound,
  highestCompletedPhase = 0, // Pass from parent
}) {
  const [name, setName] = useState(gameUser?.player_name || "");
  const [loading, setLoading] = useState(false);
  const [effectsOn, setEffectsOn] = useState(gameUser?.effects_on ?? true);
  const [selectedAvatar, setSelectedAvatar] = useState(gameUser?.selected_avatar || 'avatar1');

  const audioRef = useRef(null);
  const navigate = useNavigate();

  const isAvatarUnlocked = (avatarId) => {
    const avatar = AVATARS.find(a => a.id === avatarId);
    return avatar ? highestCompletedPhase >= avatar.unlockPhase : false;
  };

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

  // When gameUser changes, sync local inputs
  useEffect(() => {
    setName(gameUser?.player_name || "");
    setEffectsOn(gameUser?.effects_on ?? true);
    setSelectedAvatar(gameUser?.selected_avatar || 'avatar1');
  }, [gameUser]);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("game_users")
      .update({
        player_name: name,
        sound,
        effects_on: effectsOn,
        selected_avatar: selectedAvatar,
      })
      .eq("user_id", gameUser.user_id);

    setLoading(false);

    if (!error) {
      onSave({
        name,
        sound,
        effectsOn,
        selectedAvatar,
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
      <div className="relative bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6 rounded-2xl shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] w-[90%] max-w-md border-2 border-pink-200">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-100/10 to-transparent pointer-events-none" />

        <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4 text-center">
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

        {/* Avatar Selection */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <label className="text-sm font-medium mb-3 block text-gray-800">🎭 Choose Your Avatar</label>
          <div className="grid grid-cols-5 gap-3">
            {AVATARS.map(avatar => {
              const unlocked = isAvatarUnlocked(avatar.id);
              const isSelected = selectedAvatar === avatar.id;
              return (
                <Tooltip 
                  key={avatar.id} 
                  content={unlocked ? avatar.name : `Unlock at Phase ${avatar.unlockPhase}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (unlocked) {
                        setSelectedAvatar(avatar.id);
                        playSound("select", effectsOn);
                      }
                    }}
                    disabled={!unlocked}
                    className={`relative rounded-full border-3 p-2 transition-all ${
                      isSelected 
                        ? 'border-yellow-400 ring-4 ring-yellow-300 scale-110 shadow-lg' 
                        : unlocked 
                        ? 'border-blue-300 hover:border-blue-400 hover:scale-105' 
                        : 'border-gray-300 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-3xl">{avatar.emoji}</div>
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {!unlocked && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        Phase {avatar.unlockPhase}
                      </div>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Complete phases to unlock more avatars!
          </p>
        </div>

        {/* Notification Settings */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-800">🔔 Notifications</span>
            <span className="text-xs text-gray-500">PWA Feature</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Enable push notifications to get alerts about weekly challenges, lives, and more!
          </p>
          <Button
            onClick={async () => {
              const granted = await requestNotificationPermission();
              if (granted) {
                await subscribeToPushNotifications(gameUser.user_id);
                alert('✅ Notifications enabled!');
              } else {
                alert('❌ Please enable notifications in your browser settings.');
              }
            }}
            variant="secondary"
            className="w-full bg-blue-500 text-white hover:bg-blue-600 rounded-lg shadow-md text-sm"
          >
            {areNotificationsEnabled() ? '✅ Notifications Enabled' : '🔔 Enable Notifications'}
          </Button>
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
            className="bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 hover:scale-105 text-white px-4 py-2 rounded-full shadow-[0_4px_0_#be185d] active:translate-y-1 active:shadow-[0_2px_0_#be185d] font-bold"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
