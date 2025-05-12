import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SandboxEnvironment } from '@shared/schema';

interface SandboxContextType {
  isEnabled: boolean;
  currentEnvironment: SandboxEnvironment | null;
  environments: SandboxEnvironment[];
  isLoading: boolean;
  enableSandbox: () => void;
  disableSandbox: () => void;
  setCurrentEnvironment: (envId: number) => void;
  createEnvironment: (data: { name: string; description?: string }) => Promise<void>;
  updateEnvironment: (id: number, data: { name?: string; description?: string; isActive?: boolean }) => Promise<void>;
  deleteEnvironment: (id: number) => Promise<void>;
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined);

export const useSandbox = () => {
  const context = useContext(SandboxContext);
  if (context === undefined) {
    throw new Error('useSandbox must be used within a SandboxProvider');
  }
  return context;
};

interface SandboxProviderProps {
  children: ReactNode;
}

export const SandboxProvider = ({ children }: SandboxProviderProps) => {
  // Always enabled for guest mode
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentEnvironmentId, setCurrentEnvironmentId] = useState<number | null>(1); // Default to demo environment
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sandbox environments
  const { data: environments = [], isLoading } = useQuery<SandboxEnvironment[]>({
    queryKey: ['/api/sandbox/environments'],
    enabled: isEnabled,
  });

  // Current environment
  const currentEnvironment = useMemo(() => {
    if (!currentEnvironmentId || !environments.length) return null;
    return environments.find((env: SandboxEnvironment) => env.id === currentEnvironmentId) || null;
  }, [environments, currentEnvironmentId]);

  // Create a new sandbox environment
  const { mutateAsync: createEnvironmentMutation } = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest('/api/sandbox/environments', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sandbox/environments'] });
      toast({
        title: 'Success',
        description: 'Sandbox environment created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create sandbox environment',
        variant: 'destructive',
      });
    },
  });

  // Update a sandbox environment
  const { mutateAsync: updateEnvironmentMutation } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; description?: string; isActive?: boolean } }) => {
      return apiRequest(`/api/sandbox/environments/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sandbox/environments'] });
      toast({
        title: 'Success',
        description: 'Sandbox environment updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update sandbox environment',
        variant: 'destructive',
      });
    },
  });

  // Delete a sandbox environment
  const { mutateAsync: deleteEnvironmentMutation } = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/sandbox/environments/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sandbox/environments'] });
      toast({
        title: 'Success',
        description: 'Sandbox environment deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete sandbox environment',
        variant: 'destructive',
      });
    },
  });

  // Enable sandbox mode
  const enableSandbox = useCallback(() => {
    setIsEnabled(true);
    localStorage.setItem('sandbox_enabled', 'true');
    toast({
      title: 'Sandbox Enabled',
      description: 'You are now using the sandbox environment',
    });
  }, [toast]);

  // Disable sandbox mode
  const disableSandbox = useCallback(() => {
    setIsEnabled(false);
    setCurrentEnvironmentId(null);
    localStorage.setItem('sandbox_enabled', 'false');
    toast({
      title: 'Sandbox Disabled',
      description: 'You are now using the production environment',
    });
  }, [toast]);

  // Set current environment
  const setCurrentEnvironment = useCallback((envId: number) => {
    setCurrentEnvironmentId(envId);
    localStorage.setItem('sandbox_environment_id', envId.toString());
    toast({
      title: 'Environment Changed',
      description: 'Sandbox environment has been changed',
    });
  }, [toast]);

  // Create environment wrapper
  const createEnvironment = useCallback(async (data: { name: string; description?: string }) => {
    await createEnvironmentMutation(data);
  }, [createEnvironmentMutation]);

  // Update environment wrapper
  const updateEnvironment = useCallback(async (id: number, data: { name?: string; description?: string; isActive?: boolean }) => {
    await updateEnvironmentMutation({ id, data });
  }, [updateEnvironmentMutation]);

  // Delete environment wrapper
  const deleteEnvironment = useCallback(async (id: number) => {
    await deleteEnvironmentMutation(id);
  }, [deleteEnvironmentMutation]);

  // Initialize from localStorage on mount
  React.useEffect(() => {
    const sandboxEnabled = localStorage.getItem('sandbox_enabled') === 'true';
    const envId = localStorage.getItem('sandbox_environment_id');
    
    if (sandboxEnabled) {
      setIsEnabled(true);
      if (envId) {
        setCurrentEnvironmentId(parseInt(envId, 10));
      }
    }
  }, []);

  const value = useMemo(() => ({
    isEnabled,
    currentEnvironment,
    environments,
    isLoading,
    enableSandbox,
    disableSandbox,
    setCurrentEnvironment,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
  }), [
    isEnabled,
    currentEnvironment,
    environments,
    isLoading,
    enableSandbox,
    disableSandbox,
    setCurrentEnvironment,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
  ]);

  return (
    <SandboxContext.Provider value={value}>
      {children}
    </SandboxContext.Provider>
  );
};