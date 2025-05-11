import React from "react";
import { Settings, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AppIntegration {
  id: number;
  name: string;
  status: "active" | "warning" | "error";
  platform: "google_play" | "app_store";
  iconUrl?: string;
  reviewCount: number;
}

const AppIntegrationList: React.FC = () => {
  const { data: apps, isLoading } = useQuery({
    queryKey: ["/api/apps"],
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">App Integration Status</h2>
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-16 rounded"></div>
          </div>
          
          <div className="mt-5 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="py-4">
                <div className="flex items-center">
                  <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 w-10 rounded-md"></div>
                  <div className="ml-4 flex-1">
                    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-32 rounded mb-2"></div>
                    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 w-24 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">App Integration Status</h2>
          <a href="/applications" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">View all</a>
        </div>
        
        <div className="mt-5 flow-root">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {apps?.map((app: AppIntegration) => (
              <div key={app.id} className="py-4">
                <div className="flex items-center">
                  {app.iconUrl ? (
                    <img src={app.iconUrl} alt={`${app.name} App Icon`} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-500">{app.name.substring(0, 2)}</span>
                    </div>
                  )}
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{app.name}</p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${app.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                            app.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                          {app.status === 'active' ? 'Active' : app.status === 'warning' ? 'Warning' : 'Error'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center">
                      <div className="flex items-center">
                        <i className={`${app.platform === 'google_play' ? 'ri-google-play-fill' : 'ri-apple-fill'} text-gray-500 dark:text-gray-400 mr-1`}></i>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {app.platform === 'google_play' ? 'Google Play' : 'App Store'}
                        </p>
                      </div>
                      <span className="mx-2 text-gray-500 dark:text-gray-400">•</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{app.reviewCount.toLocaleString()}K reviews</p>
                    </div>
                  </div>
                  
                  <div className="ml-3 flex-shrink-0 flex space-x-2">
                    <button 
                      type="button" 
                      className={`p-1 rounded-full ${
                        app.status !== 'active' ? 
                          (app.status === 'warning' ? 'text-yellow-500 hover:text-yellow-600' : 'text-red-500 hover:text-red-600') : 
                          'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      <AlertCircle className="h-5 w-5" />
                    </button>
                    <button type="button" className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppIntegrationList;
