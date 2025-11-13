import { useState } from "react";
import { Button } from "@/components/ui/button";
import { playSound } from "@/utils/sound";
import Modal from "@/components/ui/modal";

const API_BASE = import.meta.env.VITE_API_URL;

export default function DonationsButton({
  userId,
  small,
  fullWidth,
  effectsOn = true,
}) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(null);
  const [currency, setCurrency] = useState("NGN");

  const presetAmounts = {
    NGN: [
      { label: "₦1,500", value: 1500 },
      { label: "₦3,000", value: 3000 },
      { label: "₦7,500", value: 7500 },
      { label: "₦15,000", value: 15000 },
      { label: "₦30,000", value: 30000 },
      { label: "₦75,000", value: 75000 },
    ],
  };

  const handleDonate = async () => {
    if (!amount || amount <= 0) {
      return alert("Enter a valid amount");
    }

    const payload = { userId, amount, currency };

    try {
      const res = await fetch(`${API_BASE}/api/create-donation-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to start donation");
      }
    } catch (err) {
      console.error("Donation error:", err);
      alert("Failed to start donation");
    }
  };

  return (
    <>
      <Button
        className={`${fullWidth ? "w-full" : ""} 
          btn-3d bg-gradient-to-r from-green-600 to-green-500 
          text-white font-bold px-5 py-2.5 rounded-xl shadow-md 
          hover:scale-105 transition-all`}
        onClick={() => {
          playSound("optionSelect", effectsOn);
          setShowModal(true);
        }}
      >
        🎁 Gift
      </Button>

      {/* Portal Modal (Centered properly) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Support with a Gift"
        className="max-w-md max-h-[85vh] overflow-y-auto"
      >
        <h3 className="text-xs md:text-sm font-bold mb-4">
          Your gifts help us develop new features, cover server costs, and keep
          this app functional (USD option coming soon)
        </h3>

        {/* Currency Toggle */}
        <div className="flex gap-3 mb-4">
          <button
            className={`flex-1 py-2 rounded-lg border ${
              currency === "NGN" ? "bg-green-500 text-white" : "bg-gray-100"
            }`}
            onClick={() => {
              setCurrency("NGN");
              setAmount(null);
            }}
          >
            NGN (₦)
          </button>
        </div>

        {/* Preset Amounts */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {presetAmounts[currency].map((p) => (
            <button
              key={p.value}
              onClick={() => setAmount(p.value)}
              className={`p-2 rounded-lg border ${
                amount === p.value
                  ? "bg-green-600 text-white"
                  : "bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <input
          type="number"
          placeholder={`Enter custom amount in ${currency}`}
          className="border w-full px-3 py-2 rounded mb-4"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
        />

        <div className="flex justify-end gap-2 mt-3">
          <button
            className="px-4 py-2 bg-gray-300 rounded"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={handleDonate}
          >
            Donate
          </button>
        </div>
      </Modal>
    </>
  );
}
