import { useState, useRef } from "react";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface PhotoAttachmentProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  title?: string;
  maxPhotos?: number;
}

export const PhotoAttachment = ({ 
  photos, 
  onPhotosChange, 
  title = "Attach Photos", 
  maxPhotos = 5 
}: PhotoAttachmentProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    
    Array.from(files).forEach((file) => {
      if (photos.length + newPhotos.length >= maxPhotos) {
        toast({
          title: "Maximum photos reached",
          description: `You can only attach up to ${maxPhotos} photos`,
          variant: "destructive"
        });
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPhotos.push(e.target.result as string);
            if (newPhotos.length === Math.min(files.length, maxPhotos - photos.length)) {
              onPhotosChange([...photos, ...newPhotos]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleCameraCapture = () => {
    // For mobile devices, this will open the camera
    // For desktop, it will open file picker with camera preference
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    input.multiple = false;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (photos.length >= maxPhotos) {
          toast({
            title: "Maximum photos reached",
            description: `You can only attach up to ${maxPhotos} photos`,
            variant: "destructive"
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onPhotosChange([...photos, event.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
    setIsOpen(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
    setIsOpen(false);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-5 w-5" />
          {title}
          {photos.length > 0 && (
            <span className="text-sm text-muted-foreground">({photos.length}/{maxPhotos})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                disabled={photos.length >= maxPhotos}
              >
                <Camera className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Photo</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Button
                  onClick={handleCameraCapture}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <Camera className="h-6 w-6 mb-2" />
                  Take Photo
                </Button>
                <Button
                  onClick={handleFileSelect}
                  className="h-20 flex-col"
                  variant="outline"
                >
                  <Upload className="h-6 w-6 mb-2" />
                  From Gallery
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Attachment ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos attached</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};