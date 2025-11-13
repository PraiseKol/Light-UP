import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { playSound } from "@/utils/sound";
import Modal from "@/components/ui/modal";

export default function FeedbackButton({ small, fullWidth, effectsOn = true }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const submitFeedback = async () => {
    if (!message.trim()) {
      setStatusMessage("Please enter your feedback.");
      return;
    }

    setLoading(true);
    setStatusMessage("");

    const { data: gameUser } = await supabase
      .from("game_users")
      .select("player_name")
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      player_name: gameUser?.player_name || "Unknown",
      message: message.trim(),
      status: "unread",
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setStatusMessage("❌ Failed to send feedback. Please try again.");
    } else {
      setMessage("");
      setStatusMessage("✅ Feedback sent. Thank you!");
      setTimeout(() => {
        setIsOpen(false);
        setStatusMessage("");
      }, 1500);
    }
  };

  return (
    <>
      {/* Feedback Button */}
      <Button
        className={`${fullWidth ? "w-full" : ""} 
          btn-3d bg-gradient-to-r from-gray-700 to-gray-800 
          text-white font-bold px-5 py-2.5 rounded-xl shadow-md 
          hover:scale-105 transition-all`}
        onClick={() => {
          playSound("click", effectsOn);
          setIsOpen(true);
        }}
      >
        📝 Feedback
      </Button>

      {/* Portal Modal (Centered always) */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setStatusMessage("");
        }}
        title="Send Feedback"
        className="max-w-md max-h-[80vh] overflow-y-auto"
      >
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            playSound("click", effectsOn);
          }}
          className="w-full border rounded p-2 mb-3"
          rows={4}
          placeholder="Type your feedback here..."
        />

        {statusMessage && (
          <p className="text-sm mb-3 text-gray-600">{statusMessage}</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              playSound("back", effectsOn);
              setIsOpen(false);
              setStatusMessage("");
            }}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              playSound("select", effectsOn);
              submitFeedback();
            }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
