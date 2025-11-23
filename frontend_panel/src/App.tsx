// App.tsx
import { useState, useEffect } from "react";
import { UnifiedDashboard } from "./components/UnifiedDashboard";
import { AssumptionsModal } from "./components/AssumptionsModal";
import { GlobalAssumptions } from "./types/deal";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { dashboardService } from "./services/dashboard.service";

export default function App() {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [globalAssumptions, setGlobalAssumptions] =
    useState<GlobalAssumptions | null>(null);
  const [_, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load assumptions on app startup
  useEffect(() => {
    loadAssumptions();
  }, []);

  const loadAssumptions = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getAssumptions();
      setGlobalAssumptions(response.data);
    } catch (error) {
      console.error("Failed to load assumptions:", error);
      toast.error("Failed to load assumptions");
      // Set default assumptions as fallback
      setGlobalAssumptions(getDefaultAssumptions());
    } finally {
      setLoading(false);
    }
  };

  const handleAssumptionsSave = async (assumptions: GlobalAssumptions) => {
    try {
      setSaving(true);
      const response = await dashboardService.updateAssumptions(assumptions);
      setGlobalAssumptions(response.data);
      setShowAssumptions(false);
      toast.success("Assumptions updated successfully!");
      await loadAssumptions();
    } catch (error) {
      console.error("Failed to save assumptions:", error);
      toast.error("Failed to save assumptions");
      throw error; // Re-throw to let the modal handle the error
    } finally {
      setSaving(false);
    }
  };

  const handleResetAssumptions = async () => {
    try {
      setSaving(true);
      const response = await dashboardService.resetAssumptions();
      setGlobalAssumptions(response.data);
      toast.success("Assumptions reset to defaults!");
      await loadAssumptions();
    } catch (error) {
      console.error("Failed to reset assumptions:", error);
      toast.error("Failed to reset assumptions");
    } finally {
      setSaving(false);
    }
  };

  // Default assumptions as fallback
  const getDefaultAssumptions = (): GlobalAssumptions => ({
    ltrVacancyMonths: 1.0,
    section8VacancyMonths: 0.5,
    maintenancePercent: 5,
    rentGrowthPercent: 3,
    appreciationPercent: 3,
    propertyTaxIncreasePercent: 3,
    insuranceIncreasePercent: 5,
    section8ZipData: [],
  });



  return (
    <>
      <UnifiedDashboard
        globalAssumptions={globalAssumptions || getDefaultAssumptions()}
        onOpenAssumptions={() => setShowAssumptions(true)}
      />

      <Dialog open={showAssumptions} onOpenChange={setShowAssumptions}>
        <DialogContent className="w-[95vw] sm:w-[95vw] sm:max-w-[1600px] md:max-w-[1600px] lg:max-w-[1600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Global Assumptions</DialogTitle>
            <DialogDescription>
              Configure default values used across all deal calculations
            </DialogDescription>
          </DialogHeader>
          {globalAssumptions && (
            <AssumptionsModal
              key={globalAssumptions.updatedAt || "default_key"}
              assumptions={globalAssumptions}
              onSave={handleAssumptionsSave}
              onBack={() => setShowAssumptions(false)}
              onReset={handleResetAssumptions}
              saving={saving}
              loadAssumptions={loadAssumptions}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </>
  );
}
