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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-300 via-yellow-100 to-blue-100 overflow-hidden relative font-sans">
      {/* Background subtle particles/glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="w-[400px] h-[400px] bg-green-400/20 rounded-full absolute top-[-50px] left-[-100px] animate-pulseSlow"></div>
        <div className="w-[300px] h-[300px] bg-yellow-300/20 rounded-full absolute bottom-[-50px] right-[-80px] animate-pulseSlow"></div>
      </div>

      {/* Avatar + Greeting */}
      <div className="relative z-10 flex items-center gap-4 mb-6 animate-fadeInDown">
        <div className="relative w-16 h-16 sm:w-25 sm:h-25 rounded-full shadow-lg border-4 border-white/10 bg-white/5 overflow-hidden">
          <img
            src="/images/avatar.png"
            alt="avatar"
            className="w-full h-full rounded-full absolute animate-orbit"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
          👋 Welcome!
        </h2>
      </div>

      {/* Login Card */}
      <div className="relative z-10 backdrop-blur-2xl bg-white/30 mb-8 border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-[400px] sm:max-w-sm md:max-w-lg w-full text-center animate-fadeInUp">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 text-gray-900 drop-shadow-md">
          💡 <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-500">LightUP</span> Game App 🎮
        </h1>

        {/* Google Login */}
        <button
          onClick={login}
          className="mt-4 sm:mt-6 px-6 sm:px-8 py-3 rounded-full text-sm sm:text-lg font-semibold shadow-xl transition-all duration-300 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 text-black hover:shadow-2xl hover:scale-105"
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
          className="absolute top-1/2 left-3 transform -translate-y-1/2 text-white text-xs bg-black/30 p-2 rounded-full hover:bg-black/50"
        >
          <FaChevronLeft />
        </button>
        <button
          onClick={nextSlide}
          className="absolute top-1/2 right-3 transform -translate-y-1/2 text-white text-xs bg-black/30 p-2 rounded-full hover:bg-black/50"
        >
          <FaChevronRight />
        </button>

        {/* Carousel Dots */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`w-3 h-3 rounded-full ${
                currentImage === idx ? "bg-white scale-125" : "bg-white/50"
              }`}
            ></span>
          ))}
        </div>
      </div>
    </div>
  );
}
