import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { LanguagesIcon, KeyRound, Sliders, Bell, UserRound, CreditCard } from "lucide-react";

// Profile settings form schema
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
});

// AI settings form schema
const aiSettingsSchema = z.object({
  apiKey: z.string().optional(),
  responseStyle: z.enum(["friendly", "professional", "casual", "formal"]),
  maxResponseLength: z.number().min(50).max(500),
  includeSignature: z.boolean(),
  signature: z.string().optional(),
});

// Notification settings form schema
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  reviewAlerts: z.boolean(),
  marketingEmails: z.boolean(),
  responseAlerts: z.boolean(),
  dailyDigest: z.boolean(),
});

// Language settings schema
const languageSettingsSchema = z.object({
  defaultLanguage: z.string(),
  autoDetectLanguage: z.boolean(),
  supportedLanguages: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;
type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;
type LanguageSettingsValues = z.infer<typeof languageSettingsSchema>;

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("account");

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  // AI Settings form
  const aiSettingsForm = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      responseStyle: "professional",
      maxResponseLength: 250,
      includeSignature: false,
      signature: "",
    },
  });

  // Notification settings form
  const notificationForm = useForm<NotificationSettingsValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      reviewAlerts: true,
      marketingEmails: false,
      responseAlerts: true,
      dailyDigest: true,
    },
  });

  // Language settings form
  const languageForm = useForm<LanguageSettingsValues>({
    resolver: zodResolver(languageSettingsSchema),
    defaultValues: {
      defaultLanguage: "en",
      autoDetectLanguage: true,
    },
  });

  // Fetch user settings
  const { isLoading } = useQuery({
    queryKey: ['/api/settings'],
    onSuccess: (data) => {
      if (data?.profile) {
        profileForm.reset(data.profile);
      }
      if (data?.aiSettings) {
        aiSettingsForm.reset(data.aiSettings);
      }
      if (data?.notifications) {
        notificationForm.reset(data.notifications);
      }
      if (data?.language) {
        languageForm.reset(data.language);
      }
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/settings/profile", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update AI settings mutation
  const updateAISettingsMutation = useMutation({
    mutationFn: async (values: AISettingsFormValues) => {
      const response = await apiRequest("PATCH", "/api/settings/ai", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "AI settings updated",
        description: "Your AI response settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update AI settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (values: NotificationSettingsValues) => {
      const response = await apiRequest("PATCH", "/api/settings/notifications", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update notification settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update language settings mutation
  const updateLanguageMutation = useMutation({
    mutationFn: async (values: LanguageSettingsValues) => {
      const response = await apiRequest("PATCH", "/api/settings/language", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Language settings updated",
        description: "Your language preferences have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update language settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onAISettingsSubmit = (data: AISettingsFormValues) => {
    updateAISettingsMutation.mutate(data);
  };

  const onNotificationSettingsSubmit = (data: NotificationSettingsValues) => {
    updateNotificationsMutation.mutate(data);
  };

  const onLanguageSettingsSubmit = (data: LanguageSettingsValues) => {
    updateLanguageMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-64 flex-shrink-0">
                <TabsList className="flex flex-col items-start h-auto bg-transparent p-0 space-y-1">
                  <TabsTrigger 
                    value="account" 
                    className={`w-full justify-start px-3 py-2 text-left ${activeTab === "account" ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" : ""}`}
                  >
                    <UserRound className="mr-2 h-4 w-4" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ai-settings" 
                    className={`w-full justify-start px-3 py-2 text-left ${activeTab === "ai-settings" ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" : ""}`}
                  >
                    <Sliders className="mr-2 h-4 w-4" />
                    AI Response Settings
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className={`w-full justify-start px-3 py-2 text-left ${activeTab === "notifications" ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" : ""}`}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger 
                    value="api-keys" 
                    className={`w-full justify-start px-3 py-2 text-left ${activeTab === "api-keys" ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" : ""}`}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    API Keys
                  </TabsTrigger>
                  <TabsTrigger 
                    value="language" 
                    className={`w-full justify-start px-3 py-2 text-left ${activeTab === "language" ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" : ""}`}
                  >
                    <LanguagesIcon className="mr-2 h-4 w-4" />
                    Language
                  </TabsTrigger>
                  <TabsTrigger 
                    value="billing" 
                    className={`w-full justify-start px-3 py-2 text-left ${activeTab === "billing" ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" : ""}`}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1">
                <TabsContent value="account" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Information</CardTitle>
                      <CardDescription>
                        Update your personal information and email address
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="your@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <Separator />
                    <CardHeader>
                      <CardTitle>Security</CardTitle>
                      <CardDescription>
                        Change your password and security settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline">Change Password</Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="ai-settings" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Response Settings</CardTitle>
                      <CardDescription>
                        Customize how the AI responds to reviews
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...aiSettingsForm}>
                        <form onSubmit={aiSettingsForm.handleSubmit(onAISettingsSubmit)} className="space-y-6">
                          <FormField
                            control={aiSettingsForm.control}
                            name="apiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>OpenAI API Key</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder={field.value ? "••••••••••••••••" : "Enter your OpenAI API key"} 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Leave empty to use the default system API key
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={aiSettingsForm.control}
                            name="responseStyle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Response Style</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select response style" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="friendly">Friendly</SelectItem>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                    <SelectItem value="formal">Formal</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The tone and style the AI will use when responding to reviews
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={aiSettingsForm.control}
                            name="maxResponseLength"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maximum Response Length</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min={50}
                                    max={500}
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value, 10))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Maximum number of characters for generated responses (50-500)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={aiSettingsForm.control}
                            name="includeSignature"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Include Signature</FormLabel>
                                  <FormDescription>
                                    Append a signature to all responses
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
                          
                          {aiSettingsForm.watch("includeSignature") && (
                            <FormField
                              control={aiSettingsForm.control}
                              name="signature"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Signature Text</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Enter your signature text" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Text that will be added at the end of each response
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          <Button 
                            type="submit" 
                            disabled={updateAISettingsMutation.isPending}
                          >
                            {updateAISettingsMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="notifications" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>
                        Control which notifications you receive
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...notificationForm}>
                        <form onSubmit={notificationForm.handleSubmit(onNotificationSettingsSubmit)} className="space-y-4">
                          <FormField
                            control={notificationForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Email Notifications</FormLabel>
                                  <FormDescription>
                                    Receive notifications via email
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
                          
                          <FormField
                            control={notificationForm.control}
                            name="reviewAlerts"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>New Review Alerts</FormLabel>
                                  <FormDescription>
                                    Get notified when you receive a new review
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
                          
                          <FormField
                            control={notificationForm.control}
                            name="responseAlerts"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Response Alerts</FormLabel>
                                  <FormDescription>
                                    Get notified when AI generates a response
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
                          
                          <FormField
                            control={notificationForm.control}
                            name="dailyDigest"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Daily Digest</FormLabel>
                                  <FormDescription>
                                    Receive a daily summary of activity
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
                          
                          <FormField
                            control={notificationForm.control}
                            name="marketingEmails"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Marketing Emails</FormLabel>
                                  <FormDescription>
                                    Receive product updates and marketing emails
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
                          
                          <Button 
                            type="submit" 
                            disabled={updateNotificationsMutation.isPending}
                          >
                            {updateNotificationsMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="api-keys" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>API Keys</CardTitle>
                      <CardDescription>
                        Manage API keys for App Store and Google Play
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <h3 className="text-md font-medium">Google Play Developer API</h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <p className="text-sm font-medium">API Key</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: 3 days ago</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">Change</Button>
                              <Button variant="destructive" size="sm">Remove</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-md font-medium">App Store Connect API</h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <p className="text-sm font-medium">API Key</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: 1 week ago</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">Change</Button>
                              <Button variant="destructive" size="sm">Remove</Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <p className="text-sm font-medium">API Secret</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: 1 week ago</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">Change</Button>
                              <Button variant="destructive" size="sm">Remove</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-md font-medium">OpenAI API</h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <p className="text-sm font-medium">API Key</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: 2 weeks ago</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">Change</Button>
                              <Button variant="destructive" size="sm">Remove</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="language" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Language Settings</CardTitle>
                      <CardDescription>
                        Set your preferred language and translation options
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...languageForm}>
                        <form onSubmit={languageForm.handleSubmit(onLanguageSettingsSubmit)} className="space-y-6">
                          <FormField
                            control={languageForm.control}
                            name="defaultLanguage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Language</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="ru">Russian</SelectItem>
                                    <SelectItem value="es">Spanish</SelectItem>
                                    <SelectItem value="fr">French</SelectItem>
                                    <SelectItem value="de">German</SelectItem>
                                    <SelectItem value="it">Italian</SelectItem>
                                    <SelectItem value="ja">Japanese</SelectItem>
                                    <SelectItem value="ko">Korean</SelectItem>
                                    <SelectItem value="zh">Chinese</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The primary language for the interface and responses
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={languageForm.control}
                            name="autoDetectLanguage"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Auto-detect Review Language</FormLabel>
                                  <FormDescription>
                                    Automatically detect and respond in the same language as the review
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
                          
                          <Button 
                            type="submit" 
                            disabled={updateLanguageMutation.isPending}
                          >
                            {updateLanguageMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="billing" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Billing and Subscription</CardTitle>
                      <CardDescription>
                        Manage your subscription and payment methods
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-lg border p-4">
                        <h3 className="text-lg font-medium mb-2">Current Plan</h3>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-2xl font-bold text-primary-600">Pro Plan</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">$49/month, billed monthly</p>
                            <ul className="mt-3 space-y-1 text-sm">
                              <li className="flex items-center">
                                <i className="ri-check-line text-green-500 mr-2"></i>
                                Unlimited apps
                              </li>
                              <li className="flex items-center">
                                <i className="ri-check-line text-green-500 mr-2"></i>
                                Unlimited reviews
                              </li>
                              <li className="flex items-center">
                                <i className="ri-check-line text-green-500 mr-2"></i>
                                Advanced analytics
                              </li>
                              <li className="flex items-center">
                                <i className="ri-check-line text-green-500 mr-2"></i>
                                Priority support
                              </li>
                            </ul>
                          </div>
                          <div>
                            <Button variant="outline">Change Plan</Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-3">Payment Method</h3>
                        <div className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center">
                            <i className="ri-visa-line text-2xl mr-3"></i>
                            <div>
                              <p className="font-medium">Visa ending in 4242</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Expires 12/2024</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">Update</Button>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-3">Billing History</h3>
                        <div className="border rounded-md overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">May 1, 2023</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">$49.00</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-primary-400">
                                  <a href="#">Download</a>
                                </td>
                              </tr>
                              <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">April 1, 2023</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">$49.00</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-primary-400">
                                  <a href="#">Download</a>
                                </td>
                              </tr>
                              <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">March 1, 2023</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">$49.00</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-primary-400">
                                  <a href="#">Download</a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="destructive" className="w-full sm:w-auto">Cancel Subscription</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
