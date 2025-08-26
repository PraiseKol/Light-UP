import { useEffect, useState, useRef } from "react";
import { supabase } from "lib/supabaseClient";

export default function GlobalChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [playerName, setPlayerName] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [open, setOpen] = useState(true); // chat panel toggle

  const scrollToBottom = (force = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ✅ Handle mobile keyboard (resize chat height)
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
    <div
      className="
    flex flex-col 
    w-full 
    bg-white/10 backdrop-blur-md border border-gray-800 rounded-t-xl shadow-lg overflow-hidden
    fixed bottom-16 left-0 right-0 z-50    /* Mobile pinned + lifted above bottom */
    h-[var(--chat-vh,50%)]                 /* Mobile dynamic height */
    md:static md:bottom-auto md:left-auto md:right-auto md:rounded-xl
    md:h-[70vh]                          /* ⬆️ Taller desktop height */
  "
    >
      {/* 🔹 Mobile drag handle / toggle */}
      <div
        className="md:hidden w-full flex items-center justify-center cursor-pointer bg-gray-200/30 hover:bg-gray-200/50"
        onClick={() => setOpen(!open)}
      >
        <div className="w-10 h-1.5 bg-gray-400 rounded-full mt-1 mb-1" />
      </div>

      {/* Only show chat contents if open */}
      {open && (
        <>
          {/* 🔹 Super Admin Announcement */}
          {latestSuperAdmin.length > 0 && (
            <div className="bg-yellow-100 border-b border-yellow-400 p-2 text-[10px] md:text-xs">
              {latestSuperAdmin.map((msg) => (
                <div key={msg.id} className="rounded-lg px-2 py-1 shadow-sm">
                  <span className="font-bold text-red-700">{msg.username}</span>
                  <div className="text-gray-800 break-words whitespace-pre-wrap">
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 🔹 Chat Body */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-3 text-[10px] md:text-[11px] space-y-2"
          >
            {normalMessages.map((msg, i) => {
              const prevMsg = normalMessages[i - 1];
              const showUser = !prevMsg || prevMsg.user_id !== msg.user_id;

              return (
                <div
                  key={msg.id}
                  className="bg-gray-200 border border-gray-100 rounded-lg px-2 py-1 shadow-sm animate-[fadeIn_0.3s_ease]"
                >
                  {showUser && (
                    <span className="font-bold text-blue-700 block text-[10px] md:text-[11px]">
                      {msg.username} {msg.is_admin && " - ADMIN"}
                    </span>
                  )}
                  <div className="text-gray-800 break-words whitespace-pre-wrap text-[10px] md:text-[11px]">
                    {msg.message}
                  </div>
                  <div className="text-[8px] text-gray-500 mt-0.5">
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

          {/* 🔹 Sticky Input */}
          <div className="sticky bottom-0 left-0 right-0 flex border-t border-gray-300 bg-gray-50 p-2">
            <input
              className="flex-1 p-2 text-[9px] md:text-[10px] outline-none border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
            />
            <button
              onClick={sendMessage}
              className="ml-2 px-3 py-2 text-[12px] md:text-[10px] bg-blue-600 text-white rounded-lg hover:bg-blue-800 transition"
            >
              📩
            </button>
          </div>
        </>
      )}
    </div>
  );
}
