import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { playSound, getVolume, setVolume, setSfxEnabled, isSfxEnabled } from "@/utils/sound";
import {
  getMusicVolume,
  setMusicVolume,
  setMusicEnabled,
  isMusicEnabled,
  playMusic,
} from "@/utils/music";
import { Lock, Volume2, Music2, User, Bell, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { Tooltip } from "@/components/ui/tooltip";
import Switch from "@/components/ui/Switch";
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

export default function SettingsModal({
  isOpen,
  onClose,
  gameUser,
  onSave,
  sound,
  setSound,
  highestCompletedPhase = 0,
}) {
  const [name, setName] = useState(gameUser?.player_name || "");
  const [loading, setLoading] = useState(false);
  const [effectsOn, setEffectsOn] = useState(
    gameUser?.effects_on ?? isSfxEnabled()
  );
  const [selectedAvatar, setSelectedAvatar] = useState(gameUser?.selected_avatar || 'avatar1');
  const [sfxVol, setSfxVol] = useState(getVolume() * 100);
  const [musicOn, setMusicOnState] = useState(isMusicEnabled());
  const [musicVol, setMusicVol] = useState(getMusicVolume() * 100);

  const audioRef = useRef(null);
  const navigate = useNavigate();

  const isAvatarUnlocked = (avatarId) => {
    const avatar = AVATARS.find(a => a.id === avatarId);
    return avatar ? highestCompletedPhase >= avatar.unlockPhase : false;
  };

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
      onSave({ name, sound, effectsOn, selectedAvatar });
      onClose();
    } else {
      toast.error("Failed to save settings");
    }
  };

  const handleAdminLogin = () => {
    onClose();
    navigate("/admin/dashboard");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="modal-3d relative w-full max-w-md overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col">

        {/* Header — matches the app's standard modal header pattern */}
        <div className="modal-3d-header sticky top-0 z-10 flex items-center justify-between p-4 rounded-t-2xl flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
            <span className="text-xl sm:text-2xl">⚙️</span> Player Settings
          </h2>
          <button
            onClick={() => { playSound("back", effectsOn); onClose(); }}
            aria-label="Close settings"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-3 p-4">
          <p className="text-center text-[10px] sm:text-xs text-purple-700/60 -mt-1">
            <i>Refresh after saving to see changes</i>
          </p>

          {/* Player Name */}
          <div className="row-3d !items-stretch flex-col">
            <div className="flex items-center gap-3 mb-2">
              <span className="icon-orb !w-9 !h-9 !text-base"><User className="w-4 h-4" /></span>
              <label className="text-sm font-bold text-purple-900">Player Name</label>
            </div>
            <input
              className="w-full border-2 border-purple-200 rounded-xl px-3 py-2 text-sm shadow-inner focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none bg-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your player name"
            />
          </div>

          {/* Sound Effects */}
          <div className="row-3d !items-stretch flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-purple-900 flex items-center gap-2">
                <span className="icon-orb !w-9 !h-9 !text-base"><Volume2 className="w-4 h-4" /></span>
                Sound Effects
              </span>
              <Switch
                checked={effectsOn}
                onChange={(next) => {
                  setEffectsOn(next);
                  setSfxEnabled(next);
                  if (next) playSound("select", true);
                }}
                color="green"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVol}
                disabled={!effectsOn}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setSfxVol(v);
                  setVolume(v / 100);
                }}
                onMouseUp={() => playSound("tap", effectsOn)}
                onTouchEnd={() => playSound("tap", effectsOn)}
                className="flex-1 h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:opacity-40"
              />
              <span className="text-xs text-purple-700 font-bold w-9 text-right">{Math.round(sfxVol)}%</span>
              <button
                onClick={() => playSound("correct", effectsOn)}
                disabled={!effectsOn}
                className="chip-3d text-[10px] sm:text-xs !py-1 !px-2 disabled:opacity-40"
              >
                Test
              </button>
            </div>
          </div>

          {/* Background Music */}
          <div className="row-3d !items-stretch flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-purple-900 flex items-center gap-2">
                <span className="icon-orb pink !w-9 !h-9 !text-base"><Music2 className="w-4 h-4" /></span>
                Background Music
              </span>
              <Switch
                checked={musicOn}
                onChange={(next) => {
                  setMusicOnState(next);
                  setMusicEnabled(next);
                  if (next) playMusic("menu");
                }}
                color="purple"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={musicVol}
                disabled={!musicOn}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setMusicVol(v);
                  setMusicVolume(v / 100);
                }}
                className="flex-1 h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
              />
              <span className="text-xs text-purple-700 font-bold w-9 text-right">{Math.round(musicVol)}%</span>
            </div>
            <p className="text-[10px] sm:text-xs text-purple-700/60 mt-1">
              Uplifting orchestral loops on map, gameplay & menus
            </p>
            <audio ref={audioRef} style={{ display: "none" }} />
          </div>

          {/* Avatar Selection */}
          <div className="row-3d !items-stretch flex-col">
            <label className="text-sm font-bold text-purple-900 mb-3 block">🎭 Choose Your Avatar</label>
            <div className="grid grid-cols-5 gap-2">
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
                      className={`relative rounded-full p-1.5 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-yellow-200 to-amber-400 ring-4 ring-yellow-300 scale-110 shadow-[0_3px_0_rgba(180,83,9,0.5)]'
                          : unlocked
                          ? 'bg-purple-50 border-2 border-purple-200 hover:border-purple-400 hover:scale-105'
                          : 'bg-gray-100 border-2 border-gray-200 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-2xl sm:text-3xl">{avatar.emoji}</div>
                      {!unlocked && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Lock className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {!unlocked && (
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          P{avatar.unlockPhase}
                        </div>
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <p className="text-[10px] sm:text-xs text-purple-700/60 mt-3 text-center">
              Complete phases to unlock more avatars!
            </p>
          </div>

          {/* Notification Settings */}
          <div className="row-3d !items-stretch flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-purple-900 flex items-center gap-2">
                <span className="icon-orb green !w-9 !h-9 !text-base"><Bell className="w-4 h-4" /></span>
                Notifications
              </span>
              <span className="chip-3d text-[9px] sm:text-[10px] !py-1">PWA</span>
            </div>
            <p className="text-[10px] sm:text-xs text-purple-700/60 mb-3">
              Enable push notifications to get alerts about weekly challenges, lives, and more!
            </p>
            <button
              onClick={async () => {
                const granted = await requestNotificationPermission();
                if (granted) {
                  await subscribeToPushNotifications(gameUser.user_id);
                  toast.success('Notifications enabled!');
                } else {
                  toast.error('Please enable notifications in your browser settings.');
                }
              }}
              className="btn-orb w-full font-bold text-xs sm:text-sm py-2"
            >
              {areNotificationsEnabled() ? '✅ Notifications Enabled' : '🔔 Enable Notifications'}
            </button>
          </div>

          {/* Admin Login */}
          {gameUser?.is_admin && (
            <div className="row-3d !items-stretch flex-col">
              <button
                onClick={() => { playSound("click", effectsOn); handleAdminLogin(); }}
                className="btn-orb btn-orb-purple w-full font-bold text-xs sm:text-sm py-2 flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" /> Admin Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 sm:gap-3 p-4 border-t-2 border-purple-100 flex-shrink-0">
          <button
            onClick={() => { playSound("back", effectsOn); onClose(); }}
            className="chip-3d px-4 py-2 font-bold text-xs sm:text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => { playSound("select", effectsOn); handleSave(); }}
            disabled={loading}
            className="btn-orb btn-orb-pink px-4 py-2 font-bold text-xs sm:text-sm disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
