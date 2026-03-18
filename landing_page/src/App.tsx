import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/ProductPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import PricingPage from "@/pages/PricingPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import BlogPage from "@/pages/BlogPage";
import UseCasesPage from "@/pages/UseCasesPage";
import CareersPage from "@/pages/CareersPage";
import LifecyclePage from "@/pages/LifecyclePage";
import NotFound from "@/pages/NotFound";
import { AuthProvider } from "@/portal/auth-context";
import { ProtectedRoute } from "@/portal/protected-route";
import PortalLoginPage from "@/portal/pages/auth/PortalLoginPage";
import PortalIndexPage from "@/portal/pages/auth/PortalIndexPage";
import AdminOverviewPage from "@/portal/pages/admin/AdminOverviewPage";
import AdminLeadsPage from "@/portal/pages/admin/AdminLeadsPage";
import AdminUsersPage from "@/portal/pages/admin/AdminUsersPage";
import AdminPatientsPage from "@/portal/pages/admin/AdminPatientsPage";
import DoctorDashboardPage from "@/portal/pages/doctor/DoctorDashboardPage";
import DoctorCaseloadPage from "@/portal/pages/doctor/DoctorCaseloadPage";
import DoctorPatientDetailPage from "@/portal/pages/doctor/DoctorPatientDetailPage";
import SpecialistDashboardPage from "@/portal/pages/specialist/SpecialistDashboardPage";
import SpecialistCaseloadPage from "@/portal/pages/specialist/SpecialistCaseloadPage";
import SpecialistPatientDetailPage from "@/portal/pages/specialist/SpecialistPatientDetailPage";
import PatientDashboardPage from "@/portal/pages/patient/PatientDashboardPage";
import PatientFamilyAccessPage from "@/portal/pages/patient/PatientFamilyAccessPage";
import FamilyDashboardPage from "@/portal/pages/family/FamilyDashboardPage";
import FamilyQuestionsPage from "@/portal/pages/family/FamilyQuestionsPage";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const location = useLocation();
  const isPortal = location.pathname.startsWith("/portal");

  return (
    <>
      {!isPortal ? <Navbar /> : null}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product" element={<ProductPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/use-cases" element={<UseCasesPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/lifecycle" element={<LifecyclePage />} />

          <Route path="/portal/login" element={<PortalLoginPage />} />
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <PortalIndexPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/admin"
            element={
              <ProtectedRoute allow={["ADMIN"]}>
                <AdminOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/leads"
            element={
              <ProtectedRoute allow={["ADMIN"]}>
                <AdminLeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/patients"
            element={
              <ProtectedRoute allow={["ADMIN"]}>
                <AdminPatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/users"
            element={
              <ProtectedRoute allow={["ADMIN"]}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/doctor"
            element={
              <ProtectedRoute allow={["DOCTOR"]}>
                <DoctorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/doctor/caseload"
            element={
              <ProtectedRoute allow={["DOCTOR"]}>
                <DoctorCaseloadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/doctor/patient/:patientId"
            element={
              <ProtectedRoute allow={["DOCTOR"]}>
                <DoctorPatientDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/specialist"
            element={
              <ProtectedRoute allow={["SPECIALIST"]}>
                <SpecialistDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/specialist/caseload"
            element={
              <ProtectedRoute allow={["SPECIALIST"]}>
                <SpecialistCaseloadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/specialist/patient/:patientId"
            element={
              <ProtectedRoute allow={["SPECIALIST"]}>
                <SpecialistPatientDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/patient"
            element={
              <ProtectedRoute allow={["PATIENT"]}>
                <PatientDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/patient/family-access"
            element={
              <ProtectedRoute allow={["PATIENT"]}>
                <PatientFamilyAccessPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/family"
            element={
              <ProtectedRoute allow={["FAMILY_MEMBER"]}>
                <FamilyDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/family/questions"
            element={
              <ProtectedRoute allow={["FAMILY_MEMBER"]}>
                <FamilyQuestionsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/portal/*" element={<Navigate to="/portal" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isPortal ? <Footer /> : null}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
