export default function Switch({ checked, onChange, disabled, color = "green" }) {
  const onBg = {
    green: "peer-checked:bg-gradient-to-b peer-checked:from-emerald-300 peer-checked:to-emerald-600",
    pink: "peer-checked:bg-gradient-to-b peer-checked:from-pink-300 peer-checked:to-pink-600",
    purple: "peer-checked:bg-gradient-to-b peer-checked:from-purple-300 peer-checked:to-purple-600",
  }[color] || "peer-checked:bg-gradient-to-b peer-checked:from-emerald-300 peer-checked:to-emerald-600";

  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div
        className={`w-12 h-7 flex items-center bg-gradient-to-b from-gray-300 to-gray-400 rounded-full p-1 duration-300 ease-in-out
        shadow-[inset_0_2px_3px_rgba(0,0,0,0.25)] ${onBg} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div
          className={`bg-white w-5 h-5 rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.35)] transform duration-300 ease-in-out
          ${checked ? "translate-x-5" : ""}`}
        ></div>
      </div>
    </label>
  );
}
