import { useState } from "react";
import { ArrowLeft, Minus, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const expenseCategories = {
  "Utilities": ["Electricity", "Water", "Internet", "Telephone"],
  "Maintenance": ["Repairs", "Cleaning", "Garden", "Pool Maintenance"],
  "Staff": ["Caretaker Salary", "Cleaning Staff", "Security"],
  "Marketing": ["Booking.com Commission", "Airbnb Commission", "Photography"],
  "Property": ["Monthly Rent", "Insurance", "Property Tax"],
  "Supplies": ["Laundry Supplies", "Kitchen Supplies", "Bathroom Supplies"],
  "Other": ["Miscellaneous", "Emergency Repairs"]
};

const accounts = [
  { id: "1", name: "Sampath Bank", currency: "LKR" },
  { id: "2", name: "Payoneer", currency: "USD" },
  { id: "3", name: "Asaliya Cash", currency: "LKR" },
  { id: "4", name: "Wishva Account", currency: "LKR" }
];

export default function Expense() {
  const [formData, setFormData] = useState({
    mainCategory: "",
    subCategory: "",
    amount: "",
    accountId: "",
    note: "",
    date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, this would save to Supabase
    toast({
      title: "Expense Added Successfully",
      description: `Rs. ${Number(formData.amount).toLocaleString()} expense recorded for ${formData.subCategory}`,
      variant: "destructive"
    });
    
    // Reset form
    setFormData({
      mainCategory: "",
      subCategory: "",
      amount: "",
      accountId: "",
      note: "",
      date: new Date().toISOString().split('T')[0]
    });
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const subCategories = formData.mainCategory ? expenseCategories[formData.mainCategory as keyof typeof expenseCategories] : [];

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
          <h1 className="text-2xl font-bold text-foreground">Add Expense</h1>
          <p className="text-muted-foreground">Record expense for Asaliya Villa</p>
        </div>
      </div>

      {/* Current Location Badge */}
      <Badge variant="outline" className="w-fit">
        📍 Asaliya Villa
      </Badge>

      {/* Form */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-destructive" />
            Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Category */}
            <div className="space-y-2">
              <Label htmlFor="mainCategory">Main Category</Label>
              <Select 
                value={formData.mainCategory} 
                onValueChange={(value) => setFormData({...formData, mainCategory: value, subCategory: ""})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select main category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(expenseCategories).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub Category */}
            {formData.mainCategory && (
              <div className="space-y-2">
                <Label htmlFor="subCategory">Sub Category</Label>
                <Select 
                  value={formData.subCategory} 
                  onValueChange={(value) => setFormData({...formData, subCategory: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub category" />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map((subCategory) => (
                      <SelectItem key={subCategory} value={subCategory}>
                        {subCategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                  Will be deducted from {selectedAccount.name} ({selectedAccount.currency})
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

            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="account">Pay from Account</Label>
              <Select 
                value={formData.accountId} 
                onValueChange={(value) => setFormData({...formData, accountId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
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

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add details about this expense..."
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">Cancel</Link>
              </Button>
              <Button 
                type="submit" 
                variant="destructive"
                className="flex-1"
                disabled={!formData.mainCategory || !formData.subCategory || !formData.amount || !formData.accountId}
              >
                <Minus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}