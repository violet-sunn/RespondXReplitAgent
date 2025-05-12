import { jsonb } from 'drizzle-orm/pg-core';
import { apiTypeEnum, testScenarioTypeEnum } from '@shared/schema';
import { storage } from '../storage';

type SandboxApiType = 'app_store_connect' | 'google_play_developer' | 'gigachat';

// Interface to define an API endpoint with parameters
interface ParsedPath {
  pattern: RegExp;
  paramNames: string[];
  originalPath: string;
}

/**
 * Manages sandbox environment endpoints and test scenarios
 */
class SandboxService {
  // Cache for parsed API endpoint paths to avoid recomputation
  private pathCache: Record<string, ParsedPath> = {};

  /**
   * Parse API path with parameters, converting to RegExp pattern
   * Converts paths like "/v1/apps/{app_id}/reviews" to a regex pattern
   */
  private parsePathPattern(path: string): ParsedPath {
    // Return from cache if already parsed
    if (this.pathCache[path]) {
      return this.pathCache[path];
    }

    const paramNames: string[] = [];
    
    // Escape regex special characters and replace {param} with regex capture groups
    const pattern = path
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      .replace(/\{([^/]+?)\}/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+?)';
      });
    
    const parsedPath: ParsedPath = {
      pattern: new RegExp(`^${pattern}$`),
      paramNames,
      originalPath: path
    };
    
    // Cache the parsed result
    this.pathCache[path] = parsedPath;
    
    return parsedPath;
  }

  /**
   * Extract path parameters from a URL path
   */
  private extractPathParams(path: string, endpointPath: string): Record<string, string> {
    const parsedPath = this.parsePathPattern(endpointPath);
    const match = path.match(parsedPath.pattern);
    
    // If no match, return empty object
    if (!match) {
      return {};
    }
    
    // Create params object using the captured groups (starting from index 1)
    const params: Record<string, string> = {};
    parsedPath.paramNames.forEach((paramName, i) => {
      params[paramName] = match[i + 1];
    });
    
    return params;
  }

  /**
   * Find best matching endpoint for a path, considering path parameters
   */
  private async findMatchingEndpoint(environmentId: number, apiType: SandboxApiType, path: string, method: string) {
    // First try exact match
    const exactMatch = await storage.getSandboxApiEndpoint(environmentId, apiType, path, method);
    if (exactMatch) {
      return exactMatch;
    }
    
    // If no exact match, get all endpoints for the environment and API type
    const endpoints = await storage.getSandboxApiEndpoints(environmentId);
    const apiEndpoints = endpoints.filter(e => e.apiType === apiType && e.method === method);
    
    // Check for pattern matches
    for (const endpoint of apiEndpoints) {
      const parsedPath = this.parsePathPattern(endpoint.path);
      const match = path.match(parsedPath.pattern);
      
      if (match) {
        return endpoint;
      }
    }
    
    return null;
  }

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
    scenarioType?: 'success' | 'error' | 'timeout' | 'rate_limit',
    requestBody?: any
  ): Promise<{
    statusCode: number;
    data: any;
    headers: Record<string, string>;
    delay: number;
  }> {
    try {
      // Find the endpoint using pattern matching
      const endpoint = await this.findMatchingEndpoint(environmentId, apiType, path, method);
      
      if (!endpoint) {
        return {
          statusCode: 404,
          data: { 
            error: 'Endpoint not found',
            message: `No matching endpoint found for ${method} ${path} in ${apiType} API`
          },
          headers: { 'Content-Type': 'application/json' },
          delay: 0
        };
      }
      
      // Extract path parameters
      const pathParams = this.extractPathParams(path, endpoint.path);
      
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
      
      // Generate dynamic response data based on the API type and path parameters
      let responseData = scenario.responseData;
      
      // Customize response data based on API type and path parameters
      if (apiType === 'app_store_connect') {
        responseData = this.customizeAppStoreResponse(endpoint.path, pathParams, responseData);
      } else if (apiType === 'google_play_developer') {
        responseData = this.customizeGooglePlayResponse(endpoint.path, pathParams, responseData);
      } else if (apiType === 'gigachat') {
        responseData = this.customizeGigaChatResponse(endpoint.path, requestBody, responseData);
      }
      
      // Log the request
      await this.logRequest(
        environmentId,
        endpoint.id,
        scenario.id,
        method,
        path,
        null,
        requestBody,
        scenario.statusCode,
        responseData,
        scenario.delayMs || 0
      );
      
      // Return the simulated response
      return {
        statusCode: scenario.statusCode,
        data: responseData,
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
      // Safely stringify the request and response data
      let requestHeadersStr = undefined;
      let requestBodyStr = undefined;
      let responseBodyStr = undefined;
      
      try {
        if (requestHeaders) {
          requestHeadersStr = typeof requestHeaders === 'string' ? 
            requestHeaders : JSON.stringify(requestHeaders);
        }
      } catch (e) {
        console.warn('Failed to stringify request headers:', e);
        requestHeadersStr = '{"error": "Cannot stringify request headers"}';
      }
      
      try {
        if (requestBody) {
          requestBodyStr = typeof requestBody === 'string' ? 
            requestBody : JSON.stringify(requestBody);
        }
      } catch (e) {
        console.warn('Failed to stringify request body:', e);
        requestBodyStr = '{"error": "Cannot stringify request body"}';
      }
      
      try {
        if (responseBody) {
          responseBodyStr = typeof responseBody === 'string' ? 
            responseBody : JSON.stringify(responseBody);
        }
      } catch (e) {
        console.warn('Failed to stringify response body:', e);
        responseBodyStr = '{"error": "Cannot stringify response body"}';
      }
      
      // Create the log entry
      await storage.createSandboxLog({
        environmentId,
        endpointId,
        scenarioId,
        requestMethod: method,
        requestPath: path,
        requestHeaders: requestHeadersStr,
        requestBody: requestBodyStr,
        responseStatus,
        responseBody: responseBodyStr,
        duration,
        timestamp: new Date()
      });
    } catch (error) {
      // Improve error handling to capture different types of database errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Only log when it's not a known database missing table error
      if (!errorMessage.includes('relation "sandbox_logs" does not exist') &&
          !errorMessage.includes('foreign key constraint') &&
          !errorMessage.includes('violates not-null constraint')) {
        console.error('Error logging sandbox request:', error);
      } else {
        // For known errors in sandbox mode, log a simpler message
        console.warn('Skipping sandbox log due to database constraint or missing table');
      }
    }
  }
  
  /**
   * Customize App Store API response using path parameters
   */
  private customizeAppStoreResponse(endpointPath: string, pathParams: Record<string, string>, baseResponse: any): any {
    // Deep clone the base response to avoid modifying the original
    const response = JSON.parse(JSON.stringify(baseResponse));
    
    if (endpointPath.includes('reviews') && !endpointPath.includes('response')) {
      // This is a get reviews endpoint
      const appId = pathParams['app_id'] || '123456';

      // Create a standard App Store reviews response if none exists
      if (!response.data || !Array.isArray(response.data)) {
        response.data = [];
      }
      
      // Ensure there's at least one review
      if (response.data.length === 0) {
        response.data.push(this.getAppStoreReviewSample());
      }
      
      // Set app ID in the response
      if (response.links) {
        response.links.self = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/reviews`;
      } else {
        response.links = {
          self: `https://api.appstoreconnect.apple.com/v1/apps/${appId}/reviews`
        };
      }
    } 
    else if (endpointPath.includes('response') && pathParams['review_id']) {
      // This is a review response endpoint
      const reviewId = pathParams['review_id'];
      
      // Create a response data for an App Store review response
      if (!response.data) {
        response.data = {
          id: `response-${Date.now()}`,
          type: 'customerReviewResponses',
          attributes: {
            responseBody: 'Thank you for your feedback. We appreciate your input and will consider it for future updates.',
            state: 'PUBLISHED',
            lastModifiedDate: new Date().toISOString()
          },
          relationships: {
            review: {
              data: {
                id: reviewId,
                type: 'customerReviews'
              }
            }
          }
        };
      }
    }
    
    return response;
  }

  /**
   * Customize Google Play API response using path parameters
   */
  private customizeGooglePlayResponse(endpointPath: string, pathParams: Record<string, string>, baseResponse: any): any {
    // Deep clone the base response to avoid modifying the original
    const response = JSON.parse(JSON.stringify(baseResponse));
    
    if (endpointPath.includes('reviews') && !endpointPath.includes('reply')) {
      // This is a get reviews endpoint
      const packageName = pathParams['package_name'] || 'com.example.app';
      
      // Create a standard Google Play reviews response if none exists
      if (!response.reviews || !Array.isArray(response.reviews)) {
        response.reviews = [];
      }
      
      // Ensure there's at least one review
      if (response.reviews.length === 0) {
        const sampleReview = this.getGooglePlayReviewSample();
        response.reviews.push({
          reviewId: sampleReview.reviewId,
          authorName: sampleReview.authorName,
          comments: [{
            userComment: {
              text: this.getReviewTextByRating(4),
              lastModified: {
                seconds: Math.floor(Date.now() / 1000)
              },
              starRating: 4
            }
          }]
        });
      }
      
      // Set nextPageToken if it doesn't exist
      if (!response.nextPageToken) {
        response.nextPageToken = `token-${Date.now()}`;
      }
    } 
    else if (endpointPath.includes('reply') && pathParams['review_id']) {
      // This is a review response endpoint
      const reviewId = pathParams['review_id'];
      
      // Create a response for a Google Play review reply
      if (!response.result) {
        response.result = {
          reviewId: reviewId,
          reply: {
            text: 'Thank you for your feedback. We appreciate your input and will consider it for future updates.',
            lastEdited: {
              seconds: Math.floor(Date.now() / 1000)
            }
          }
        };
      }
    }
    
    return response;
  }

  /**
   * Customize GigaChat API response using request body
   */
  private customizeGigaChatResponse(endpointPath: string, requestBody: any, baseResponse: any): any {
    // Deep clone the base response to avoid modifying the original
    const response = JSON.parse(JSON.stringify(baseResponse));
    
    // If it's a chat completion request
    if (endpointPath.includes('chat/completions')) {
      let prompt = '';
      
      // Extract the prompt from the request body if available
      if (requestBody && requestBody.messages && Array.isArray(requestBody.messages)) {
        // Find the last user message
        for (let i = requestBody.messages.length - 1; i >= 0; i--) {
          if (requestBody.messages[i].role === 'user') {
            prompt = requestBody.messages[i].content || '';
            break;
          }
        }
      }
      
      // Create a standard chat completion response if none exists
      if (!response.id || !response.choices) {
        response.id = `chatcmpl-${Date.now()}`;
        response.object = 'chat.completion';
        response.created = Math.floor(Date.now() / 1000);
        response.model = requestBody?.model || 'giga-5';
        response.choices = [{
          index: 0,
          message: {
            role: 'assistant',
            content: this.generateAIResponse(prompt)
          },
          finish_reason: 'stop'
        }];
      }
      // If choices exist but content is empty, generate a response
      else if (response.choices && response.choices.length > 0 && 
               response.choices[0].message && !response.choices[0].message.content) {
        response.choices[0].message.content = this.generateAIResponse(prompt);
      }
    }
    
    return response;
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