import { GPUInfo } from "./index";

enum BackendType {
  NODE = "Node.js",
  PYTHON = "Python",
}
interface ServerState {
  usePythonBackend: boolean;
  pythonBackendAvailable: boolean; // Whether the Python backend is available
  gpuInfo: GPUInfo | null;
  currentBackend: BackendType; // The currently selected backend
  setUsePythonBackend: (value: boolean) => void;
  setPythonBackendAvailable: (value: boolean) => void;
  setGpuInfo: (info: GPUInfo | null) => void;
  setCurrentBackend: (backend: BackendType) => void;
  checkBackendAvailability: () => Promise<void>;
}

export { BackendType };
export type {ServerState};
