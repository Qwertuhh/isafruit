import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BackendType, ServerState } from "@/types/store";

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      pythonBackendAvailable: false,
      currentBackend: BackendType.NODE,
      checkPythonBackendAvailable: async () => {
        try {
          const responseInference = await fetch(
            `${process.env.NEXT_PUBLIC_PYTHON_INFERENCE_URL}/health`
          );
          const responsePhotoDetect = await fetch(
            `${process.env.NEXT_PUBLIC_PYTHON_PHOTO_DETECT_URL}/health`
          );
          if (responseInference.ok && responsePhotoDetect.ok) {
            set({ pythonBackendAvailable: true });
            return true;
          } else {
            set({ pythonBackendAvailable: false });
            return false;
          }
        } catch (error) {
          console.error("Error checking Python backend availability:", error);
          set({ pythonBackendAvailable: false });
          return false;
        }
      },
      getCurrentBackend: () => get().currentBackend,
      setUsePythonBackend: (value) =>
        set({ currentBackend: value ? BackendType.PYTHON : BackendType.NODE }),
      setCurrentBackend: (backend) => set({ currentBackend: backend }),
    }),
    {
      name: "server-settings", //? name of the item in the storage (must be unique)
    }
  )
);
