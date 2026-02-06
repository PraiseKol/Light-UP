import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Bible questions for Tuesday mid-week reminders
const BIBLE_QUESTIONS = [
  { question: "Who built the ark?", emoji: "🚢" },
  { question: "How many days did Jesus fast in the wilderness?", emoji: "🏜️" },
  { question: "Which book comes after Genesis?", emoji: "📖" },
  { question: "Who was swallowed by a big fish?", emoji: "🐋" },
  { question: "How many disciples did Jesus have?", emoji: "👥" },
  { question: "Who defeated Goliath with a sling and a stone?", emoji: "🪨" },
  { question: "What did God create on the first day?", emoji: "💡" },
  { question: "Who was the first man created by God?", emoji: "🌱" },
  { question: "What is the last book of the Bible?", emoji: "📜" },
  { question: "How many plagues did God send on Egypt?", emoji: "🦗" },
  { question: "Who led the Israelites out of Egypt?", emoji: "🔥" },
  { question: "What was the name of Abraham's wife?", emoji: "👩" },
  { question: "Who was sold into slavery by his brothers?", emoji: "🧥" },
  { question: "How many days did it rain during the great flood?", emoji: "🌧️" },
];

// Get a random Bible question
function getRandomQuestion() {
  return BIBLE_QUESTIONS[Math.floor(Math.random() * BIBLE_QUESTIONS.length)];
}

// Email template for Friday - Challenge Opening
function getFridayEmailHtml(playerName: string, appUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #a855f7 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <h1 style="margin: 0; font-size: 32px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">🔥 Light Up Bible Trivia 🔥</h1>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="padding: 0 20px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 24px;">✨</p>
                    <h2 style="margin: 0 0 20px; font-size: 24px; color: #1f2937;">Hey ${playerName || 'Champion'}!</h2>
                    <p style="margin: 0 0 25px; font-size: 18px; color: #4b5563; line-height: 1.6;">
                      The <strong style="color: #ec4899;">Weekly Challenge</strong> opens in just <strong>1 HOUR</strong> (12:00 PM UTC)!
                    </p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 10px; text-align: center;">
                          <span style="font-size: 24px;">🏆</span>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Compete for the top spot</p>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                          <span style="font-size: 24px;">💡</span>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Test your Bible knowledge</p>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                          <span style="font-size: 24px;">⏰</span>
                          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Open until Monday midnight</p>
                        </td>
                      </tr>
                    </table>
                    <a href="${appUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 50px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      PLAY NOW →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 0 20px 30px;">
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.8);">
                You're receiving this because you enabled challenge notifications.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Email template for Tuesday - Mid-week Reminder
function getTuesdayEmailHtml(playerName: string, question: { question: string; emoji: string }, appUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <h1 style="margin: 0; font-size: 32px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">🔥 Light Up Bible Trivia 🔥</h1>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="padding: 0 20px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 24px;">📖</p>
                    <h2 style="margin: 0 0 20px; font-size: 24px; color: #1f2937;">Hey ${playerName || 'Champion'}!</h2>
                    <p style="margin: 0 0 15px; font-size: 16px; color: #6b7280;">Quick question for you:</p>
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <p style="margin: 0; font-size: 20px; color: #92400e; font-weight: 600;">
                        ${question.emoji} "${question.question}"
                      </p>
                    </div>
                    <p style="margin: 0 0 25px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                      Think you know the answer? Come play and test your Bible knowledge! 🧠✨
                    </p>
                    <a href="${appUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 50px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">
                      LIGHT UP NOW →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 0 20px 30px;">
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.8);">
                You're receiving this because you're part of the Light Up community.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

interface RequestBody {
  type: "challenge_open" | "midweek_reminder";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type }: RequestBody = await req.json();

    if (!type || !["challenge_open", "midweek_reminder"].includes(type)) {
      throw new Error("Invalid notification type. Use 'challenge_open' or 'midweek_reminder'");
    }

    console.log(`Processing ${type} email notifications...`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch users who want notifications
    let query = supabaseAdmin
      .from("game_users")
      .select("user_id, player_name");

    // For Friday challenge, only send to users who have notify_challenge_open enabled
    if (type === "challenge_open") {
      query = query.eq("notify_challenge_open", true);
    }

    const { data: gameUsers, error: usersError } = await query;

    if (usersError) {
      console.error("Error fetching game users:", usersError);
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!gameUsers || gameUsers.length === 0) {
      console.log("No users found with notifications enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${gameUsers.length} users to notify`);

    // Get email addresses from auth.users with pagination
    const userIds = gameUsers.map(u => u.user_id);
    let allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authError) {
        console.error("Error fetching auth users page", page, ":", authError);
        throw new Error(`Failed to fetch auth users: ${authError.message}`);
      }

      if (!data.users || data.users.length === 0) break;
      allAuthUsers = allAuthUsers.concat(data.users);
      console.log(`Fetched auth users page ${page}: ${data.users.length} users`);
      
      if (data.users.length < perPage) break;
      page++;
    }

    console.log(`Total auth users fetched: ${allAuthUsers.length}`);

    // Create a map of user_id to email
    const userEmailMap = new Map<string, string>();
    allAuthUsers.forEach(user => {
      if (user.email && userIds.includes(user.id)) {
        userEmailMap.set(user.id, user.email);
      }
    });

    // Prepare emails
    const appUrl = "https://react-supabase-launchpad.lovable.app";
    const randomQuestion = getRandomQuestion();
    
    const emailsToSend: { from: string; to: string; subject: string; html: string }[] = [];
    
    for (const gameUser of gameUsers) {
      const email = userEmailMap.get(gameUser.user_id);
      if (!email) {
        console.log(`No email found for user ${gameUser.user_id}`);
        continue;
      }

      const playerName = gameUser.player_name || "Champion";
      
      if (type === "challenge_open") {
        emailsToSend.push({
          from: "Light Up Bible Trivia <onboarding@resend.dev>",
          to: email,
          subject: "✨ Weekly Challenge Starts in 1 Hour!",
          html: getFridayEmailHtml(playerName, appUrl),
        });
      } else {
        emailsToSend.push({
          from: "Light Up Bible Trivia <onboarding@resend.dev>",
          to: email,
          subject: `📖 Quick Question: ${randomQuestion.question}`,
          html: getTuesdayEmailHtml(playerName, randomQuestion, appUrl),
        });
      }
    }

    console.log(`Preparing to send ${emailsToSend.length} emails`);

    // Send emails in batches (Resend has rate limits)
    let successCount = 0;
    let failCount = 0;
    const batchSize = 10;

    for (let i = 0; i < emailsToSend.length; i += batchSize) {
      const batch = emailsToSend.slice(i, i + batchSize);
      
      for (const emailData of batch) {
        try {
          const result = await resend.emails.send(emailData);
          console.log(`Email sent to ${emailData.to}:`, result);
          successCount++;
        } catch (emailError: any) {
          console.error(`Failed to send email to ${emailData.to}:`, emailError?.message || emailError);
          failCount++;
        }
      }
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < emailsToSend.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Email sending complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${type} emails sent`,
        sent: successCount,
        failed: failCount,
        total: emailsToSend.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-scheduled-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
