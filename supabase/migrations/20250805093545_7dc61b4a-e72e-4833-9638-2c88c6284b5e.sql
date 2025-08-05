-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily calendar sync at 6 AM UTC (which is around 11:30 AM in Sri Lanka)
SELECT cron.schedule(
  'daily-calendar-sync',
  '0 6 * * *', -- Every day at 6 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://lllmxgsuatohzaqmntwa.supabase.co/functions/v1/scheduled-calendar-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbG14Z3N1YXRvaHphcW1udHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTA1ODMsImV4cCI6MjA2Nzg2NjU4M30.cit2fPJQgiyGGzSbRP5Kmne7WEbVp_00_vtUbyuQCXA"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);