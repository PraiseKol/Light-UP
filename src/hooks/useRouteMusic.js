import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { playMusic } from "@/utils/music";

// Map top-level routes to a music theme
function themeFor(pathname) {
  if (pathname.startsWith("/map")) return "map";
  if (
    pathname.startsWith("/weekly-challenge") ||
    pathname.startsWith("/multiplayer/game") ||
    pathname.startsWith("/scripture-match") ||
    pathname.startsWith("/pop-game") ||
    pathname.startsWith("/competition")
  )
    return "gameplay";
  // menus, lobbies, login, admin, payment
  return "menu";
}

export default function useRouteMusic() {
  const location = useLocation();
  useEffect(() => {
    playMusic(themeFor(location.pathname));
  }, [location.pathname]);
}
