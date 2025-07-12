import { useState, useEffect } from "react";
import { ArrowLeft, Plus, DollarSign, Calendar, Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import jsPDF from 'jspdf';

const incomeTypes = [
  { value: "booking", label: "Booking Income" },
  { value: "laundry", label: "Laundry Income" },
  { value: "food", label: "Food Income" },
  { value: "other", label: "Other Income" }
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank Transfer" },
  { value: "payoneer", label: "Payoneer" }
];

type Location = Tables<"locations">;
type Account = Tables<"accounts">;

export default function Income() {
  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    accountId: "",
    locationId: "",
    paymentMethod: "",
    isAdvance: false,
    note: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [locationsData, accountsData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*")
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const selectedLocation = locations.find(l => l.id === formData.locationId);
    const selectedAccount = accounts.find(a => a.id === formData.accountId);
    
    // Header
    doc.setFontSize(20);
    doc.text('Income Record', 20, 30);
    
    // Details
    doc.setFontSize(12);
    doc.text(`Location: ${selectedLocation?.name || 'N/A'}`, 20, 50);
    doc.text(`Income Type: ${incomeTypes.find(t => t.value === formData.type)?.label || 'N/A'}`, 20, 60);
    doc.text(`Amount: LKR ${Number(formData.amount).toLocaleString()}`, 20, 70);
    doc.text(`Account: ${selectedAccount?.name || 'N/A'}`, 20, 80);
    doc.text(`Payment Method: ${paymentMethods.find(p => p.value === formData.paymentMethod)?.label || 'N/A'}`, 20, 90);
    doc.text(`Date: ${formData.date}`, 20, 100);
    doc.text(`Is Advance: ${formData.isAdvance ? 'Yes' : 'No'}`, 20, 110);
    if (formData.note) {
      doc.text(`Note: ${formData.note}`, 20, 120);
    }
    
    doc.save(`income-${formData.date}-${Date.now()}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from("income")
        .insert([{
          type: formData.type as any,
          amount: Number(formData.amount),
          account_id: formData.accountId,
          location_id: formData.locationId,
          payment_method: formData.paymentMethod,
          is_advance: formData.isAdvance,
          note: formData.note || null,
          date: formData.date
        }]);

      if (error) throw error;

      toast({
        title: "Income Added Successfully",
        description: `LKR ${Number(formData.amount).toLocaleString()} added to ${accounts.find(a => a.id === formData.accountId)?.name}`,
      });
      
      // Reset form
      setFormData({
        type: "",
        amount: "",
        accountId: "",
        locationId: "",
        paymentMethod: "",
        isAdvance: false,
        note: "",
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Error adding income:", error);
      toast({
        title: "Error",
        description: "Failed to add income",
        variant: "destructive"
      });
    }
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const selectedLocation = locations.find(l => l.id === formData.locationId);

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Income</h1>
          <p className="text-muted-foreground">Record income for selected location</p>
        </div>
      </div>

      {/* Current Location Badge */}
      {selectedLocation && (
        <Badge variant="outline" className="w-fit flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          {selectedLocation.name}
        </Badge>
      )}

      {/* Form */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Income Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select 
                value={formData.locationId} 
                onValueChange={(value) => setFormData({...formData, locationId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Income Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Income Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({...formData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select income type" />
                </SelectTrigger>
                <SelectContent>
                  {incomeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How was this paid?" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="account">Deposit to Account</Label>
              <Select 
                value={formData.accountId} 
                onValueChange={(value) => setFormData({...formData, accountId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Map(accounts.map(account => [account.id, account])).values()].map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{account.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {account.currency}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="pl-10"
                  required
                />
              </div>
              {selectedAccount && (
                <p className="text-xs text-muted-foreground">
                  Will be added to {selectedAccount.name} ({selectedAccount.currency})
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Advance Payment Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="advance"
                checked={formData.isAdvance}
                onCheckedChange={(checked) => setFormData({...formData, isAdvance: checked as boolean})}
              />
              <Label htmlFor="advance" className="text-sm">
                This is an advance payment
              </Label>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add any additional details..."
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                rows={3}
              />
            </div>

            {/* Submit and PDF Buttons */}
            <div className="flex gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">Cancel</Link>
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={generatePDF}
                disabled={!formData.type || !formData.amount || !formData.accountId || !formData.locationId || !formData.paymentMethod}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!formData.type || !formData.amount || !formData.accountId || !formData.locationId || !formData.paymentMethod}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}