import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

interface WebPushError {
  statusCode?: number;
  message?: string;
}

// Dynamically import web-push to avoid type resolution issues
async function getWebPush() {
  const webpush = await import("npm:web-push@3.6.7");
  return webpush.default || webpush;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds, notification }: { userIds?: string[], notification: NotificationPayload } = await req.json();

    console.log('📨 Sending push notifications:', { userIds, notification });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('❌ VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get web-push module dynamically
    const webpush = await getWebPush();

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:support@lightup.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    console.log('🔑 VAPID keys configured successfully');

    // Fetch push subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('*');

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('❌ Error fetching subscriptions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No subscriptions found');
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📮 Found ${subscriptions.length} subscription(s)`);

    // Create the notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/logo192.jpg',
      badge: notification.badge || '/logo192.jpg',
      data: notification.data || {},
    });

    // Send notifications using web-push (handles VAPID signing and encryption automatically)
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payload);
          
          console.log(`✅ Sent to ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, endpoint: sub.endpoint };
        } catch (err: unknown) {
          const error = err as WebPushError;
          console.error(`❌ Failed to send to ${sub.endpoint.substring(0, 50)}...`, error.message);
          
          // If subscription is no longer valid, remove it
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`🗑️ Removing invalid subscription`);
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length;
    
    console.log(`✅ Successfully sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} notifications`,
        sent: successCount,
        total: subscriptions.length,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false })
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('❌ Error in send-push-notification:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
