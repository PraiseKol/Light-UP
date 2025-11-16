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
  data?: any;
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

    console.log('🔑 VAPID keys loaded successfully');

    // Create the notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/logo192.jpg',
      badge: notification.badge || '/logo192.jpg',
      data: notification.data || {},
    });

    // Send notifications using Web Push protocol
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          // Create JWT for VAPID authentication
          const jwtHeader = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
          const jwtPayload = btoa(JSON.stringify({
            aud: new URL(sub.endpoint).origin,
            exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // 12 hours
            sub: 'mailto:support@lightup.app',
          }));

          // Note: In production, proper ECDSA signing should be implemented
          const vapidToken = `${jwtHeader}.${jwtPayload}.signature`;

          // Send notification using native fetch
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'TTL': '86400',
              'Content-Encoding': 'aes128gcm',
              'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
            },
            body: new TextEncoder().encode(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed to send to ${sub.endpoint.substring(0, 50)}...`, response.status, errorText);
            
            // If subscription is no longer valid, remove it
            if (response.status === 404 || response.status === 410) {
              console.log(`🗑️ Removing invalid subscription`);
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
            
            return { success: false, endpoint: sub.endpoint, status: response.status };
          }

          console.log(`✅ Sent to ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, endpoint: sub.endpoint };
        } catch (err) {
          console.error(`❌ Error sending notification:`, err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          return { success: false, endpoint: sub.endpoint, error: errorMessage };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
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
