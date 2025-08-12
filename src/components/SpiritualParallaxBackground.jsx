import { motion, useScroll, useTransform } from "framer-motion";
import cloudImg from "assets/clouds.png";
import pathImg from "assets/golden-path.png";

export default function SpiritualParallaxBackground() {
  const { scrollY } = useScroll();

  const cloudsY = useTransform(scrollY, [0, 800], [0, 100]);
  const pathY = useTransform(scrollY, [0, 800], [0, 200]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]">

      

      {/* Golden Path */}
      <motion.img
        src={pathImg}
        alt="Golden Path"
        className="absolute bottom-0 left-0 w-full h-[100vh] object-cover opacity-60"
        style={{ y: pathY }}
      />

      {/* Clouds */}
      <motion.img
        src={cloudImg}
        alt="Clouds"
        className="absolute top-0 left-0 w-full h-[90vh] object-cover opacity-90"
        style={{ y: cloudsY }}
      />
      
    </div>
  );
}
