// src/admin/DonationsManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "components/ui/button";


export default function DonationsManager() {
  const [activeTab, setActiveTab] = useState("success");
  const [donations, setDonations] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [totals, setTotals] = useState({ naira: 0, usd: 0 });

  

  const pageSize = 20;

  useEffect(() => {
    fetchDonations();
  }, [activeTab, page]);

  useEffect(() => {
    fetchTotals();
  }, []);

  const fetchDonations = async () => {
    let query = supabase
      .from("donations")
      .select(
        "id, amount, currency, provider, status, created_at, game_users(player_name)",
        {
          count: "exact",
        }
      )
      .order("created_at", { ascending: false });

    if (activeTab === "success") {
      query = query.eq("status", "success");
    } else {
      query = query.in("status", ["pending", "cancelled"]);
    }

    const { data, count, error } = await query.range(
      (page - 1) * pageSize,
      page * pageSize - 1
    );

    if (!error) {
      setDonations(data || []);
      setTotalCount(count || 0);
    }
  };

  const fetchTotals = async () => {
    const { data, error } = await supabase
      .from("donations")
      .select("amount, provider, status")
      .eq("status", "success");
  
    if (!error && data) {
      let naira = 0;
      let usd = 0;
  
      data.forEach((d) => {
        if (d.provider?.toLowerCase() === "paystack") {
          naira += Number(d.amount);
        } else if (d.provider?.toLowerCase() === "stripe") {
          usd += Number(d.amount);
        }
      });
  
      setTotals({ naira, usd });
    }
  };
  

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Donations</h2>

      {/* Tabs + Totals */}
      <div className="flex gap-4 mb-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "success" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("success");
              setPage(1);
            }}
          >
            ✅ Success
          </Button>
          <Button
            variant={activeTab === "other" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("other");
              setPage(1);
            }}
          >
            ⏳ Pending / ❌ Cancelled
          </Button>
        </div>
        <div className="text-sm text-gray-700">
          <span className="mr-4">
            Total (₦): <strong>{totals.naira.toLocaleString()}</strong>
          </span>
          <span>
            Total ($): <strong>{totals.usd.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-2 border">Player Name</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Currency</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Provider</th>
              <th className="p-2 border">Created At</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="p-2 border">
                  {d.game_users?.player_name || "Unknown"}
                </td>
                <td className="p-2 border">{d.amount}</td>
                <td className="p-2 border">{d.currency}</td>
                <td className="p-2 border">{d.status}</td>
                <td className="p-2 border">{d.provider}</td>
                <td className="p-2 border">
                  {new Date(d.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {donations.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No donations found
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
              if (target >= 1 && target <= totalPages) {
                setPage(target);
              }
            }}
          >
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}
