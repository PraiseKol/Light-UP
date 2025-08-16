import { useEffect, useState, useRef } from "react";
import { supabase } from "lib/supabaseClient";

export default function GlobalChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [playerName, setPlayerName] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch player's display name (player_name from game_users)
  useEffect(() => {
    const fetchPlayerName = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("game_users")
        .select("player_name")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setPlayerName(data.player_name);
      }
    };
    fetchPlayerName();
  }, [user?.id]);

  // Fetch and subscribe to chat messages
  useEffect(() => {
    const fetchMessages = async () => {
      let { data } = await supabase
        .from("chat_messages")
        .select(`
          *,
          game_users!inner(
            player_name,
            is_admin,
            role
          )
        `)
        .order("created_at", { ascending: true })
        .limit(30);

      setMessages(data || []);
    };

    fetchMessages();

    // Live subscription for real-time chat updates
    const subscription = supabase
      .channel("public:chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const { data: joined } = await supabase
            .from("chat_messages")
            .select(`
              *,
              game_users!inner(
                player_name,
                is_admin,
                role
              )
            `)
            .eq("id", payload.new.id)
            .single();

          setMessages((prev) => {
            const updated = [...prev, joined];
            return updated.slice(-30);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !playerName) return;

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      username: playerName,
      message: newMessage.trim(),
    });

    setNewMessage("");
  };

  // Keep only latest super admin message
  const latestSuperAdmin = messages
    .filter((m) => m.game_users?.role === "super_admin")
    .slice(-1);

  const normalMessages = messages.filter(
    (m) => m.game_users?.role !== "super_admin"
  );

  return (
    <div className="flex flex-col h-[550px] w-full bg-white/80 backdrop-blur-md border border-gray-800 rounded-xl shadow-lg overflow-hidden">
      
      {/* 🔹 Super Admin Announcement */}
      {latestSuperAdmin.length > 0 && (
        <div className="bg-yellow-100 border-b border-yellow-400 p-2 text-xs">
          {latestSuperAdmin.map((msg) => (
            <div key={msg.id} className="rounded-lg px-2 py-1 shadow-sm">
              <span className="font-bold text-red-700">
                {msg.game_users?.player_name}
                {msg.game_users?.is_admin && " - ADMIN"}
              </span>
              <div className="text-gray-800 break-words whitespace-pre-wrap">
                {msg.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔹 Normal Chat */}
      <div className="flex-1 overflow-y-auto p-4 text-[11px] space-y-2">
        {normalMessages.map((msg) => (
          <div
            key={msg.id}
            className="bg-gray-300 border border-gray-200 rounded-lg px-2 py-1 shadow-sm"
          >
            <span className="font-bold text-blue-700">
              {msg.game_users?.player_name}
              {msg.game_users?.is_admin && " - ADMIN"}
            </span>
            <div className="text-gray-800 break-words whitespace-pre-wrap">
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 🔹 Input Field */}
      <div className="flex border-t border-gray-300 bg-gray-50 p-2">
        <input
          className="flex-1 p-2 text-[10px] outline-none border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 text-[10px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-800 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
