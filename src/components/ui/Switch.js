export default function Switch({ checked, onChange, disabled }) {
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
          className={`w-11 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out
          peer-checked:bg-gray-400 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out
            ${checked ? "translate-x-5" : ""}`}
          ></div>
        </div>
      </label>
    );
  }
  