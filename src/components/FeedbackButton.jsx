import { useState } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";
import { useAuth } from "auth/AuthProvider";

export default function FeedbackButton() {
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
      {/* Floating Feedback Button */}
      <Button
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        💬 Feedback
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <h2 className="text-lg font-bold mb-4">Send Feedback</h2>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded p-2 mb-3"
              rows={4}
              placeholder="Type your feedback here..."
            />

            {statusMessage && (
              <p className="text-sm mb-3 text-gray-600">{statusMessage}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setStatusMessage("");
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={submitFeedback} disabled={loading}>
                {loading ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
