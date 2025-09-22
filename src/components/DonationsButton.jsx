import { useState } from "react";
import { Button } from "components/ui/button";

const API_BASE = process.env.REACT_APP_API_URL;

export default function DonationsButton({
  userId,
  small,
  fullWidth,
  effectsOn = true,
}) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(null);
  const [currency, setCurrency] = useState("NGN"); // ✅ default to NGN

  const presetAmounts = {
    NGN: [
      { label: "₦1,500", value: 1500 },
      { label: "₦3,000", value: 3000 },
      { label: "₦7,500", value: 7500 },
      { label: "₦15,000", value: 15000 },
      { label: "₦30,000", value: 30000 },
      { label: "₦75,000", value: 75000 },
    ],
    // USD: [
    //   { label: "$1", value: 1 },
    //   { label: "$2", value: 2 },
    //   { label: "$5", value: 5 },
    //   { label: "$10", value: 10 },
    //   { label: "$20", value: 20 },
    //   { label: "$50", value: 50 },
    // ],
  };

  const handleDonate = async () => {
    if (!amount || amount <= 0) {
      return alert("Enter a valid amount");
    }

    const payload = { userId, amount, currency };
    console.log("Sending donation payload:", payload);

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

      // ✅ Always redirect to Paystack
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
    text-[8px] md:text-xs px-2.5 py-1 md:px-2 md:py-1
    bg-green-600 hover:bg-green-400 text-white 
    fixed bottom-2 md:bottom-4 left-50 z-50 rounded-md shadow`}
        onClick={() => setShowModal(true)}
      >
        ☕️ Gift
      </Button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-lg font-bold mb-4">Support with a Gift</h2>
            <h3 className="text-xs md:text-sm font-bold mb-4">Your gifts help us develop new features, cover server costs, and keep this app functional(USD option is coming soon)</h3>

            {/* ✅ Currency Selector (NGN / USD) */}
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
              {/* <button
                className={`flex-1 py-2 rounded-lg border ${
                  currency === "USD" ? "bg-green-500 text-white" : "bg-gray-100"
                }`}
                onClick={() => {
                  setCurrency("USD");
                  setAmount(null);
                }}
              >
                USD ($)
              </button> */}
            </div>

            {/* Preset Buttons */}
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

            <div className="flex justify-end gap-2">
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
          </div>
        </div>
      )}
    </>
  );
}
