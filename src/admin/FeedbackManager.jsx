// src/admin/FeedbackManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "components/ui/button";

export default function FeedbackManager() {
  const [feedback, setFeedback] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("unread");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setFeedback(data || []);
    setLoading(false);
  };

  const markAsRead = async (id) => {
    await supabase.from("feedback").update({ status: "read" }).eq("id", id);
    fetchFeedback();
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) return;
    await supabase.from("feedback").delete().eq("id", id);
    fetchFeedback();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600 text-lg font-medium animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  const filteredFeedback = feedback.filter((f) => f.status === activeSubTab);

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <Button
          variant={activeSubTab === "unread" ? "default" : "outline"}
          onClick={() => setActiveSubTab("unread")}
        >
          Unread ({feedback.filter((f) => f.status === "unread").length})
        </Button>
        <Button
          variant={activeSubTab === "read" ? "default" : "outline"}
          onClick={() => setActiveSubTab("read")}
        >
          Read ({feedback.filter((f) => f.status === "read").length})
        </Button>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <p>No {activeSubTab} feedback.</p>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((fb) => (
            <div
              key={fb.id}
              className="border p-3 rounded shadow-sm bg-white"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{fb.player_name || "Anonymous"}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(fb.created_at).toLocaleString()}
                  </p>
                </div>

                {activeSubTab === "unread" && (
                  <Button size="sm" onClick={() => markAsRead(fb.id)}>
                    Mark as Read
                  </Button>
                )}

                {activeSubTab === "read" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteFeedback(fb.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>

              <p className="mt-2">{fb.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
