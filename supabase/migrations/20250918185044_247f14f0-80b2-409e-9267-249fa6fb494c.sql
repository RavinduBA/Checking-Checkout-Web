-- Create storage bucket for reservation documents and photos
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('reservation-documents', 'reservation-documents', true, 20971520);

-- Create RLS policies for reservation documents
CREATE POLICY "Reservation documents are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reservation-documents');

CREATE POLICY "Authenticated users can upload reservation documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'reservation-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their reservation documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'reservation-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their reservation documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'reservation-documents' 
  AND auth.role() = 'authenticated'
);