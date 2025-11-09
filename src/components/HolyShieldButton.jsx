// src/components/HolyShieldButton.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "utils/sound";

export default function HolyShieldButton({ user, gameUser, refetch, effectsOn }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef(null);

  // Start countdown if shield is active
  useEffect(() => {
    if (!gameUser?.holy_shield_until) {
      setTimeLeft(0);
      return;
    }

    const until = new Date(gameUser.holy_shield_until).getTime();
    const updateTime = () => {
      const remaining = Math.max(0, until - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setTimeLeft(0);
      }
    };

    updateTime();
    intervalRef.current = setInterval(updateTime, 1000);
    return () => clearInterval(intervalRef.current);
  }, [gameUser?.holy_shield_until]);

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleActivate = async () => {
    if (!user?.id) return;
    if (!gameUser?.powerups_inventory?.holy_shield) return;
    if (timeLeft > 0) return; // Already active

    const expireTime = Date.now() + 5 * 60 * 1000; // 5 mins

    const updatedInventory = {
      ...gameUser.powerups_inventory,
      holy_shield: (gameUser.powerups_inventory.holy_shield ?? 0) - 1,
    };

    const { error } = await supabase
      .from("game_users")
      .update({
        powerups_inventory: updatedInventory,
        holy_shield_until: new Date(expireTime).toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error activating Holy Shield:", error);
      return;
    }

    playSound("holyShield", effectsOn); // ✅ Play sound only when successful
    await refetch();
  };

  const isActive = timeLeft > 0;
  const hasInventory = (gameUser?.powerups_inventory?.holy_shield ?? 0) > 0;

  return (
    <button
      onClick={handleActivate}
      disabled={!hasInventory || isActive}
      className={`flex flex-col items-center 
        text-[10px] sm:text-xs font-semibold 
        w-[22%] px-1 sm:px-2 py-1 rounded-lg
        bg-gradient-to-b from-green-200 to-green-300 
        hover:from-green-300 hover:to-green-400 
        disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 
        transition
        ${
          hasInventory && !isActive
            ? "bg-yellow-100 hover:bg-yellow-200 text-gray-800 active:scale-95"
            : isActive
            ? "bg-yellow-300 text-gray-800 animate-pulse shadow-lg shadow-yellow-400/70"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      style={
        isActive
          ? { boxShadow: "0 0 15px 3px rgba(255, 223, 0, 0.7)" }
          : {}
      }
    >
      <span className="text-lg">🛡️</span>
      <span className="mt-1 text-center text-[10px] sm:text-xs leading-tight">
        {isActive
          ? `Holy Shield (${formatTime(timeLeft)})`
          : "Holy Shield (5 mins)"}
      </span>
      <span className="mt-0.5 text-[9px] sm:text-[10px]">
        x{gameUser?.powerups_inventory?.holy_shield ?? 0}
      </span>
    </button>
  );
}
