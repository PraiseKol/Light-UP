import { useState } from "react";

export default function DonationsButton({ userId }) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(null);

  const presetAmounts = [
    { label: "#1,500 / $1", value: 1500 },
    { label: "#3,000 / $2", value: 3000 },
    { label: "#7,500 / $5", value: 7500 },
    { label: "#15,000 / $10", value: 15000 },
    { label: "#30,000 / $20", value: 30000 },
    { label: "#75,000 / $50", value: 75000 },
  ];

  const handleDonate = async () => {
    if (!amount || amount <= 0) return alert("Enter a valid amount");

    try {
      const res = await fetch("/api/create-donation-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to payment provider
      } else {
        alert("Failed to start donation");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start donation");
    }
  };

  return (
    <>
      <button
        className="bg-green-600 text-white px-3 py-2 rounded-lg shadow-md"
        onClick={() => setShowModal(true)}
      >
        Donations
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-lg font-bold mb-4">Make a Donation</h2>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {presetAmounts.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setAmount(p.value)}
                  className={`p-2 rounded-lg border ${
                    amount === p.value
                      ? "bg-green-500 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Enter custom amount (NGN)"
              className="border w-full px-3 py-2 rounded mb-4"
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
