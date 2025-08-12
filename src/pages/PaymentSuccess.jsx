import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { adjustTalents } from "utils/talentUtils";
import { supabase } from "lib/supabaseClient";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const talents = searchParams.get("talents");
  const userId = searchParams.get("userId");

  const [status, setStatus] = useState("Processing your purchase...");
  const [newBalance, setNewBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (!talents || !userId) return;

    const creditTalents = async () => {
      try {
        await adjustTalents(userId, parseInt(talents, 10));

        const { data, error } = await supabase
          .from("game_users")
          .select("talents")
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        setNewBalance(data.talents);
        setStatus(`🎉 Purchase successful! You received ${talents} talents.`);
        setSuccess(true);

        setTimeout(() => setShowText(true), 600);
      } catch (err) {
        console.error("Error crediting talents:", err);
        setStatus("❌ Something went wrong crediting your talents.");
      } finally {
        setLoading(false);
        setTimeout(() => {
          navigate("/store");
        }, 5000);
      }
    };

    creditTalents();
  }, [talents, userId, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-green-700">Payment Status</h1>

        {loading ? (
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mb-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <p className="text-gray-600">{status}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {success ? (
              <>
                <svg
                  className="h-16 w-16 text-green-500 mb-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    className="checkmark-path"
                  />
                </svg>

                <style>
                  {`
                    .checkmark-path {
                      stroke-dasharray: 48;
                      stroke-dashoffset: 48;
                      animation: draw-check 0.6s ease forwards;
                    }
                    @keyframes draw-check {
                      to { stroke-dashoffset: 0; }
                    }
                  `}
                </style>

                {showText && (
                  <div className="transition-opacity duration-500 opacity-100">
                    <p className="mb-4 text-gray-700">{status}</p>
                    <p className="mb-6 text-lg font-semibold text-blue-600">
                      Your new balance: 💎 {newBalance} Talents
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-red-600 font-medium">{status}</p>
            )}

            <p className="text-xs text-gray-500 mb-4">
              Redirecting you to the store in 5 seconds...
            </p>

            <button
              onClick={() => navigate("/store")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
            >
              Return to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
