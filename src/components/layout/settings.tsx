import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useServerStore } from "@/stores/serverStore";
import { BackendType } from "@/types/store";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsProps {
  children: React.ReactNode;
  currentBackendRef: React.RefObject<BackendType>;
}

function Settings({ children, currentBackendRef }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    currentBackend,
    pythonBackendAvailable,
    setCurrentBackend,
    checkPythonBackendAvailable,
  } = useServerStore();

  const [selectedBackend, setSelectedBackend] =
    useState<BackendType>(currentBackend);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckStatus, setLastCheckStatus] = useState<boolean | null>(null);

  // Update local state when store changes
  useEffect(() => {
    setSelectedBackend(currentBackend);
  }, [currentBackend]);

  const checkBackends = async () => {
    try {
      setIsChecking(true);
      const isAvailable = await checkPythonBackendAvailable();
      setLastCheckStatus(isAvailable);

      // If current selection is Python but it's not available, fall back to Node.js
      if (selectedBackend === BackendType.PYTHON && !isAvailable) {
        setSelectedBackend(BackendType.NODE);
      }

      return isAvailable;
    } catch (error) {
      console.error("Error checking backend availability:", error);
      setLastCheckStatus(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  // Initial check on component mount
  useEffect(() => {
    checkBackends();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckAvailability = async () => {
    const isAvailable = await checkBackends();

    // Show feedback to user
    if (isAvailable) {
      // You could add a toast notification here if desired
      console.log("Python backend is now available!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`user selected ${selectedBackend} backend`);
    currentBackendRef.current = selectedBackend;

    // If selected backend is Python, verify it's available before saving
    if (selectedBackend === BackendType.PYTHON) {
      const isAvailable = await checkBackends();
      if (!isAvailable) {
        // Don't save if Python is not available
        return;
      }
    }

    // Only update if backend has changed
    if (selectedBackend !== currentBackend) {
      await setCurrentBackend(selectedBackend);
      // Show a success message
      toast.success(`Backend changed to ${selectedBackend}`, {
        description: "The changes have been applied successfully.",
      });
    }

    setIsOpen(false); // Close the dialog after saving
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <form onSubmit={handleSubmit}>
        <DialogTrigger asChild onClick={() => setIsOpen(true)}>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your backend settings
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-left gap-4">
              <Label htmlFor="backend" className="text-left">
                Backend
              </Label>
              <div className="flex items-left gap-4">
                <Select
                  value={selectedBackend}
                  onValueChange={(value) =>
                    setSelectedBackend(value as BackendType)
                  }
                  disabled={isChecking}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select backend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BackendType.NODE}>
                      {BackendType.NODE}
                    </SelectItem>
                    <SelectItem
                      value={BackendType.PYTHON}
                      disabled={!pythonBackendAvailable}
                    >
                      {pythonBackendAvailable
                        ? BackendType.PYTHON
                        : `${BackendType.PYTHON} (Not Available)`}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {!pythonBackendAvailable &&
                  selectedBackend === BackendType.PYTHON && (
                    <p className="text-xs text-amber-500 mt-1">
                      Python backend is not available. Falling back to Node.js.
                    </p>
                  )}
              </div>
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckAvailability}
                  disabled={isChecking}
                >
                  {isChecking ? "Checking..." : "Check Availability"}
                </Button>
                {lastCheckStatus !== null && (
                  <span
                    className={`ml-2 text-xs self-center ${
                      lastCheckStatus ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {lastCheckStatus ? "Available" : "Not Available"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                isChecking ||
                (selectedBackend === BackendType.PYTHON &&
                  lastCheckStatus === false)
              }
              className="cursor-pointer"
              onClick={handleSubmit}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

export default Settings;