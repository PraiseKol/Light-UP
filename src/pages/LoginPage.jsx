// src/pages/LoginPage.jsx
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="h-screen flex items-center justify-center bg-white text-charcoal">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Welcome to LightUP GAME APP</h1> 🕹️🎮⛪️📖 <br></br>
        <button
          onClick={login}
          className="bg-gold text-black px-6 py-3 rounded-full text-lg font-semibold shadow hover:brightness-105 transition"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
