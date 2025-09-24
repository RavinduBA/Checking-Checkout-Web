import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Percent,
  Calendar,
  Building2,
  CreditCard,
  Download,
  Filter,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import FinancialReports from "./FinancialReports";
import CommissionReports from "@/components/reports/CommissionReports";
import AccountsReports from "@/components/reports/AccountsReports";
import EnhancedFinancialReports from "@/components/reports/EnhancedFinancialReports";
import DetailedBalanceSheet from "@/components/reports/DetailedBalanceSheet";
import ComprehensiveReports from "@/components/reports/ComprehensiveReports";

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "comprehensive";

  return (
    <div className="max-w-full pb-20 w-full mx-auto p-2 lg:p-6 space-y-4 animate-fade-in">

      {/* Stats Cards */}
      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="bg-card border">
          <CardContent className="p-3 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total Revenue</p>
                <div className="flex items-center gap-1">
                  <DollarSign className="size-4 text-emerald-500" />
                  <p className="text-lg lg:text-2xl font-bold">$24,580</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-3 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total Expenses</p>
                <div className="flex items-center gap-1">
                  <TrendingUp className="size-4 text-red-500" />
                  <p className="text-lg lg:text-2xl font-bold">$12,450</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-3 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Net Profit</p>
                <div className="flex items-center gap-1">
                  <BarChart3 className="size-4 text-primary" />
                  <p className="text-lg lg:text-2xl font-bold">$12,130</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-3 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Commissions</p>
                <div className="flex items-center gap-1">
                  <Percent className="size-4 text-purple-500" />
                  <p className="text-lg lg:text-2xl font-bold">$2,340</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Reports Content */}
      <Card className="bg-card border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="text-base  font-semibold">Reports Dashboard</CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                Access detailed financial reports and analytics
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Filter className="size-4 mr-2" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Download className="size-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <RefreshCw className="size-4 mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })} className="w-full">
            {/* Mobile Tab Navigation */}
            <div className="lg:hidden px-4 pb-4">
              <TabsList className="grid w-full grid-cols-2 gap-2 h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="comprehensive" 
                  className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <BarChart3 className="size-4" />
                  <span className="text-xs">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="detailed" 
                  className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <TrendingUp className="size-4" />
                  <span className="text-xs">Detailed</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsList className="grid w-full grid-cols-2 gap-2 h-auto p-0 bg-transparent mt-2">
                <TabsTrigger 
                  value="accounts" 
                  className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <CreditCard className="size-4" />
                  <span className="text-xs">Accounts</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="commission" 
                  className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Percent className="size-4" />
                  <span className="text-xs">Commission</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="hidden lg:block px-6 pb-4">
              <TabsList className="grid w-full grid-cols-4 h-12">
                <TabsTrigger value="comprehensive" className="flex items-center gap-2 text-md ">
                  <BarChart3 className="size-4" />
                  Financial Overview
                </TabsTrigger>
                <TabsTrigger value="detailed" className="flex items-center gap-2 text-md ">
                  <TrendingUp className="size-4" />
                  Detailed Reports
                </TabsTrigger>
                <TabsTrigger value="accounts" className="flex items-center gap-2 text-md ">
                  <CreditCard className="size-4" />
                  Account Statements
                </TabsTrigger>
                <TabsTrigger value="commission" className="flex items-center gap-2 text-md ">
                  <Percent className="size-4" />
                  Commissions
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="px-2 pb-2">
              <TabsContent value="comprehensive" className="mt-0">
                <ComprehensiveReports />
              </TabsContent>

              <TabsContent value="detailed" className="mt-0">
                <EnhancedFinancialReports />
              </TabsContent>

              <TabsContent value="accounts" className="mt-0">
                <DetailedBalanceSheet />
              </TabsContent>

              <TabsContent value="commission" className="mt-0">
                <CommissionReports />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}