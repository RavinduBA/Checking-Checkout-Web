-- Enable the required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the calendar sync to run every hour
SELECT cron.schedule(
  'hourly-calendar-sync',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://lllmxgsuatohzaqmntwa.supabase.co/functions/v1/scheduled-calendar-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbG14Z3N1YXRvaHphcW1udHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI5MDU4MywiZXhwIjoyMDY3ODY2NTgzfQ.s9kJFpZ-5PXhBtZhpQ6hzKF6pqfKIPdXO8z0EpHUD4g"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job;