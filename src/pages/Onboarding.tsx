import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  ArrowLeft,
  Building2, 
  Hotel, 
  Home,
  MapPin,
  Phone,
  Mail,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Shield,
  Zap,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const STEPS = [
  { id: 1, title: "Company Info", description: "Tell us about your business" },
  { id: 2, title: "Property Details", description: "Describe your properties" },
  { id: 3, title: "Features", description: "Choose your features" },
  { id: 4, title: "Complete", description: "You're all set!" }
];

const PROPERTY_TYPES = [
  { id: "hotel", label: "Hotel", icon: Building2, description: "Traditional hotel with multiple rooms" },
  { id: "resort", label: "Resort", icon: Hotel, description: "Resort with amenities and activities" },
  { id: "villa", label: "Villa", icon: Home, description: "Private villa or vacation rental" },
  { id: "mixed", label: "Mixed", icon: Building2, description: "Multiple property types" }
];

const FEATURES = [
  { id: "bookings", label: "Booking Management", icon: Calendar, description: "Reservation system with calendar", essential: true },
  { id: "payments", label: "Payment Processing", icon: DollarSign, description: "Secure payment handling", essential: true },
  { id: "reports", label: "Financial Reports", icon: BarChart3, description: "Revenue and expense analytics" },
  { id: "multi_property", label: "Multi-Property", icon: Building2, description: "Manage multiple locations" },
  { id: "guest_management", label: "Guest Management", icon: Users, description: "Guest profiles and history" },
  { id: "channel_manager", label: "Channel Manager", icon: Zap, description: "OTA integrations (Booking.com, etc.)" },
  { id: "advanced_security", label: "Advanced Security", icon: Shield, description: "Enhanced security features" }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Company Info
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    country: "",
    
    // Property Details
    propertyType: "",
    propertyCount: "",
    totalRooms: "",
    description: "",
    
    // Features
    selectedFeatures: ["bookings", "payments"], // Essential features pre-selected
    
    // User preferences
    currency: "USD",
    timezone: ""
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    // Pre-fill user email if available
    if (user.email && !formData.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email!,
        contactName: user.user_metadata?.name || ""
      }));
    }
  }, [user, navigate, formData.email]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFeatureToggle = (featureId: string, essential: boolean) => {
    if (essential) return; // Don't allow toggling essential features
    
    setFormData(prev => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.includes(featureId)
        ? prev.selectedFeatures.filter(id => id !== featureId)
        : [...prev.selectedFeatures, featureId]
    }));
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      // Store onboarding data in localStorage for now
      const onboardingData = {
        user_id: user!.id,
        company_name: formData.companyName,
        contact_name: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        country: formData.country,
        property_type: formData.propertyType,
        property_count: formData.propertyCount,
        total_rooms: formData.totalRooms,
        description: formData.description,
        selected_features: formData.selectedFeatures,
        currency: formData.currency,
        timezone: formData.timezone,
        onboarding_completed: true,
        completed_at: new Date().toISOString()
      };
      
      localStorage.setItem('onboarding_data', JSON.stringify(onboardingData));

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your account has been set up successfully. Welcome to Check In_Check Out!",
      });

      // Redirect to main app
      navigate("/app");
      
    } catch (error: any) {
      toast({
        title: "Setup Error",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName && formData.contactName && formData.email;
      case 2:
        return formData.propertyType && formData.propertyCount;
      case 3:
        return formData.selectedFeatures.length > 0;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Tell us about your business</h2>
              <p className="text-muted-foreground">We'll use this information to customize your experience</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company/Hotel Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="e.g., Oceanview Resort"
                />
              </div>
              <div>
                <Label htmlFor="contactName">Contact Person *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@yourhotel.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Street address, city, state/province, country"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="LK">Sri Lanka</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="TH">Thailand</SelectItem>
                  <SelectItem value="MY">Malaysia</SelectItem>
                  <SelectItem value="SG">Singapore</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Hotel className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Property Information</h2>
              <p className="text-muted-foreground">Help us understand your property setup</p>
            </div>

            <div>
              <Label className="text-base font-medium mb-4 block">What type of property do you manage? *</Label>
              <div className="grid md:grid-cols-2 gap-4">
                {PROPERTY_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                      formData.propertyType === type.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, propertyType: type.id }))}
                  >
                    <div className="flex items-start gap-3">
                      <type.icon className="h-6 w-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-medium">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propertyCount">Number of Properties *</Label>
                <Select 
                  value={formData.propertyCount} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, propertyCount: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Property</SelectItem>
                    <SelectItem value="2-5">2-5 Properties</SelectItem>
                    <SelectItem value="6-10">6-10 Properties</SelectItem>
                    <SelectItem value="11-25">11-25 Properties</SelectItem>
                    <SelectItem value="25+">25+ Properties</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="totalRooms">Total Rooms/Units *</Label>
                <Select 
                  value={formData.totalRooms} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, totalRooms: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 Rooms</SelectItem>
                    <SelectItem value="11-25">11-25 Rooms</SelectItem>
                    <SelectItem value="26-50">26-50 Rooms</SelectItem>
                    <SelectItem value="51-100">51-100 Rooms</SelectItem>
                    <SelectItem value="100+">100+ Rooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Brief Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tell us about your property, target guests, special features..."
                rows={4}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Choose Your Features</h2>
              <p className="text-muted-foreground">Select the features you need to get started</p>
            </div>

            <div className="grid gap-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.selectedFeatures.includes(feature.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } ${feature.essential ? 'opacity-75' : 'cursor-pointer'}`}
                  onClick={() => handleFeatureToggle(feature.id, feature.essential)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center">
                      <Checkbox
                        checked={formData.selectedFeatures.includes(feature.id)}
                        disabled={feature.essential}
                        className="mt-1"
                      />
                    </div>
                    <feature.icon className="h-6 w-6 text-primary mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{feature.label}</h3>
                        {feature.essential && (
                          <Badge variant="secondary" className="text-xs">Essential</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="THB">THB - Thai Baht</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-3xl font-bold">You're All Set! 🎉</h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Welcome to Check In_Check Out! Your account has been configured based on your preferences.
            </p>
            
            <div className="bg-muted/30 rounded-lg p-6 text-left max-w-md mx-auto">
              <h3 className="font-medium mb-4">What's Next:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Set up your first property
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Configure room types and pricing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Start accepting bookings
                </li>
              </ul>
            </div>

            <Button size="lg" onClick={handleComplete} disabled={loading} className="w-full max-w-sm">
              {loading ? "Setting up..." : "Enter Your Dashboard"}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Hotel className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">HotelVilla Pro</span>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            {STEPS.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= step.id 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {step.id < STEPS.length && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <Progress value={(currentStep / STEPS.length) * 100} className="w-full max-w-md mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.description}
          </p>
        </div>

        {/* Main Content */}
        <Card className="border-0 shadow-elegant bg-gradient-card">
          <CardHeader className="pb-6">
            <CardTitle className="text-center text-2xl">
              {STEPS[currentStep - 1]?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!validateStep()}
              className="flex items-center gap-2"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}