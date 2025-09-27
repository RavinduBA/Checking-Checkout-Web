import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionRoute } from "@/components/PermissionRoute";
import { Layout } from "./components/Layout";
import { AuthRedirect } from "./components/AuthRedirect";
import { SmartRedirect } from "./components/SmartRedirect";
import Dashboard from "./pages/Dashboard";
import Income from "./pages/Income";
import PaymentForm from "./pages/PaymentForm";
import Expense from "./pages/Expense";
import EnhancedCalendar from "./pages/EnhancedCalendar";
import BookingChannelsIntegration from "@/pages/BookingChannelsIntegration";
import Reports from "@/pages/Reports";
import FinancialReports from "./pages/FinancialReports";
import Accounts from "./pages/Accounts";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import BookingForm from "./pages/BookingForm";
import MasterFiles from "./pages/MasterFiles";
import RoomManagement from "./pages/RoomManagement";
import ReservationDetails from "./pages/ReservationDetails";
import ReservationFormCompact from "./pages/ReservationFormCompact";
import Reservations from "./pages/Reservations";
import AccessDenied from "./pages/AccessDenied";
import Onboarding from "./pages/Onboarding";
import BillingSubscription from "./pages/BillingSubscription";
import BillingSuccess from "./pages/BillingSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LocationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/smart-redirect" element={
              <ProtectedRoute>
                <SmartRedirect />
              </ProtectedRoute>
            } />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_dashboard"]}>
                  <Dashboard />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_calendar"]}>
                  <EnhancedCalendar />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/booking-channels" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_booking_channels"]}>
                  <BookingChannelsIntegration />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/master-files" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_master_files"]}>
                  <MasterFiles />
                </PermissionRoute>
              } />
            </Route>
            {/* <Route path="/income" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission="income">
                  <Income />
                </PermissionRoute>
              } />
            </Route> */}
            <Route path="/payments/new" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_income"]}>
                  <PaymentForm />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/expense" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_expenses"]}>
                  <Expense />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/booking/new" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_bookings"]}>
                  <BookingForm />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/booking/edit/:id" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_bookings"]}>
                  <BookingForm />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/reservations" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_bookings"]}>
                  <Reservations />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/reservations/new" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_bookings"]}>
                  <ReservationFormCompact />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/reservations/edit/:id" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_bookings"]}>
                  <ReservationFormCompact />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/reservations/:id" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_bookings"]}>
                  <ReservationDetails />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_reports"]}>
                  <Reports />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/financial-reports" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_reports"]}>
                  <FinancialReports />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/accounts" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_accounts"]}>
                  <Accounts />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/users" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_users"]}>
                  <Users />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={
                <PermissionRoute permission={["access_settings"]}>
                  <Settings />
                </PermissionRoute>
              } />
            </Route>
            <Route path="/billing" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<BillingSubscription />} />
            </Route>
            <Route path="/billing/success" element={
              <ProtectedRoute>
                <BillingSuccess />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </LocationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
