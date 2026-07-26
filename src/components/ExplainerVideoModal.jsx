import { useState } from "react";
import Modal from "./ui/modal";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "./ui/button";

export default function ExplainerVideoModal({ isOpen, onClose, userId }) {
  const [isClosing, setIsClosing] = useState(false);

  const handleMarkAsSeen = async () => {
    if (isClosing) return;
    setIsClosing(true);

    try {
      await supabase
        .from("game_users")
        .update({ has_seen_explainer_video: true })
        .eq("user_id", userId);
    } catch (error) {
      console.error("Error marking video as seen:", error);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleMarkAsSeen}
      title="🎬 Welcome to LightUP!"
      className="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/PoabuvlYujg"
            title="LightUP Explainer Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          
          {/* Skip Button - Always visible overlay */}
          <button
            onClick={handleMarkAsSeen}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white px-4 py-2 rounded-lg font-semibold transition-all z-10"
          >
            Skip Video
          </button>
        </div>

        {/* Video Guide Text */}
        <div className="row-3d !items-stretch flex-col">
          <h3 className="font-black text-purple-900 text-base mb-2">📖 Quick Start Guide</h3>
          <ul className="space-y-1.5 text-sm text-purple-800/80">
            <li>✅ Navigate the map by scrolling through phases and levels</li>
            <li>💚 You have 5 lives - they regenerate every 30 minutes</li>
            <li>🎯 Complete levels in different game modes</li>
            <li>⭐ Earn talents to buy powerful power-ups</li>
            <li>🏆 Compete in weekly challenges and climb the leaderboard</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleMarkAsSeen}
            className="btn-orb btn-orb-purple text-white font-bold px-8 py-3 text-sm sm:text-base"
          >
            Got it! Let's Play 🎮
          </button>
        </div>
      </div>
    </Modal>
  );
}
