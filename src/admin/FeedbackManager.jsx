// src/admin/FeedbackManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";
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

  if (loading) return <p>Loading...</p>;

  const filteredFeedback = feedback.filter(f => f.status === activeSubTab);

  return (
    <div className="p-4">
      <div className="flex gap-4 mb-4">
        <Button variant={activeSubTab === "unread" ? "default" : "outline"} onClick={() => setActiveSubTab("unread")}>
          Unread ({feedback.filter(f => f.status === "unread").length})
        </Button>
        <Button variant={activeSubTab === "read" ? "default" : "outline"} onClick={() => setActiveSubTab("read")}>
          Read ({feedback.filter(f => f.status === "read").length})
        </Button>
      </div>

      {filteredFeedback.length === 0 ? (
        <p>No {activeSubTab} feedback.</p>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((fb) => (
            <div key={fb.id} className="border p-3 rounded shadow-sm bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{fb.player_name || "Anonymous"}</p>
                  <p className="text-sm text-gray-500">{new Date(fb.created_at).toLocaleString()}</p>
                </div>
                {activeSubTab === "unread" && (
                  <Button size="sm" onClick={() => markAsRead(fb.id)}>Mark as Read</Button>
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
