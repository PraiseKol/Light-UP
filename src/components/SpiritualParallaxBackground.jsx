import { motion, useScroll, useTransform } from "framer-motion";
import clouds from "@/assets/clouds.png";
import goldenPath from "@/assets/golden-path.png"; // if needed later

export default function SpiritualParallaxBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-200 via-purple-100 to-pink-100" />

      {/* Animated clouds layer 1 (far) */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${clouds})`,
          backgroundSize: "800px 400px",
          animation: "cloudDrift 60s linear infinite",
        }}
      />

      {/* Animated clouds layer 2 (near) */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(${clouds})`,
          backgroundSize: "600px 300px",
          animation: "cloudDrift 40s linear infinite reverse",
        }}
      />

      {/* Floating light particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/60 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${8 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  );
}
