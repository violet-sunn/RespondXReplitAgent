import React from "react";
import { Bot } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface AIMetrics {
  generatedResponses: {
    current: number;
    total: number;
  };
  responseAccuracy: number;
  userSatisfaction: number;
  aiStatus: {
    online: boolean;
    version: string;
  };
}

const AIOverview: React.FC = () => {
  const { data: metrics, isLoading } = useQuery<AIMetrics>({
    queryKey: ["/api/ai/metrics"],
  });
  
  const [_, navigate] = useLocation();

  if (isLoading || !metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">AI Response Overview</h2>
          
          <div className="mt-5 flex flex-col space-y-6 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-gray-200 dark:bg-gray-700 h-4 w-32 rounded"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 h-4 w-16 rounded"></div>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 h-2 w-full rounded"></div>
              </div>
            ))}
            
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="bg-gray-200 dark:bg-gray-700 h-8 w-full rounded mb-4"></div>
              <div className="bg-gray-200 dark:bg-gray-700 h-10 w-full rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { generatedResponses, responseAccuracy, userSatisfaction, aiStatus } = metrics;
  const generatedResponsesPercentage = Math.floor((generatedResponses.current / generatedResponses.total) * 100);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">AI Response Overview</h2>
        
        <div className="mt-5 flex flex-col">
          {/* AI Response Metrics */}
          <div className="flex flex-col">
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Generated Responses</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {generatedResponses.current} / {generatedResponses.total}
                </div>
              </div>
              <div className="mt-2">
                <Progress value={generatedResponsesPercentage} className={cn("h-2", "bg-primary-100 dark:bg-primary-900")} />
                <style dangerouslySetInnerHTML={{ __html: `
                  .progress-indicator-primary {
                    background-color: var(--primary-500);
                  }
                `}} />
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Response Accuracy</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{responseAccuracy}%</div>
              </div>
              <div className="mt-2">
                <Progress value={responseAccuracy} className={cn("h-2", "bg-secondary-100 dark:bg-secondary-900")} />
                <style dangerouslySetInnerHTML={{ __html: `
                  .progress-indicator-secondary {
                    background-color: var(--secondary-500);
                  }
                `}} />
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">User Satisfaction</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{userSatisfaction}%</div>
              </div>
              <div className="mt-2">
                <Progress value={userSatisfaction} className={cn("h-2", "bg-amber-100 dark:bg-amber-900")} />
                <style dangerouslySetInnerHTML={{ __html: `
                  .progress-indicator-amber {
                    background-color: var(--amber-500);
                  }
                `}} />
              </div>
            </div>
          </div>
          
          {/* AI Model Status */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-full p-1">
                <div className={`h-4 w-4 rounded-full ${aiStatus.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <p className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                {aiStatus.online ? 'AI system is online and functioning optimally' : 'AI system is currently offline'}
              </p>
            </div>
            
            <div className="mt-4 flex items-center">
              <div className="flex items-center">
                <Bot className="text-primary-600 dark:text-primary-400 mr-2 h-5 w-5" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">OpenAI ChatGPT</span>
              </div>
              <div className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                v{aiStatus.version}
              </div>
            </div>
            
            <button 
              type="button" 
              className="mt-4 w-full flex justify-center items-center px-4 py-2 border border-primary-300 shadow-sm text-sm font-medium rounded-md text-primary-700 dark:text-primary-400 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => navigate('/settings?tab=ai-settings')}
            >
              <i className="ri-settings-4-line mr-2"></i>
              Adjust AI Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIOverview;
