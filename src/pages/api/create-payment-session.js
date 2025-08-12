// pages/api/create-payment-session.js
import Stripe from "stripe";
import axios from "axios";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { userId, talents } = req.body;

  try {
    // Detect currency based on IP / or your own logic
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const isNigeria = true; // Replace with IP geolocation if needed

    if (isNigeria) {
      // PAYSTACK
      const paystackRes = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: `${userId}@example.com`, // Placeholder
          amount: 750 * 100, // kobo
          currency: "NGN",
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?talents=${talents}&userId=${userId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      return res.status(200).json({ url: paystackRes.data.data.authorization_url });
    } else {
      // STRIPE
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `${talents} Talents` },
              unit_amount: 50, // $0.50 in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?talents=${talents}&userId=${userId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/store`,
      });

      return res.status(200).json({ url: session.url });
    }
  } catch (err) {
    console.error("Payment session error:", err);
    res.status(500).json({ error: "Payment session failed" });
  }
}
