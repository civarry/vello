import { toast } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Enhanced toast notification utilities
 * Provides consistent toast behavior across the application
 */
export const toastNotification = {
  /**
   * Show a success toast
   */
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show an error toast (longer duration for errors)
   */
  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 6000, // Longer for errors
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show an info toast
   */
  info: (message: string, options?: ToastOptions) => {
    return toast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  /**
   * Show a loading toast (returns a promise-based toast)
   */
  loading: (message: string) => {
    return toast.loading(message);
  },

  /**
   * Show a promise-based toast
   * Automatically shows loading, success, or error states
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

/**
 * Hook for toast notifications with consistent patterns
 */
export function useToastNotification() {
  return toastNotification;
}
