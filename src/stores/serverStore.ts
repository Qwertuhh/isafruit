import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BackendType, ServerState } from '@/types/store';

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      usePythonBackend: false,
      pythonBackendAvailable: false,
      gpuInfo: null,
      currentBackend: BackendType.NODE,
      setUsePythonBackend: (value) => set({ usePythonBackend: value }),
      setPythonBackendAvailable: (value) => set({ pythonBackendAvailable: value }),
      setGpuInfo: (info) => set({ gpuInfo: info }),
      setCurrentBackend: (backend) => set({ currentBackend: backend }),
      checkBackendAvailability: async () => {
        try {
          // Check Node.js backend
          const nodeResponse = await fetch("/api/photo-detect");
          const nodeData = await nodeResponse.json();
          
          if (nodeData.gpu) {
            set({ gpuInfo: nodeData.gpu });
            set({ currentBackend: BackendType.NODE });
          }

          // Check Python backend
          const pythonResponse = await fetch("/api/photo-detect?usePython=true");
          if (pythonResponse.ok) {
            const pythonData = await pythonResponse.json();
            set({ pythonBackendAvailable: pythonData.ok });
            set({ currentBackend: pythonData.ok ? BackendType.PYTHON : BackendType.NODE });
          } else {
            throw new Error("Python backend not available");
          }
        } catch (error) {
          console.log("Error checking backend availability:", error);
          set({ currentBackend: BackendType.NODE, pythonBackendAvailable: false });
        }
      },
    }),
    {
      name: 'server-settings', // name of the item in the storage (must be unique)
    }
  )
);
