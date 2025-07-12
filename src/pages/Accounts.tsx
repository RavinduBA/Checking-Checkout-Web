import { useState } from "react";
import { ArrowLeft, Plus, CreditCard, ArrowRightLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const mockAccounts = [
  { id: "1", name: "Sampath Bank", currency: "LKR", balance: 150000, locationAccess: ["Asaliya Villa", "Rusty Bunk"] },
  { id: "2", name: "Payoneer", currency: "USD", balance: 500, locationAccess: ["All Locations"] },
  { id: "3", name: "Asaliya Cash", currency: "LKR", balance: 25000, locationAccess: ["Asaliya Villa"] },
  { id: "4", name: "Wishva Account", currency: "LKR", balance: 75000, locationAccess: ["Asaliya Villa", "Rusty Bunk"] }
];

const locations = ["Asaliya Villa", "Rusty Bunk", "Antiqua Serenity"];

export default function Accounts() {
  const [accounts, setAccounts] = useState(mockAccounts);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    currency: "LKR",
    initialBalance: "",
    locationAccess: []
  });
  const [transfer, setTransfer] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    conversionRate: "1"
  });
  const { toast } = useToast();

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "USD") {
      return `$${amount.toLocaleString()}`;
    }
    return `Rs. ${amount.toLocaleString()}`;
  };

  const handleAddAccount = () => {
    if (!newAccount.name || !newAccount.initialBalance) return;
    
    const account = {
      id: Date.now().toString(),
      name: newAccount.name,
      currency: newAccount.currency as "LKR" | "USD",
      balance: parseFloat(newAccount.initialBalance),
      locationAccess: newAccount.locationAccess
    };
    
    setAccounts([...accounts, account]);
    setNewAccount({ name: "", currency: "LKR", initialBalance: "", locationAccess: [] });
    setShowAddAccount(false);
    
    toast({
      title: "Account Added",
      description: `${account.name} has been created successfully.`,
    });
  };

  const handleTransfer = () => {
    if (!transfer.fromAccount || !transfer.toAccount || !transfer.amount) return;
    
    const amount = parseFloat(transfer.amount);
    const rate = parseFloat(transfer.conversionRate);
    
    setAccounts(prev => prev.map(account => {
      if (account.id === transfer.fromAccount) {
        return { ...account, balance: account.balance - amount };
      }
      if (account.id === transfer.toAccount) {
        return { ...account, balance: account.balance + (amount * rate) };
      }
      return account;
    }));
    
    setTransfer({ fromAccount: "", toAccount: "", amount: "", conversionRate: "1" });
    setShowTransfer(false);
    
    toast({
      title: "Transfer Complete",
      description: `Successfully transferred ${formatCurrency(amount, "LKR")}.`,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Account Management</h1>
            <p className="text-muted-foreground">Manage bank accounts and transfers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Between Accounts</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>From Account</Label>
                  <Select value={transfer.fromAccount} onValueChange={(value) => setTransfer({...transfer, fromAccount: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.balance, account.currency)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>To Account</Label>
                  <Select value={transfer.toAccount} onValueChange={(value) => setTransfer({...transfer, toAccount: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(acc => acc.id !== transfer.fromAccount).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.balance, account.currency)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={transfer.amount}
                    onChange={(e) => setTransfer({...transfer, amount: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Conversion Rate (if different currencies)</Label>
                  <Input
                    type="number"
                    placeholder="1.0"
                    value={transfer.conversionRate}
                    onChange={(e) => setTransfer({...transfer, conversionRate: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    For USD to LKR, use ~300. For same currency, use 1.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowTransfer(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleTransfer} className="flex-1">
                    Transfer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    placeholder="e.g., Commercial Bank"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={newAccount.currency} onValueChange={(value) => setNewAccount({...newAccount, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LKR">LKR (Sri Lankan Rupees)</SelectItem>
                      <SelectItem value="USD">USD (US Dollars)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Initial Balance</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newAccount.initialBalance}
                    onChange={(e) => setNewAccount({...newAccount, initialBalance: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Location Access</Label>
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <div key={location} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={location}
                          checked={newAccount.locationAccess.includes(location)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAccount({
                                ...newAccount,
                                locationAccess: [...newAccount.locationAccess, location]
                              });
                            } else {
                              setNewAccount({
                                ...newAccount,
                                locationAccess: newAccount.locationAccess.filter(l => l !== location)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor={location} className="text-sm">{location}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddAccount(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleAddAccount} className="flex-1">
                    Add Account
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {account.currency}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Location Access:</p>
                  <div className="flex flex-wrap gap-1">
                    {account.locationAccess.map((location) => (
                      <Badge key={location} variant="secondary" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Balance Summary */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle>Total Balance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total LKR</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  accounts.filter(a => a.currency === "LKR").reduce((sum, a) => sum + a.balance, 0),
                  "LKR"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total USD</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  accounts.filter(a => a.currency === "USD").reduce((sum, a) => sum + a.balance, 0),
                  "USD"
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}