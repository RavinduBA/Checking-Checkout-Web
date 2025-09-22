import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-center">
            You don't have permission to access any pages in this application. 
            Please contact your administrator to request access.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/auth">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}