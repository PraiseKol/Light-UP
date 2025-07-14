// src/components/ui/toaster.jsx
import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          borderRadius: '1rem',
          background: '#2D2D2D',
          color: '#fff',
        },
        success: {
          style: {
            background: '#16a34a',
          },
        },
        error: {
          style: {
            background: '#dc2626',
          },
        },
      }}
    />
  );
}
