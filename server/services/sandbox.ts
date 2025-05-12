import { jsonb } from 'drizzle-orm/pg-core';
import { apiTypeEnum, testScenarioTypeEnum } from '@shared/schema';
import { storage } from '../storage';

type SandboxApiType = 'app_store_connect' | 'google_play_developer' | 'gigachat';

/**
 * Manages sandbox environment endpoints and test scenarios
 */
class SandboxService {
  /**
   * Get sample response data from the sandbox for a specific API type and endpoint
   * 
   * @param environmentId - The sandbox environment ID
   * @param apiType - The API type (app_store_connect, google_play_developer, gigachat)
   * @param path - The endpoint path
   * @param method - The HTTP method
   * @param scenario - Optional specific test scenario to use
   * @returns Promise<object> - The simulated API response
   */
  async getResponseForEndpoint(
    environmentId: number,
    apiType: SandboxApiType, 
    path: string,
    method: string = 'GET',
    scenarioType?: 'success' | 'error' | 'timeout' | 'rate_limit'
  ): Promise<{
    statusCode: number;
    data: any;
    headers: Record<string, string>;
    delay: number;
  }> {
    try {
      // Find the endpoint
      const endpoint = await storage.getSandboxApiEndpoint(environmentId, apiType, path, method);
      
      if (!endpoint) {
        return {
          statusCode: 404,
          data: { error: 'Endpoint not found' },
          headers: { 'Content-Type': 'application/json' },
          delay: 0
        };
      }
      
      // Find appropriate test scenario
      let scenario = null;
      
      if (scenarioType) {
        // If specific scenario type is requested, use that
        scenario = await storage.getSandboxTestScenario(endpoint.id, scenarioType);
      } else {
        // Otherwise use the default scenario
        scenario = await storage.getDefaultSandboxTestScenario(endpoint.id);
      }
      
      if (!scenario) {
        return {
          statusCode: 501,
          data: { error: 'No test scenario available for this endpoint' },
          headers: { 'Content-Type': 'application/json' },
          delay: 0
        };
      }
      
      // Log the request
      await this.logRequest(
        environmentId,
        endpoint.id,
        scenario.id,
        method,
        path,
        null,
        null,
        scenario.statusCode,
        scenario.responseData,
        scenario.delayMs || 0
      );
      
      // Return the simulated response
      return {
        statusCode: scenario.statusCode,
        data: scenario.responseData,
        headers: { 'Content-Type': 'application/json' },
        delay: scenario.delayMs || 0
      };
    } catch (error) {
      console.error('Error in sandbox service:', error);
      return {
        statusCode: 500,
        data: { error: 'Internal sandbox service error' },
        headers: { 'Content-Type': 'application/json' },
        delay: 0
      };
    }
  }
  
  /**
   * Log a sandbox API request
   */
  async logRequest(
    environmentId: number,
    endpointId: number,
    scenarioId: number,
    method: string,
    path: string,
    requestHeaders: any | null,
    requestBody: any | null,
    responseStatus: number,
    responseBody: any | null,
    duration: number = 0
  ): Promise<void> {
    // In development, we'll silently skip logging if the table doesn't exist
    // This allows the sandbox to function without full database schema
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    
    try {
      await storage.createSandboxLog({
        environmentId,
        endpointId,
        scenarioId,
        requestMethod: method,
        requestPath: path,
        requestHeaders: requestHeaders ? requestHeaders : undefined,
        requestBody: requestBody ? requestBody : undefined,
        responseStatus,
        responseBody: responseBody ? responseBody : undefined,
        duration,
        timestamp: new Date()
      });
    } catch (error) {
      // Silence errors about missing tables but log other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('relation "sandbox_logs" does not exist')) {
        console.error('Error logging sandbox request:', error);
      }
    }
  }
  
  /**
   * Generate sample review data for App Store API
   */
  getAppStoreReviewSample(options: { rating?: number } = {}): any {
    const { rating = Math.floor(Math.random() * 5) + 1 } = options;
    
    return {
      id: `review-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      attributes: {
        title: rating >= 4 ? 'Great app!' : 'Needs improvement',
        review: this.getReviewTextByRating(rating),
        rating,
        createdDate: new Date().toISOString(),
        userName: this.getRandomUserName(),
        territory: this.getRandomTerritory(),
        ...(Math.random() > 0.7 && {
          developerResponse: {
            id: `response-${Date.now()}`,
            body: 'Thank you for your feedback. We appreciate your input and will consider it for future updates.',
            lastModified: new Date().toISOString(),
            state: 'PUBLISHED'
          }
        })
      }
    };
  }
  
  /**
   * Generate sample review data for Google Play API
   */
  getGooglePlayReviewSample(options: { rating?: number } = {}): any {
    const { rating = Math.floor(Math.random() * 5) + 1 } = options;
    
    return {
      reviewId: `gp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      authorName: this.getRandomUserName(),
      comments: this.getReviewTextByRating(rating),
      commentTime: new Date().toISOString(),
      starRating: rating,
      reviewerLanguage: ['en', 'es', 'fr', 'de', 'ru'][Math.floor(Math.random() * 5)],
      appVersion: `${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
    };
  }
  
  /**
   * Generate sample GigaChat API response
   */
  getGigaChatResponseSample(prompt: string): any {
    return {
      id: `gigachat-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gigachat-pro',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: this.generateAIResponse(prompt)
          },
          finish_reason: 'stop'
        }
      ]
    };
  }
  
  /**
   * Helper method to generate review text based on rating
   */
  private getReviewTextByRating(rating: number): string {
    if (rating >= 5) {
      return 'Absolutely love this app! It has everything I need and works perfectly. The interface is intuitive and the features are amazing.';
    } else if (rating >= 4) {
      return 'Really good app with great features. There are a few small improvements I would suggest, but overall a solid experience.';
    } else if (rating >= 3) {
      return 'Decent app but has some issues. Sometimes it crashes and there are features missing that would make it much better.';
    } else if (rating >= 2) {
      return 'Not very good. The app has too many bugs and is difficult to use. Needs a lot of work to be useful.';
    } else {
      return 'Terrible app, constantly crashes and doesn\'t work as advertised. Would not recommend to anyone.';
    }
  }
  
  /**
   * Generate a simple AI response for testing
   */
  private generateAIResponse(prompt: string): string {
    // Simple test logic to generate different responses
    if (prompt.toLowerCase().includes('thank')) {
      return "We appreciate your feedback! We're constantly working to improve our app based on user suggestions like yours. Thank you for taking the time to share your thoughts with us.";
    } else if (prompt.toLowerCase().includes('bug') || prompt.toLowerCase().includes('crash')) {
      return "We're sorry to hear you're experiencing issues. Our team is actively investigating this problem. Could you please provide more details about when this occurs? This will help us resolve it faster.";
    } else if (prompt.toLowerCase().includes('feature') || prompt.toLowerCase().includes('suggestion')) {
      return "Thank you for your feature suggestion! We're always looking for ways to enhance our app. We've added this to our roadmap for consideration in future updates.";
    } else {
      return "Thank you for your review. We value all customer feedback and use it to improve our app. If you have any specific concerns or suggestions, please don't hesitate to contact our support team.";
    }
  }
  
  /**
   * Get a random user name for sample data
   */
  private getRandomUserName(): string {
    const firstNames = ['John', 'Jane', 'Alex', 'Maria', 'David', 'Sarah', 'Michael', 'Emma'];
    const lastInitials = ['S.', 'T.', 'W.', 'M.', 'R.', 'K.', 'B.', 'D.'];
    
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastInitials[Math.floor(Math.random() * lastInitials.length)]}`;
  }
  
  /**
   * Get a random territory for sample data
   */
  private getRandomTerritory(): string {
    return ['US', 'GB', 'CA', 'AU', 'FR', 'DE', 'JP', 'MX'][Math.floor(Math.random() * 8)];
  }
}

export const sandboxService = new SandboxService();