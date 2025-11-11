import { motion, useScroll, useTransform } from "framer-motion";
import cloudImg from "@/assets/clouds.png";
import pathImg from "@/assets/golden-path.png";

export default function SpiritualParallaxBackground() {
  const { scrollY } = useScroll();

  const cloudsY = useTransform(scrollY, [0, 800], [0, 100]);
  const pathY = useTransform(scrollY, [0, 800], [0, 200]);
  const skyOpacity = useTransform(scrollY, [0, 400], [1, 0.7]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]">
      {/* Gradient Sky Background */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-blue-100 via-purple-50 to-pink-50"
        style={{ opacity: skyOpacity }}
      />

      {/* Animated Light Particles */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-2 h-2 bg-candyYellow rounded-full animate-float" />
        <div className="absolute top-40 right-40 w-3 h-3 bg-candyPink rounded-full animate-float [animation-delay:0.5s]" />
        <div className="absolute bottom-40 left-1/3 w-2 h-2 bg-candyBlue rounded-full animate-float [animation-delay:1s]" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-candyPurple rounded-full animate-float [animation-delay:1.5s]" />
      </div>

      {/* Golden Path */}
      <motion.img
        src={pathImg}
        alt="Golden Path"
        className="absolute bottom-0 left-0 w-full h-[100vh] object-cover opacity-50"
        style={{ y: pathY }}
      />

      {/* Clouds - Multiple Layers */}
      <motion.img
        src={cloudImg}
        alt="Clouds"
        className="absolute top-0 left-0 w-full h-[90vh] object-cover opacity-80"
        style={{ y: cloudsY }}
      />
      
      <motion.img
        src={cloudImg}
        alt="Clouds Layer 2"
        className="absolute top-20 left-0 w-full h-[80vh] object-cover opacity-40"
        style={{ y: useTransform(scrollY, [0, 800], [0, 150]) }}
      />
    </div>
  );
}
