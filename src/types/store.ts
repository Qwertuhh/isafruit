enum BackendType {
  NODE = "Node.js",
  PYTHON = "Python",
}
interface ServerState {
  pythonBackendAvailable: boolean; // Whether the Python backend is available
  currentBackend: BackendType; // The currently selected backend
  checkPythonBackendAvailable: () => Promise<boolean>;
  setUsePythonBackend: (value: boolean) => void;
  getCurrentBackend: () => BackendType;
  setCurrentBackend: (backend: BackendType) => void;
}

export { BackendType };
export type { ServerState };
