import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Send, Crown, Megaphone } from "lucide-react";

export default function MGlobalChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [playerName, setPlayerName] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollToBottom = (force = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle mobile keyboard resize
  useEffect(() => {
    const handleResize = () => {
      document.documentElement.style.setProperty(
        "--chat-vh",
        `${window.innerHeight * 0.4}px`
      );
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch player's display name
  useEffect(() => {
    const fetchPlayerName = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("game_users")
        .select("player_name, is_admin, role")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setPlayerName(data.player_name);
      }
    };
    fetchPlayerName();
  }, [user?.id]);

  // Initial load + realtime subscription
  useEffect(() => {
    const fetchMessages = async () => {
      let { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(30);

      setMessages(data || []);
    };

    fetchMessages();

    const subscription = supabase
      .channel("public:chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            const withoutTemp = prev.filter(
              (m) =>
                !m.id.toString().startsWith("temp-") ||
                m.message !== payload.new.message ||
                m.user_id !== payload.new.user_id
            );
            const updated = [...withoutTemp, payload.new];
            return updated.slice(-30);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => scrollToBottom(true), [messages]);

  // Optimistic send
  const sendMessage = async () => {
    if (!newMessage.trim() || !playerName) return;
    const text = newMessage.trim();

    const tempMessage = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      username: playerName,
      message: text,
      created_at: new Date().toISOString(),
      role: "user",
      is_admin: false,
    };

    setMessages((prev) => [...prev, tempMessage].slice(-30));
    setNewMessage("");
    scrollToBottom(true);

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      username: playerName,
      message: text,
      role: "user",
      is_admin: false,
    });
  };

  const latestSuperAdmin = messages
    .filter((m) => m.role === "super_admin")
    .slice(-1);
  const normalMessages = messages.filter((m) => m.role !== "super_admin");

  return (
    <div className="flex flex-col w-full h-full max-h-[70vh] sm:max-h-full bg-white overflow-hidden">
      {/* Super Admin Announcement */}
      {latestSuperAdmin.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-b-2 border-yellow-400 p-2 sm:p-3 flex-shrink-0">
          {latestSuperAdmin.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl px-2 sm:px-4 py-2 sm:py-3 bg-white/80 shadow-md border border-yellow-300"
            >
              <span className="font-black text-red-600 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                <Megaphone className="w-3 h-3 sm:w-4 sm:h-4" />
                {msg.username}
              </span>
              <div className="text-gray-800 break-words whitespace-pre-wrap mt-1 font-medium text-[10px] sm:text-sm">
                {msg.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 bg-gradient-to-b from-gray-50 to-white"
      >
        {normalMessages.map((msg, i) => {
          const prevMsg = normalMessages[i - 1];
          const showUser = !prevMsg || prevMsg.user_id !== msg.user_id;
          const isMe = msg.user_id === user?.id;

          return (
            <div
              key={msg.id}
              className={`${
                isMe ? "ml-auto" : "mr-auto"
              } max-w-[85%] animate-[fadeIn_0.3s_ease]`}
            >
              <div
                className={`rounded-2xl px-2 sm:px-4 py-2 sm:py-3 ${
                  isMe
                    ? "bg-gradient-to-br from-pink-400 to-purple-500 text-white rounded-br-md"
                    : "bg-white border-2 border-gray-200 text-gray-800 rounded-bl-md shadow-md"
                }`}
              >
                {showUser && !isMe && (
                  <span className="font-black text-pink-500 block text-[10px] sm:text-xs mb-0.5 sm:mb-1 flex items-center gap-1">
                    {msg.username}
                    {msg.is_admin && <Crown className="w-2 h-2 sm:w-3 sm:h-3 text-yellow-500" />}
                  </span>
                )}
                <div className="break-words whitespace-pre-wrap text-[10px] sm:text-sm">
                  {msg.message}
                </div>
              </div>
              <div
                className={`text-[8px] sm:text-[10px] text-gray-400 mt-0.5 sm:mt-1 ${
                  isMe ? "text-right" : "text-left"
                }`}
              >
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Input */}
      <div className="sticky bottom-0 flex gap-1.5 sm:gap-2 border-t-2 border-gray-100 bg-white p-2 sm:p-3 flex-shrink-0">
        <input
          className="flex-1 p-2 sm:p-3 text-xs sm:text-sm outline-none border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition bg-gray-50"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-b from-pink-400 to-pink-500 text-white rounded-xl hover:from-pink-500 hover:to-pink-600 active:translate-y-0.5 transition-all shadow-[0_3px_0_#be185d] font-bold flex items-center justify-center"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
