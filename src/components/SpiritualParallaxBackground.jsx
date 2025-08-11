import { motion, useScroll, useTransform } from "framer-motion";
import cloudImg from "assets/clouds.png";
import hillsImg from "assets/hills.png";
import pathImg from "assets/golden-path.png";

export default function SpiritualParallaxBackground() {
  const { scrollY } = useScroll();
  const cloudsY = useTransform(scrollY, [0, 500], [0, 50]);
  const hillsY = useTransform(scrollY, [0, 500], [0, 100]);
  const pathY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.img
        src={cloudImg}
        className="absolute top-0 left-0 w-full object-cover opacity-70"
        style={{ y: cloudsY }}
      />
      <motion.img
        src={hillsImg}
        className="absolute bottom-0 left-0 w-full object-cover"
        style={{ y: hillsY }}
      />
      <motion.img
        src={pathImg}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 opacity-80"
        style={{ y: pathY }}
      />
    </div>
  );
}
