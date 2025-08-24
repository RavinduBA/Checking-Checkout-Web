-- Create daily booking reminder job at 8:00 AM Sri Lanka time (UTC+5:30) => 02:30 UTC
select cron.schedule(
  'daily-booking-reminders-8am-lkt',
  '30 2 * * *',
  $$
  select
    net.http_post(
        url:='https://lllmxgsuatohzaqmntwa.supabase.co/functions/v1/booking-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbG14Z3N1YXRvaHphcW1udHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTA1ODMsImV4cCI6MjA2Nzg2NjU4M30.cit2fPJQgiyGGzSbRP5Kmne7WEbVp_00_vtUbyuQCXA"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Show current jobs
select jobid, jobname, schedule, active from cron.job;