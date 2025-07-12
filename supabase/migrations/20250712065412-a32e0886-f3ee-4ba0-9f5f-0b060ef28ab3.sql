-- Create function to clear all bookings from a specific location
CREATE OR REPLACE FUNCTION clear_location_bookings(p_location_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all bookings for the specified location
  DELETE FROM bookings 
  WHERE location_id = p_location_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;