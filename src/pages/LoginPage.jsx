import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "lib/supabaseClient";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function LoginPage() {
  const { login } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkInviteCode = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("validate_invite_code", {
      code_input: inviteCode.trim(),
    });

    if (error || !data?.valid) {
      setStatus("invalid");
    } else {
      setStatus("valid");
      setRemaining(data.remaining);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (status !== "valid") return;

    await supabase.rpc("use_invite_code", {
      code_input: inviteCode.trim(),
    });

    login();
  };

  // Carousel
  const images = [
    "/login-images/bible.jpg",
    "/login-images/create.png",
    "/login-images/sidebar.png",
    "/login-images/map.png",
    "/login-images/settings.png",
    "/login-images/store.png",
    "/login-images/multiplayer.png",
    "/login-images/church.jpg",
    "/login-images/crown.webp",
    "/login-images/cross.webp",
  ];
  const [currentImage, setCurrentImage] = useState(0);

  const nextSlide = () => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevSlide = () =>
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);

  // Auto slide
  useEffect(() => {
    const timer = setTimeout(nextSlide, 4000);
    return () => clearTimeout(timer);
  }, [currentImage]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-300 via-yellow-100 to-blue-100 overflow-hidden relative font-sans">
      {/* Background subtle particles/glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="w-[400px] h-[400px] bg-green-400/20 rounded-full absolute top-[-50px] left-[-100px] animate-pulseSlow"></div>
        <div className="w-[300px] h-[300px] bg-yellow-300/20 rounded-full absolute bottom-[-50px] right-[-80px] animate-pulseSlow"></div>
      </div>

      {/* Avatar + Greeting */}
      <div className="relative z-10 flex items-center gap-4 mb-6 animate-fadeInDown object-cover object-[10%]">
        <div className="relative w-16 h-16 sm:w-25 sm:h-25 rounded-full shadow-lg border-4 border-white/10 bg-white/5 overflow-hidden object-cover object-[10%]">
          <img
            src="/images/avatar.png"
            alt="avatar"
            className="w-full h-full rounded-full object-cover absolute animate-orbit"
          />
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
          👋 Welcoe!
        </h2>
      </div>

      {/* Login Card */}
      <div className="relative z-10 backdrop-blur-2xl bg-white/30 mb-8 border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-[400px] sm:max-w-sm md:max-w-lg w-full text-center animate-fadeInUp scale-95 hover:scale-[1.02] transition-transform duration-500">
        <h1
          className="text-3xl sm:text-4xl font-extrabold flex items-center justify-center gap-3 mb-6 tracking-tight text-gray-900 drop-shadow-md opacity-0 animate-delayFadeIn"
          style={{ animationDelay: "300ms" }}
        >
          💡{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-500">
            LightUP
          </span>{" "}
          Game App 🎮
        </h1>

        {/* Invite Code Section */}
        <div
          className="mb-6 opacity-0 animate-delayFadeIn"
          style={{ animationDelay: "500ms" }}
        >
          <label className="text-lg sm:text-2xl text-gray-800 mb-2 block font-semibold">
            Invite Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1 border border-white/50 rounded-xl px-3 py-2 shadow-md focus:ring-2 focus:ring-green-400 focus:outline-none bg-white/60 backdrop-blur-sm text-sm sm:text-base placeholder-gray-500 transition-all duration-300 hover:scale-[1.01]"
              placeholder="Enter Invite Code"
            />
            <button
              disabled={!inviteCode || loading}
              onClick={checkInviteCode}
              className="px-4 py-2 sm:px-5 sm:py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 text-sm sm:text-base transition-all duration-300"
            >
              {loading ? "..." : "Check"}
            </button>
          </div>

          {status === "valid" && (
            <p className="text-sm sm:text-base text-green-500 mt-2 animate-pulse">
              ✅ Code valid — {remaining} use(s) left
            </p>
          )}
          {status === "invalid" && (
            <p className="text-sm sm:text-base text-red-500 mt-2 animate-shake">
              ❌ Invalid or expired code
            </p>
          )}
        </div>

        {/* Google Login */}
        <button
          onClick={handleLogin}
          disabled={status !== "valid"}
          className={`mt-4 sm:mt-6 px-6 sm:px-8 py-3 rounded-full text-sm sm:text-lg font-semibold shadow-xl transition-all duration-300 opacity-0 animate-delayFadeInUp ${
            status === "valid"
              ? "bg-gradient-to-r from-yellow-400 via-yellow-300 to-gold text-black hover:shadow-2xl hover:scale-105"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
          style={{ animationDelay: "700ms" }}
        >
          Sign in with Google
        </button>
      </div>

      {/* Hero Carousel */}
      <div className="w-full max-w-3xl h-64 sm:h-72 md:h-80 mb-8 relative rounded-3xl shadow-2xl overflow-hidden border-2 border-white/30 animate-fadeInDown">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentImage * 100}%)` }}
        >
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`slide-${idx}`}
              className="w-full flex-shrink-0 h-64 sm:h-72 md:h-80 object-cover"
            />
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={prevSlide}
          className="absolute top-1/2 left-3 transform -translate-y-1/2 text-white text-[9px] md:text-xs bg-black/30 p-2 rounded-full hover:bg-black/50 transition"
        >
          <FaChevronLeft />
        </button>
        <button
          onClick={nextSlide}
          className="absolute top-1/2 right-3 transform -translate-y-1/2 text-white text-[9px] md:text-xs bg-black/30 p-2 rounded-full hover:bg-black/50 transition"
        >
          <FaChevronRight />
        </button>

        {/* Carousel Dots */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentImage === idx
                  ? "bg-white scale-125"
                  : "bg-white/50 scale-100"
              }`}
            ></span>
          ))}
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInDown {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes delayFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes delayFadeInUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
        @keyframes pulseSlow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease forwards;
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.8s ease forwards;
        }
        .animate-delayFadeIn {
          animation: delayFadeIn 0.8s ease forwards;
        }
        .animate-delayFadeInUp {
          animation: delayFadeInUp 0.8s ease forwards;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out 0s 2;
        }
        .animate-pulseSlow {
          animation: pulseSlow 6s ease-in-out infinite;
        }

        @keyframes orbit {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(6px, -4px); }
          50%  { transform: translate(0, -8px); }
          75%  { transform: translate(-6px, -4px); }
          100% { transform: translate(0, 0); }
        }
        .animate-orbit {
          animation: orbit 6s ease-in-out infinite;
        }

      `}</style>
    </div>
  );
}
