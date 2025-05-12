import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSandbox } from '@/contexts/SandboxContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Plus, 
  Trash, 
  RefreshCw, 
  Edit,
  Server, 
  GitBranch,
  ChevronRight,
  PanelLeftClose,
  PlayCircle,
  Hourglass,
  Waves,
  X,
  Database
} from 'lucide-react';

export default function SandboxPage() {
  const { isAuthenticated } = useAuth();
  const { 
    isEnabled, 
    enableSandbox, 
    environments, 
    createEnvironment,
    deleteEnvironment,
    currentEnvironment,
    setCurrentEnvironment
  } = useSandbox();
  
  const [newEnvironmentName, setNewEnvironmentName] = useState('');
  const [newEnvironmentDesc, setNewEnvironmentDesc] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleCreateEnvironment = async () => {
    if (!newEnvironmentName.trim()) return;
    
    await createEnvironment({
      name: newEnvironmentName,
      description: newEnvironmentDesc || undefined
    });
    
    setNewEnvironmentName('');
    setNewEnvironmentDesc('');
    setIsDialogOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="mb-6 bg-yellow-50 border-yellow-300">
          <AlertTriangle className="h-4 w-4 text-yellow-800" />
          <AlertTitle className="text-yellow-800">Authentication Required</AlertTitle>
          <AlertDescription className="text-yellow-700">
            You need to be logged in to access the sandbox environment.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">RespondX Sandbox</h1>
          <p className="text-gray-500 mt-1">
            Test environment for API integrations and scenarios
          </p>
        </div>
        
        {!isEnabled && (
          <Button onClick={enableSandbox} className="bg-amber-500 hover:bg-amber-600">
            <Server className="mr-2 h-4 w-4" />
            Enable Sandbox Mode
          </Button>
        )}
      </div>
      
      {!isEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Sandbox Mode is Disabled</CardTitle>
            <CardDescription>
              Enable sandbox mode to access testing tools and API simulations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center">
              <Server className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium mb-2">Sandbox Features</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Test App Store Connect API integrations</li>
                <li>Simulate Google Play Developer API responses</li>
                <li>Test GigaChat AI response generation</li>
                <li>Debug error scenarios and timeouts</li>
                <li>Isolated from production data and APIs</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={enableSandbox} className="w-full bg-amber-500 hover:bg-amber-600">
              <Server className="mr-2 h-4 w-4" />
              Enable Sandbox Mode
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Tabs defaultValue="environments">
          <TabsList className="mb-6 grid grid-cols-3 w-[400px]">
            <TabsTrigger value="environments">Environments</TabsTrigger>
            <TabsTrigger value="api-testing">API Testing</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="environments">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sandbox Environments</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Environment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Sandbox Environment</DialogTitle>
                    <DialogDescription>
                      Each environment is isolated and can have its own API test scenarios.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Environment Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Development Testing"
                        value={newEnvironmentName}
                        onChange={(e) => setNewEnvironmentName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Purpose and usage of this environment"
                        value={newEnvironmentDesc}
                        onChange={(e) => setNewEnvironmentDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateEnvironment}>Create Environment</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {environments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Database className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Environments Available</h3>
                    <p className="text-gray-500 mb-4 max-w-md">
                      Create your first sandbox environment to start testing API integrations.
                    </p>
                    <Button 
                      onClick={() => setIsDialogOpen(true)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Environment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {environments.map((env) => (
                  <Card key={env.id} className={currentEnvironment?.id === env.id ? 'border-2 border-primary' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle>{env.name}</CardTitle>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-500 hover:text-gray-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => deleteEnvironment(env.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {env.description && (
                        <CardDescription>{env.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <Server className="mr-2 h-4 w-4" />
                        <span>Created on {new Date(env.createdAt).toLocaleDateString()}</span>
                      </div>
                      {currentEnvironment?.id === env.id && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active Environment
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter>
                      {currentEnvironment?.id !== env.id ? (
                        <Button 
                          className="w-full"
                          variant="outline"
                          onClick={() => setCurrentEnvironment(env.id)}
                        >
                          <GitBranch className="mr-2 h-4 w-4" />
                          Use Environment
                        </Button>
                      ) : (
                        <Button 
                          className="w-full"
                          variant="outline"
                          disabled
                        >
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          Current Environment
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="api-testing">
            <div className="flex flex-col space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <InfoIcon className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">API Testing</AlertTitle>
                <AlertDescription className="text-blue-700">
                  {currentEnvironment ? (
                    `Using "${currentEnvironment.name}" sandbox environment for API testing.`
                  ) : (
                    "Please select or create an active sandbox environment first."
                  )}
                </AlertDescription>
              </Alert>
              
              {!currentEnvironment ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Server className="h-12 w-12 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Environment</h3>
                      <p className="text-gray-500 mb-4 max-w-md">
                        Please select an existing sandbox environment or create a new one to start API testing.
                      </p>
                      <div className="flex space-x-4">
                        <Button 
                          onClick={() => setIsDialogOpen(true)}
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Environment
                        </Button>
                        <Button>
                          <GitBranch className="mr-2 h-4 w-4" />
                          Select Environment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="app-store">
                  <TabsList className="mb-4">
                    <TabsTrigger value="app-store">App Store Connect</TabsTrigger>
                    <TabsTrigger value="google-play">Google Play Developer</TabsTrigger>
                    <TabsTrigger value="gigachat">GigaChat API</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="app-store">
                    <h3 className="text-lg font-semibold mb-4">App Store Connect API Simulation</h3>
                    <p className="text-gray-500 mb-4">
                      Configure test scenarios for App Store Connect API endpoints.
                    </p>
                    
                    <Card className="mb-4">
                      <CardContent className="pt-6">
                        <p className="text-center text-gray-500">
                          Endpoint implementation coming soon.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="google-play">
                    <h3 className="text-lg font-semibold mb-4">Google Play Developer API Simulation</h3>
                    <p className="text-gray-500 mb-4">
                      Configure test scenarios for Google Play Developer API endpoints.
                    </p>
                    
                    <Card className="mb-4">
                      <CardContent className="pt-6">
                        <p className="text-center text-gray-500">
                          Endpoint implementation coming soon.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="gigachat">
                    <h3 className="text-lg font-semibold mb-4">GigaChat API Simulation</h3>
                    <p className="text-gray-500 mb-4">
                      Configure test scenarios for GigaChat API endpoints.
                    </p>
                    
                    <Card className="mb-4">
                      <CardContent className="pt-6">
                        <p className="text-center text-gray-500">
                          Endpoint implementation coming soon.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="logs">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Activity Logs</h2>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No logs available yet. API activity will appear here.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Helper component for Alert icon
function InfoIcon(props: React.ComponentProps<typeof AlertTriangle>) {
  return <AlertTriangle {...props} />;
}

// Badge component
function Badge({ 
  variant = "default", 
  children, 
  className, 
  ...props 
}: { 
  variant?: "default" | "outline"; 
  className?: string;
  children: React.ReactNode; 
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        variant === "outline" ? "border" : "bg-primary text-primary-foreground"
      } ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}