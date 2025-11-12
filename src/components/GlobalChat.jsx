import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GlobalChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [playerName, setPlayerName] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [open, setOpen] = useState(true); // ✅ default open

  const scrollToBottom = (force = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ✅ Mobile height handling
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
    <div className="flex flex-col w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200">
      {/* Chat contents */}
      <>
        {/* Super Admin Announcement */}
        {latestSuperAdmin.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-b-2 border-yellow-400 p-3 text-xs md:text-sm">
            {latestSuperAdmin.map((msg) => (
              <div key={msg.id} className="rounded-lg px-3 py-2 bg-white/50 shadow-md">
                <span className="font-black text-red-700 text-sm">📢 {msg.username}</span>
                <div className="text-gray-900 break-words whitespace-pre-wrap mt-1 font-medium">
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat Body */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 text-xs md:text-sm space-y-3 bg-gradient-to-b from-gray-50 to-white"
        >
          {normalMessages.map((msg, i) => {
            const prevMsg = normalMessages[i - 1];
            const showUser = !prevMsg || prevMsg.user_id !== msg.user_id;

            return (
              <div
                key={msg.id}
                className="bg-white border-2 border-gray-200 rounded-xl px-3 py-2 shadow-md hover:shadow-lg transition-shadow animate-[fadeIn_0.3s_ease]"
              >
                {showUser && (
                  <span className="font-black text-candyBlue block text-xs md:text-sm mb-1">
                    {msg.username} {msg.is_admin && "👑"}
                  </span>
                )}
                <div className="text-gray-800 break-words whitespace-pre-wrap text-xs md:text-sm">
                  {msg.message}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
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
        <div className="sticky bottom-0 left-0 right-0 flex gap-2 border-t-2 border-gray-200 bg-white p-3">
          <input
            className="flex-1 p-3 text-sm outline-none border-2 border-gray-300 rounded-xl focus:border-candyBlue focus:ring-2 focus:ring-candyBlue/30 transition"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            className="px-5 py-3 text-lg candy-gradient text-white rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-lg font-bold"
          >
            📩
          </button>
        </div>
      </>
    </div>
  );
}
