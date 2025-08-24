// src/admin/TransactionsManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";

export default function TransactionsManager() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const fetchTransactions = async () => {
    const { data, count, error } = await supabase
      .from("transactions")
      .select(
        "id, amount, created_at, game_users(player_name)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error) {
      setTransactions(data || []);
      setTotalCount(count || 0);
    } else {
      console.error("Error fetching transactions:", error);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Transactions</h2>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-2 border">Player Name</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Created At</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-2 border">{t.game_users?.player_name || "Unknown"}</td>
                <td className="p-2 border">{t.amount}</td>
                <td className="p-2 border">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div>
          Page {page} of {totalPages || 1}
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
          <input
            type="number"
            placeholder="Jump to page"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="border p-1 rounded w-24"
          />
          <Button
            variant="outline"
            onClick={() => {
              const target = parseInt(pageInput);
              if (target >= 1 && target <= totalPages) setPage(target);
            }}
          >
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}
