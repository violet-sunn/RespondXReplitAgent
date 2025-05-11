import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, RefreshCw } from "lucide-react";

const appSchema = z.object({
  name: z.string().min(1, "App name is required"),
  platform: z.enum(["app_store", "google_play"]),
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().optional(),
  bundleId: z.string().optional(),
  autoRespond: z.boolean().default(true),
});

type AppFormValues = z.infer<typeof appSchema>;

const Applications: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apps, isLoading } = useQuery({
    queryKey: ["/api/apps"],
  });

  const form = useForm<AppFormValues>({
    resolver: zodResolver(appSchema),
    defaultValues: {
      name: "",
      platform: "app_store",
      apiKey: "",
      apiSecret: "",
      bundleId: "",
      autoRespond: true,
    },
  });

  const addAppMutation = useMutation({
    mutationFn: async (values: AppFormValues) => {
      const response = await apiRequest("POST", "/api/apps", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "App added successfully",
        description: "Your app has been added and will start syncing reviews",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add app",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAppMutation = useMutation({
    mutationFn: async (appId: number) => {
      await apiRequest("DELETE", `/api/apps/${appId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      toast({
        title: "App deleted",
        description: "The app has been removed from your account",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete app",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshAppMutation = useMutation({
    mutationFn: async (appId: number) => {
      await apiRequest("POST", `/api/apps/${appId}/refresh`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      toast({
        title: "App refreshed",
        description: "App data and reviews are being synced",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to refresh app",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: AppFormValues) => {
    addAppMutation.mutate(values);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Applications</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Application</DialogTitle>
                <DialogDescription>
                  Connect your mobile application to start managing reviews
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Awesome App" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="app_store">App Store</SelectItem>
                            <SelectItem value="google_play">Google Play</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Tabs defaultValue="api_key" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="api_key">API Key</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>
                    <TabsContent value="api_key" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="apiSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Secret (If required)</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="bundleId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bundle ID / Package Name</FormLabel>
                            <FormControl>
                              <Input placeholder="com.example.app" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="autoRespond"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Auto-respond to reviews</FormLabel>
                              <FormDescription>
                                Automatically generate AI responses for new reviews
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={addAppMutation.isPending}
                    >
                      {addAppMutation.isPending ? "Adding..." : "Add Application"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            // Loading skeletons
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                </CardContent>
                <CardFooter>
                  <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </CardFooter>
              </Card>
            ))
          ) : (
            // Actual app cards
            apps?.map((app: any) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription>
                        {app.platform === "app_store" ? "App Store" : "Google Play"}
                      </CardDescription>
                    </div>
                    <div 
                      className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${app.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          app.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                    >
                      {app.status === 'active' ? 'Active' : app.status === 'warning' ? 'Warning' : 'Error'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 dark:text-gray-400">Bundle ID:</span>
                      <span className="font-medium truncate max-w-[150px]">{app.bundleId || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 dark:text-gray-400">Last Synced:</span>
                      <span className="font-medium">{new Date(app.lastSynced).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Reviews:</span>
                      <span className="font-medium">{app.reviewCount}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-500 dark:text-gray-400">Auto-respond:</span>
                      <span className="font-medium">{app.autoRespond ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refreshAppMutation.mutate(app.id)}
                    disabled={refreshAppMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteAppMutation.mutate(app.id)}
                    disabled={deleteAppMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Applications;
