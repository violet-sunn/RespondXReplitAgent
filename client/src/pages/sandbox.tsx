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
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Database,
  CheckCircle,
  Copy,
  MessageCircle
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
  
  // Connection test states
  const [testResult, setTestResult] = useState<GigaChatTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Manual review response generation states
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(3);
  const [responseStyle, setResponseStyle] = useState('professional');
  const [appName, setAppName] = useState('RespondX Test App');
  const [language, setLanguage] = useState('ru');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Interface for GigaChat API test results
  interface GigaChatTestResult {
    success: boolean;
    message: string;
    details?: {
      authTest?: {
        success: boolean;
        message: string;
        token?: string;
      };
      modelsTest?: {
        success: boolean;
        message: string;
        models?: string[];
      };
      completionTest?: {
        success: boolean;
        message: string;
        response?: string;
      };
    };
  }
  
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

  // Removed authentication check to allow guest access

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
                    <TabsTrigger value="openai">OpenAI API</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="app-store">
                    <h3 className="text-lg font-semibold mb-4">App Store Connect API Simulation</h3>
                    <p className="text-gray-500 mb-4">
                      Test App Store Connect API endpoints with predefined responses.
                    </p>
                    
                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle>Fetch App Reviews</CardTitle>
                        <CardDescription>
                          GET /api/app-store/v1/apps/{'{app_id}'}/reviews
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Sample Request</Label>
                            <div className="mt-2 p-4 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                              curl -X GET "http://localhost:5000/api/app-store/v1/apps/123456/reviews" \<br/>
                              &nbsp;&nbsp;-H "X-Sandbox-Environment: 1" \<br/>
                              &nbsp;&nbsp;-H "Accept: application/json"
                            </div>
                          </div>
                          
                          <div>
                            <Label>Example Response</Label>
                            <div className="mt-2 p-4 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                              {JSON.stringify({
                                "data": [
                                  {
                                    "id": "12345",
                                    "attributes": {
                                      "title": "Great app!",
                                      "review": "This app is really useful and well designed.",
                                      "rating": 5,
                                      "createdDate": "2025-05-12T10:10:05.472Z",
                                      "userName": "HappyUser123",
                                      "territory": "US"
                                    }
                                  }
                                ],
                                "links": {
                                  "self": "https://api.appstoreconnect.apple.com/v1/apps/app_id/reviews"
                                }
                              }, null, 2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          onClick={() => window.open('/api/app-store/v1/apps/123456/reviews?sandbox=1', '_blank')}
                          className="w-full"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Test Endpoint
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="google-play">
                    <h3 className="text-lg font-semibold mb-4">Google Play Developer API Simulation</h3>
                    <p className="text-gray-500 mb-4">
                      Test Google Play Developer API endpoints with predefined responses.
                    </p>
                    
                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle>Fetch App Reviews</CardTitle>
                        <CardDescription>
                          GET /api/google-play/v3/applications/{'{package_name}'}/reviews
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Sample Request</Label>
                            <div className="mt-2 p-4 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                              curl -X GET "http://localhost:5000/api/google-play/v3/applications/com.example.app/reviews" \<br/>
                              &nbsp;&nbsp;-H "X-Sandbox-Environment: 1" \<br/>
                              &nbsp;&nbsp;-H "Accept: application/json"
                            </div>
                          </div>
                          
                          <div>
                            <Label>Example Response</Label>
                            <div className="mt-2 p-4 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                              {JSON.stringify({
                                "reviews": [
                                  {
                                    "reviewId": "gp12345",
                                    "authorName": "Google User",
                                    "comments": [
                                      {
                                        "userComment": {
                                          "text": "Love this app, very intuitive!",
                                          "lastModified": {
                                            "seconds": 1747044636
                                          },
                                          "starRating": 5
                                        }
                                      }
                                    ]
                                  }
                                ]
                              }, null, 2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          onClick={() => window.open('/api/google-play/v3/applications/com.example.app/reviews?sandbox=1', '_blank')}
                          className="w-full"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Test Endpoint
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="openai">
                    <h3 className="text-lg font-semibold mb-4">OpenAI API Testing</h3>
                    <p className="text-gray-500 mb-4">
                      Test OpenAI API endpoints with predefined responses or verify real API connection.
                    </p>
                    
                    <Tabs defaultValue="manual">
                      <TabsList className="mb-4 w-full">
                        <TabsTrigger value="manual" className="flex-1">Manual Review Response</TabsTrigger>
                        <TabsTrigger value="sandbox" className="flex-1">Sandbox Mode</TabsTrigger>
                        <TabsTrigger value="real" className="flex-1">Connection Test</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="manual">
                        <Card className="mb-4">
                          <CardHeader>
                            <CardTitle>Generate Real Response to Review</CardTitle>
                            <CardDescription>
                              Use GigaChat API to generate real responses to app reviews
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <Alert className="bg-green-50 border-green-200 text-green-800">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">API Key Configured</AlertTitle>
                                <AlertDescription className="text-green-700">
                                  Your GigaChat API key is securely configured on the server. No need to enter it manually.
                                </AlertDescription>
                              </Alert>
                              
                              <div className="space-y-2">
                                <Label htmlFor="reviewText">Review Text</Label>
                                <Textarea
                                  id="reviewText"
                                  placeholder="Enter the review text that needs a response"
                                  className="min-h-[100px]"
                                  value={reviewText}
                                  onChange={(e) => setReviewText(e.target.value)}
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="reviewRating">Rating</Label>
                                  <Select 
                                    value={String(reviewRating)} 
                                    onValueChange={(value) => setReviewRating(Number(value))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">1 Star</SelectItem>
                                      <SelectItem value="2">2 Stars</SelectItem>
                                      <SelectItem value="3">3 Stars</SelectItem>
                                      <SelectItem value="4">4 Stars</SelectItem>
                                      <SelectItem value="5">5 Stars</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="responseStyle">Response Style</Label>
                                  <Select 
                                    value={responseStyle} 
                                    onValueChange={setResponseStyle}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="professional">Professional</SelectItem>
                                      <SelectItem value="friendly">Friendly</SelectItem>
                                      <SelectItem value="concise">Concise</SelectItem>
                                      <SelectItem value="detailed">Detailed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="appName">App Name</Label>
                                  <Input
                                    id="appName"
                                    placeholder="Enter app name"
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="language">Language</Label>
                                  <Select 
                                    value={language} 
                                    onValueChange={setLanguage}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ru">Russian</SelectItem>
                                      <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              {generatedResponse && (
                                <div className="mt-6 space-y-2">
                                  <Label>Generated Response</Label>
                                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                                    <p className="whitespace-pre-wrap">{generatedResponse}</p>
                                  </div>
                                  <div className="flex justify-end">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(generatedResponse);
                                        alert('Response copied to clipboard!');
                                      }}
                                    >
                                      <Copy className="mr-2 h-4 w-4" />
                                      Copy to Clipboard
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="flex-col space-y-2">
                            <Button 
                              className="w-full"
                              disabled={!reviewText.trim() || isGenerating}
                              onClick={() => {
                                setIsGenerating(true);
                                setGeneratedResponse('');
                                
                                fetch('/api/sandbox/generate-response/openai', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    reviewText,
                                    reviewRating,
                                    appName,
                                    responseStyle,
                                    language
                                  })
                                })
                                .then(response => response.json())
                                .then(data => {
                                  if (data.success) {
                                    setGeneratedResponse(data.response);
                                  } else {
                                    alert(`Error: ${data.message}`);
                                    console.error('Error generating response:', data.error);
                                  }
                                  setIsGenerating(false);
                                })
                                .catch(error => {
                                  console.error('Error generating response:', error);
                                  alert(`Error: ${error.message}`);
                                  setIsGenerating(false);
                                });
                              }}
                            >
                              {isGenerating ? (
                                <>
                                  <Hourglass className="mr-2 h-4 w-4 animate-spin" />
                                  Generating Response...
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Generate Response
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-gray-500 text-center">
                              This will generate a real response using the GigaChat API based on the review and settings
                            </p>
                          </CardFooter>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="sandbox">
                        <Card className="mb-4">
                          <CardHeader>
                            <CardTitle>Generate AI Response (Sandbox)</CardTitle>
                            <CardDescription>
                              POST /api/openai/v1/chat/completions
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <Label>Sample Request</Label>
                                <div className="mt-2 p-4 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                                  curl -X POST "http://localhost:5000/api/openai/v1/chat/completions" \<br/>
                                  &nbsp;&nbsp;-H "X-Sandbox-Environment: 1" \<br/>
                                  &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
                                  &nbsp;&nbsp;-d '{`{"model": "gpt-3.5-turbo", "messages": [{"role": "system", "content": "You are a helpful assistant"}, {"role": "user", "content": "Generate a response for a 3-star review"}]}`}'
                                </div>
                              </div>
                              
                              <div>
                                <Label>Example Response</Label>
                                <div className="mt-2 p-4 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                                  {JSON.stringify({
                                    "id": "chatcmpl-123456789",
                                    "object": "chat.completion",
                                    "created": 1747044647,
                                    "model": "giga-5",
                                    "choices": [
                                      {
                                        "index": 0,
                                        "message": {
                                          "role": "assistant",
                                          "content": "Thank you for your feedback! We appreciate your kind words about our app. We're constantly working to improve the user experience and add new features. If you have any specific suggestions or encounter any issues, please don't hesitate to reach out to our support team."
                                        },
                                        "finish_reason": "stop"
                                      }
                                    ]
                                  }, null, 2)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="flex-col space-y-2">
                            <Button 
                              className="w-full"
                              onClick={() => {
                                const sampleData = {
                                  model: "gpt-3.5-turbo", 
                                  messages: [
                                    {role: "system", content: "You are a helpful assistant"}, 
                                    {role: "user", content: "Generate a response for a 3-star review"}
                                  ]
                                };
                                
                                fetch('/api/gigachat/v1/chat/completions', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'X-Sandbox-Environment': '1'
                                  },
                                  body: JSON.stringify(sampleData)
                                })
                                .then(response => response.json())
                                .then(data => {
                                  alert('Response received! Check console for details.');
                                  console.log('OpenAI API response:', data);
                                })
                                .catch(error => {
                                  console.error('Error testing OpenAI API:', error);
                                  alert('Error: ' + error.message);
                                });
                              }}
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Test Sandbox Endpoint
                            </Button>
                            <p className="text-xs text-gray-500 text-center">
                              This endpoint will be tested via fetch API and results will appear in the browser console
                            </p>
                          </CardFooter>
                        </Card>
                      </TabsContent>
                    
                      <TabsContent value="real">
                        <Card className="mb-4">
                          <CardHeader>
                            <CardTitle>Test Real GigaChat API Connection</CardTitle>
                            <CardDescription>
                              Tests authentication, models retrieval, and response generation with real API
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <Alert className="bg-green-50 border-green-200 text-green-800">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">API Key Configured</AlertTitle>
                                <AlertDescription className="text-green-700">
                                  Your GigaChat API key is securely configured on the server. No need to enter it manually.
                                </AlertDescription>
                              </Alert>
                              
                              <p className="text-sm text-gray-600">
                                Click the Test button below to verify your GigaChat API connection and see available models.
                              </p>
                              
                              {testResult && (
                                <div className={`p-4 rounded-md mt-4 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                  <div className="flex items-start">
                                    {testResult.success ? (
                                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                    ) : (
                                      <X className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                    )}
                                    <div>
                                      <h4 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                                      </h4>
                                      <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                        {testResult.message}
                                      </p>
                                      
                                      {testResult.details && (
                                        <div className="mt-3 space-y-2">
                                          {testResult.details.authTest && (
                                            <div className="flex items-start">
                                              {testResult.details.authTest.success ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                              ) : (
                                                <X className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                              )}
                                              <div>
                                                <p className="text-sm font-medium">Authentication</p>
                                                <p className="text-xs">{testResult.details.authTest.message}</p>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {testResult.details.modelsTest && (
                                            <div className="flex items-start">
                                              {testResult.details.modelsTest.success ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                              ) : (
                                                <X className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                              )}
                                              <div>
                                                <p className="text-sm font-medium">Models Retrieval</p>
                                                <p className="text-xs">{testResult.details.modelsTest.message}</p>
                                                {testResult.details.modelsTest.models && (
                                                  <p className="text-xs font-mono mt-1">
                                                    Available models: {testResult.details.modelsTest.models.join(', ')}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {testResult.details.completionTest && (
                                            <div className="flex items-start">
                                              {testResult.details.completionTest.success ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                              ) : (
                                                <X className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                              )}
                                              <div>
                                                <p className="text-sm font-medium">Completion Generation</p>
                                                <p className="text-xs">{testResult.details.completionTest.message}</p>
                                                {testResult.details.completionTest.response && (
                                                  <div className="mt-1 p-2 bg-white rounded border text-xs">
                                                    {testResult.details.completionTest.response}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="flex-col space-y-2">
                            <Button 
                              className="w-full"
                              disabled={isLoading}
                              onClick={() => {
                                setIsLoading(true);
                                setTestResult(null);
                                
                                fetch('/api/sandbox/test-connection/openai', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({})
                                })
                                .then(response => response.json())
                                .then(data => {
                                  setTestResult(data);
                                  setIsLoading(false);
                                })
                                .catch(error => {
                                  console.error('Error testing real OpenAI API:', error);
                                  setTestResult({
                                    success: false,
                                    message: `Connection test failed: ${error.message}`
                                  });
                                  setIsLoading(false);
                                });
                              }}
                            >
                              {isLoading ? (
                                <>
                                  <Hourglass className="mr-2 h-4 w-4 animate-spin" />
                                  Testing Connection...
                                </>
                              ) : (
                                <>
                                  <Waves className="mr-2 h-4 w-4" />
                                  Test Real API Connection
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-gray-500 text-center">
                              This will test your actual GigaChat API connection with all key components
                            </p>
                          </CardFooter>
                        </Card>
                      </TabsContent>
                    </Tabs>
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

// Custom badge component (renamed to avoid conflicts with imported Badge)
function CustomBadge({ 
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