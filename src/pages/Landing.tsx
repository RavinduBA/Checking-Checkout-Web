import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Building2, 
  Users, 
  Shield, 
  Zap, 
  Globe, 
  ArrowRight,
  Check,
  Star,
  Hotel,
  CreditCard,
  Smartphone,
  ChevronRight,
  Key,
  Clock,
  MessageSquare,
  Wifi,
  Car,
  Coffee,
  MapPin,
  Phone,
  Mail,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import checkinLogo from "@/assets/checkin-checkout-logo.png";

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    businessName: "",
    businessType: "",
    numberOfRooms: "",
    location: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartTrial = () => {
    setShowInfoForm(true);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`
        }
      });
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInfoFormSubmit = () => {
    // Store the business info temporarily
    localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
    setShowInfoForm(false);
    handleGoogleSignIn();
  };

  const features = [
    {
      icon: Calendar,
      title: "Smart Booking Management",
      description: "Streamlined reservation system with real-time availability and automated confirmations"
    },
    {
      icon: DollarSign,
      title: "Revenue Optimization", 
      description: "Dynamic pricing strategies and comprehensive financial reporting to maximize profits"
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Deep business intelligence with customizable reports and performance metrics"
    },
    {
      icon: Building2,
      title: "Multi-Property Support",
      description: "Manage unlimited hotels, villas, and properties from a single dashboard"
    },
    {
      icon: Users,
      title: "Guest Experience",
      description: "Complete guest lifecycle management with personalized service tracking"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Enterprise-grade security with data encryption and compliance standards"
    },
    {
      icon: Key,
      title: "Digital Check-In/Out",
      description: "Contactless check-in and check-out process with mobile keys and instant room access"
    },
    {
      icon: Clock,
      title: "Housekeeping Management",
      description: "Real-time room status updates and efficient housekeeping task management"
    },
    {
      icon: MessageSquare,
      title: "Guest Communication",
      description: "Automated messaging, SMS notifications, and 24/7 guest support integration"
    },
    {
      icon: CreditCard,
      title: "Payment Processing",
      description: "Secure payment gateway with multiple payment options and automated billing"
    },
    {
      icon: Wifi,
      title: "Channel Manager",
      description: "Sync inventory across all booking platforms and manage rates from one place"
    },
    {
      icon: Car,
      title: "Concierge Services",
      description: "Manage guest requests, tours, transportation, and local experience bookings"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Hotels & Villas" },
    { number: "2M+", label: "Bookings Processed" },
    { number: "150+", label: "Countries" },
    { number: "99.9%", label: "Uptime" }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Hotel Manager",
      company: "Oceanview Resort",
      rating: 5,
      text: "This platform transformed our operations. Booking management is now effortless and our revenue increased by 35%."
    },
    {
      name: "Michael Chen", 
      role: "Villa Owner",
      company: "Mountain View Villas",
      rating: 5,
      text: "The best investment we've made. The analytics helped us optimize our pricing strategy perfectly."
    },
    {
      name: "Elena Rodriguez",
      role: "Property Manager", 
      company: "Coastal Properties",
      rating: 5,
      text: "Exceptional customer support and features that actually work. Our guests love the seamless experience."
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      description: "Perfect for small hotels & villas",
      features: [
        "Up to 10 rooms/units",
        "Basic booking management", 
        "Financial reporting",
        "Email support",
        "Mobile app access"
      ],
      popular: false
    },
    {
      name: "Professional", 
      price: "$149",
      period: "/month",
      description: "For growing hospitality businesses",
      features: [
        "Up to 50 rooms/units",
        "Advanced analytics",
        "Multi-property management",
        "Priority support",
        "Channel manager integration",
        "Custom branding"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$399",
      period: "/month", 
      description: "For large hotel chains",
      features: [
        "Unlimited rooms/units",
        "White-label solution",
        "API access",
        "Dedicated account manager",
        "Custom integrations",
        "24/7 phone support"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src={checkinLogo} alt="CHECK-IN CHECK-OUT" className="w-10 h-10 rounded-lg" />
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold">CHECK-IN</span>
                <span className="text-lg font-normal">CHECK-OUT</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4" variant="secondary">
            <Zap className="h-3 w-3 mr-1" />
            #1 Hotel Management Platform
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Revolutionize Your Hotel & Villa Management
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Streamline operations, maximize revenue, and deliver exceptional guest experiences 
            with our all-in-one hospitality management platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleStartTrial}
              disabled={loading}
              className="text-lg px-8 py-6"
            >
              {loading ? "Connecting..." : (
                <>
                  <Globe className="h-5 w-5 mr-2" />
                  Start with Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              <Smartphone className="h-5 w-5 mr-2" />
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            ✨ No credit card required • 14-day free trial • Setup in minutes
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools designed specifically for modern hospitality businesses
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-elegant bg-gradient-card hover:shadow-glow transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-3">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-muted/30 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Loved by Hospitality Professionals
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our customers say about transforming their business
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-elegant bg-background">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Choose Your Perfect Plan
            </h2>
            <p className="text-xl text-muted-foreground">
              Transparent pricing that scales with your business
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`border-0 shadow-elegant relative ${
                plan.popular 
                  ? 'bg-gradient-card border-2 border-primary shadow-glow' 
                  : 'bg-background'
              }`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={handleStartTrial}
                  >
                    Get Started
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/80">
            Join thousands of hotels and villas already maximizing their potential with our platform
          </p>
          <Button 
            size="lg"
            variant="secondary"
            onClick={handleStartTrial}
            disabled={loading}
            className="text-lg px-8 py-6"
          >
            {loading ? "Starting..." : "Start Your Free Trial"}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={checkinLogo} alt="CHECK-IN CHECK-OUT" className="w-10 h-10 rounded-lg" />
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-bold">CHECK-IN</span>
                  <span className="text-lg font-normal">CHECK-OUT</span>
                </div>
              </div>
              <p className="text-muted-foreground">
                The ultimate hospitality management platform for modern hotels and villas.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Features</li>
                <li>Pricing</li>
                <li>API</li>
                <li>Integrations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Documentation</li>
                <li>Training</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Privacy</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 CHECK-IN CHECK-OUT. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Information Gathering Modal */}
      <Dialog open={showInfoForm} onOpenChange={setShowInfoForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tell us about your business</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Enter your hotel/villa name"
                value={businessInfo.businessName}
                onChange={(e) => setBusinessInfo({...businessInfo, businessName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select 
                value={businessInfo.businessType} 
                onValueChange={(value) => setBusinessInfo({...businessInfo, businessType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="villa">Villa/Vacation Rental</SelectItem>
                  <SelectItem value="bnb">Bed & Breakfast</SelectItem>
                  <SelectItem value="hostel">Hostel</SelectItem>
                  <SelectItem value="resort">Resort</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numberOfRooms">Number of Rooms/Units</Label>
              <Select 
                value={businessInfo.numberOfRooms} 
                onValueChange={(value) => setBusinessInfo({...businessInfo, numberOfRooms: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select number of rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 rooms</SelectItem>
                  <SelectItem value="6-15">6-15 rooms</SelectItem>
                  <SelectItem value="16-50">16-50 rooms</SelectItem>
                  <SelectItem value="51-100">51-100 rooms</SelectItem>
                  <SelectItem value="100+">100+ rooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City, Country"
                value={businessInfo.location}
                onChange={(e) => setBusinessInfo({...businessInfo, location: e.target.value})}
              />
            </div>
            <Button 
              className="w-full mt-6" 
              onClick={handleInfoFormSubmit}
              disabled={!businessInfo.businessName || !businessInfo.businessType}
            >
              Continue with Google
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}