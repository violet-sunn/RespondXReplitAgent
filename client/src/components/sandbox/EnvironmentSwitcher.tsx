import React from 'react';
import { useSandbox } from '@/contexts/SandboxContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, CheckCircle, Settings, Server } from 'lucide-react';

export function EnvironmentSwitcher() {
  const { 
    isEnabled, 
    currentEnvironment, 
    environments, 
    enableSandbox, 
    disableSandbox, 
    setCurrentEnvironment 
  } = useSandbox();

  return (
    <div className="flex items-center">
      {isEnabled ? (
        <>
          <Badge variant="outline" className="mr-2 bg-yellow-50 text-yellow-800 border-yellow-300">
            Sandbox Mode
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Server className="mr-2 h-4 w-4" />
                {currentEnvironment?.name || 'Select Environment'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sandbox Environments</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {environments.length > 0 ? (
                environments.map(env => (
                  <DropdownMenuItem 
                    key={env.id}
                    onClick={() => setCurrentEnvironment(env.id)}
                    className="flex items-center justify-between"
                  >
                    <span>{env.name}</span>
                    {currentEnvironment?.id === env.id && (
                      <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                    )}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No environments available</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={disableSandbox} className="text-red-500">
                Exit Sandbox Mode
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={enableSandbox}
          className="flex items-center text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
        >
          <Settings className="mr-2 h-4 w-4" />
          Enter Sandbox Mode
        </Button>
      )}
    </div>
  );
}