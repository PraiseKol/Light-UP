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
    // Fetch last 30 messages
    const fetchMessages = async () => {
      let { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(30);
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
          setMessages((prev) => {
            const updated = [...prev, payload.new];
            return updated.slice(-30); // ✅ Keep only the latest 30
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
      username: playerName, // ✅ Use player_name instead of email
      message: newMessage.trim(),
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-80 w-full bg-white/80 backdrop-blur-md border border-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 text-[10px] space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-gray-300 border border-gray-200 rounded-lg px-2 py-1 shadow-sm"
          >
            <span className="font-bold text-blue-700">{msg.username}: </span>
            <span className="text-gray-800">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex border-t border-gray-300 bg-gray-50 p-2">
        <input
          className="flex-1 p-2 text-[10px] outline-none border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message here..."
        
        //   placeholder="Jesus loves you ❤️✝️..."
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
