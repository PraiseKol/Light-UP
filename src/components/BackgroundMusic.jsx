import { useEffect, useRef } from "react";

const soundMap = {
  default: null,
  shifts: "/sounds/shifts.m4a",
  peace: "/sounds/peace.m4a",
  juba: "/sounds/juba.mp3",
};

export default function BackgroundMusic({ sound }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;

    if (soundMap[sound]) {
      audioRef.current.src = soundMap[sound];
      audioRef.current.volume = 0.3;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {
        // handle autoplay restrictions silently
      });
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
//just to be sure
    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [sound]);

  return <audio ref={audioRef} style={{ display: "none" }} preload="auto" />;
}
