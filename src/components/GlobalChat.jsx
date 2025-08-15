import { useEffect, useState, useRef } from "react";
import { supabase } from "lib/supabaseClient";

export default function GlobalChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [playerName, setPlayerName] = useState("");

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch player's name from game_users
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

  useEffect(() => {
    // Fetch last 20 messages
    const fetchMessages = async () => {
      let { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(20);
      setMessages(data || []);
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel("public:chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev.slice(-19), payload.new]);
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
      username: playerName, // ✅ Use player_name instead of email
      message: newMessage.trim(),
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-64 w-full bg-gray-100 border border-gray-300 rounded-lg overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 text-xs space-y-1">
        {messages.map((msg) => (
          <div key={msg.id} className="text-gray-800">
            <span className="font-semibold">{msg.username}: </span>
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex border-t border-gray-300">
        <input
          className="flex-1 p-2 text-[5px] outline-none"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-3 text-sm bg-blue-500 text-white hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
