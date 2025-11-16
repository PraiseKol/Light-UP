// src/pages/LoginPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // 🔄 Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/map"); // go to main page after login
    }
  }, [user, navigate]);

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

  useEffect(() => {
    const timer = setTimeout(nextSlide, 4000);
    return () => clearTimeout(timer);
  }, [currentImage]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center candy-gradient overflow-hidden relative font-sans">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="w-[500px] h-[500px] bg-white/10 rounded-full absolute top-[-100px] left-[-150px] animate-cloudDrift"></div>
        <div className="w-[400px] h-[400px] bg-white/10 rounded-full absolute bottom-[-100px] right-[-100px] animate-cloudDrift" style={{ animationDelay: '2s' }}></div>
        <div className="w-[300px] h-[300px] bg-white/5 rounded-full absolute top-1/2 right-1/4 animate-cloudDrift" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Avatar + Greeting */}
      <div className="relative z-10 flex items-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8 px-4 animate-fadeInDown">
        <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full shadow-xl border-4 border-white/30 bg-white/10 overflow-hidden backdrop-blur-sm flex-shrink-0">
          <img
            src="/images/avatar.png"
            alt="avatar"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          👋 Welcome!
        </h2>
      </div>

      {/* Login Card */}
      <div className="relative z-10 backdrop-blur-xl bg-white/20 mb-6 sm:mb-8 border-4 border-white/30 rounded-2xl sm:rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.3)] p-6 sm:p-8 md:p-10 max-w-[95%] sm:max-w-[450px] w-full mx-4 text-center animate-fadeInUp">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 sm:mb-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
          💡 <span className="drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">LightUP</span> 🎮
        </h1>

        {/* Google Login */}
        <button
          onClick={login}
          className="w-full sm:w-auto mt-4 sm:mt-6 px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-black shadow-[0_6px_0_#d4a500,0_3px_0_#FFD93D_inset,0_12px_20px_rgba(255,217,61,0.7)] sm:shadow-[0_8px_0_#d4a500,0_4px_0_#FFD93D_inset,0_15px_25px_rgba(255,217,61,0.7)] transition-all duration-200 golden-gradient text-white hover:shadow-[0_4px_0_#d4a500,0_2px_0_#FFD93D_inset,0_10px_18px_rgba(255,217,61,0.8)] sm:hover:shadow-[0_6px_0_#d4a500,0_3px_0_#FFD93D_inset,0_12px_22px_rgba(255,217,61,0.8)] hover:translate-y-[2px] active:shadow-[0_2px_0_#d4a500,0_1px_0_#FFD93D_inset] active:translate-y-[6px] btn-3d min-h-[44px]"
        >
          Sign in with Google
        </button>
      </div>

      {/* Hero Carousel */}
      <div className="w-[95%] sm:w-full max-w-3xl h-48 sm:h-64 md:h-72 lg:h-80 mb-6 sm:mb-8 relative rounded-2xl sm:rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.3)] overflow-hidden border-4 border-white/30 animate-fadeInDown backdrop-blur-sm mx-4">
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
          className="absolute top-1/2 left-3 transform -translate-y-1/2 text-white text-xl bg-black/40 p-3 rounded-full hover:bg-black/60 backdrop-blur-sm transition-all hover:scale-110"
        >
          <FaChevronLeft />
        </button>
        <button
          onClick={nextSlide}
          className="absolute top-1/2 right-3 transform -translate-y-1/2 text-white text-xl bg-black/40 p-3 rounded-full hover:bg-black/60 backdrop-blur-sm transition-all hover:scale-110"
        >
          <FaChevronRight />
        </button>

        {/* Carousel Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImage(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                currentImage === idx ? "bg-white scale-125 shadow-lg" : "bg-white/50 hover:bg-white/75"
              }`}
            ></button>
          ))}
        </div>
      </div>
    </div>
  );
}
