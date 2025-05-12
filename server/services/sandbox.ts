import { jsonb } from 'drizzle-orm/pg-core';
import { apiTypeEnum, testScenarioTypeEnum } from '@shared/schema';
import { storage } from '../storage';

type SandboxApiType = 'app_store_connect' | 'google_play_developer' | 'openai';

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
    
    // For OpenAI API, provide default endpoints for common paths
    if (apiType === 'openai') {
      // Создаем интерфейс для типизации эндпоинтов
      interface SandboxEndpoint {
        id: number;
        environmentId: number;
        apiType: string;
        path: string;
        method: string;
        description: string;
      }
      
      // Create dummy endpoint objects for the most common OpenAI API endpoints
      const commonOpenAIEndpoints: Record<string, SandboxEndpoint> = {
        '/v1/chat/completions': {
          id: 10001,
          environmentId,
          apiType: 'openai',
          path: '/v1/chat/completions',
          method: 'POST',
          description: 'Generate response from OpenAI model'
        },
        '/v1/models': {
          id: 10002,
          environmentId,
          apiType: 'openai',
          path: '/v1/models',
          method: 'GET',
          description: 'Get available OpenAI models'
        },
        '/v1/embeddings': {
          id: 10003,
          environmentId,
          apiType: 'openai',
          path: '/v1/embeddings',
          method: 'POST',
          description: 'Generate embeddings for text'
        }
      };
      
      // Check if the path matches any of our default endpoints
      const pathWithoutParams = path.split('?')[0];
      
      // Проверяем, существует ли путь в наших предопределенных эндпоинтах
      if (Object.prototype.hasOwnProperty.call(commonOpenAIEndpoints, pathWithoutParams) && 
          (method === 'POST' || method === 'GET')) {
        return commonOpenAIEndpoints[pathWithoutParams];
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
      
      // Специальная обработка для OpenAI API - не требуем данных из базы данных
      if (apiType === 'openai') {
        // Генерируем ответ напрямую, без обращения к сценариям из БД
        let responseData = {};
        let statusCode = 200;
        
        // OAuth token эндпоинт
        if (path.includes('/oauth/token') || path.includes('/auth/token')) {
          if (requestBody && requestBody.api_key) {
            responseData = {
              access_token: `sandbox_gigachat_token_${Date.now()}`,
              token_type: "Bearer",
              expires_in: 3600,
              scope: requestBody.scope || "GIGACHAT_API_PERS"
            };
          } else {
            statusCode = 400;
            responseData = {
              error: 'invalid_scope',
              error_description: 'Requested scope is invalid. Please use GIGACHAT_API_PERS or GIGACHAT_API_CORP'
            };
          }
        } 
        // Чат комплишн эндпоинт
        else if (path.includes('/chat/completions')) {
          const prompt = requestBody?.messages?.find((m: any) => m.role === 'user')?.content || '';
          const systemPrompt = requestBody?.messages?.find((m: any) => m.role === 'system')?.content || '';
          
          responseData = {
            id: `cmpl-${Date.now().toString(36)}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: requestBody?.model || 'gpt-3.5-turbo',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: this.generateAIResponse(prompt, systemPrompt)
                },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: prompt.length + systemPrompt.length,
              completion_tokens: 100,
              total_tokens: prompt.length + systemPrompt.length + 100
            }
          };
        }
        // Эндпоинт моделей
        else if (path.includes('/models')) {
          responseData = {
            object: "list",
            data: [
              {
                id: "gpt-3.5-turbo",
                object: "model",
                created: Math.floor(Date.now() / 1000) - 3600 * 24 * 30,
                owned_by: "openai",
                capabilities: {
                  embeddings: false,
                  chat_completion: true
                }
              },
              {
                id: "gpt-3.5-turbo-16k",
                object: "model",
                created: Math.floor(Date.now() / 1000) - 3600 * 24 * 15,
                owned_by: "openai",
                capabilities: {
                  embeddings: false,
                  chat_completion: true
                }
              },
              {
                id: "text-embedding-ada-002",
                object: "model", 
                created: Math.floor(Date.now() / 1000) - 3600 * 24 * 7,
                owned_by: "openai",
                capabilities: {
                  embeddings: true,
                  chat_completion: true
                }
              }
            ]
          };
        }
        // Эндпоинт эмбеддингов
        else if (path.includes('/embeddings')) {
          const input = requestBody?.input || '';
          const inputText = Array.isArray(input) ? input[0] : input;
          const dimensions = requestBody?.dimensions || 1024;
          
          // Generate random embeddings
          const embeddings = Array(dimensions).fill(0)
            .map((_, i) => (Math.sin(i * (inputText.length || 1)) + 1) / 2);
            
          // Normalize
          const sum = Math.sqrt(embeddings.reduce((acc, val) => acc + val * val, 0));
          const normalized = embeddings.map(val => val / sum);
          
          responseData = {
            object: "list",
            data: [
              {
                object: "embedding",
                embedding: normalized,
                index: 0
              }
            ],
            model: requestBody?.model || "gpt-3.5-turbo",
            usage: {
              prompt_tokens: inputText.length,
              total_tokens: inputText.length
            }
          };
        }
        
        // Log this request in the sandbox logs if possible
        try {
          await this.logRequest(
            environmentId, 
            endpoint.id, 
            0, // scenarioId 
            method, 
            path, 
            null, // requestHeaders 
            requestBody, 
            statusCode, 
            responseData,
            0 // duration
          );
        } catch (error) {
          console.warn('Could not log sandbox request:', error);
        }
        
        return {
          statusCode,
          data: responseData,
          headers: { 
            'Content-Type': 'application/json',
            'X-Sandbox-Response': 'true'
          },
          delay: 0
        };
      }
      
      // Для других API типов используем стандартный подход со сценариями
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
      } else if (apiType === 'openai') {
        responseData = this.customizeOpenAIResponse(endpoint.path, requestBody, responseData);
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
   * Customize OpenAI API response using request body
   * Following OpenAI API documentation: https://platform.openai.com/docs/api-reference
   */
  private customizeOpenAIResponse(endpointPath: string, requestBody: any, baseResponse: any): any {
    // Deep clone the base response to avoid modifying the original
    const response = JSON.parse(JSON.stringify(baseResponse || {}));
    
    // If it's a chat completion request - основной эндпоинт для взаимодействия с моделью
    if (endpointPath.includes('chat/completions')) {
      let prompt = '';
      let systemPrompt = '';
      
      // Extract the prompt and system instruction from the request body if available
      // В запросе может быть массив messages с различными ролями: system, user, assistant
      if (requestBody && requestBody.messages && Array.isArray(requestBody.messages)) {
        // Создаем тип для сообщений GigaChat
        interface ChatMessage {
          role: string;
          content: string;
        }
        
        // Найдем system prompt (если есть)
        const systemMessage = requestBody.messages.find((m: ChatMessage) => m.role === 'system');
        if (systemMessage) {
          systemPrompt = systemMessage.content || '';
        }
        
        // Найдем последнее сообщение пользователя
        for (let i = requestBody.messages.length - 1; i >= 0; i--) {
          const message = requestBody.messages[i] as ChatMessage;
          if (message.role === 'user') {
            prompt = message.content || '';
            break;
          }
        }
      }
      
      // Create a standard chat completion response if none exists
      // Формат ответа соответствует документации GigaChat API
      if (!response.id || !response.choices) {
        response.id = `cmpl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        response.object = 'chat.completion';
        response.created = Math.floor(Date.now() / 1000);
        response.model = requestBody?.model || 'gpt-3.5-turbo';
        
        // Генерируем контент с учетом system prompt если он есть
        const content = this.generateAIResponse(prompt, systemPrompt);
        
        response.choices = [{
          index: 0,
          message: {
            role: 'assistant',
            content: content
          },
          finish_reason: 'stop'
        }];
        
        // Согласно документации, добавляем usage информацию
        response.usage = {
          prompt_tokens: prompt.length + systemPrompt.length,
          completion_tokens: content.length,
          total_tokens: prompt.length + systemPrompt.length + content.length
        };
      }
      // If choices exist but content is empty, generate a response
      else if (response.choices && response.choices.length > 0 && 
               response.choices[0].message && !response.choices[0].message.content) {
        const content = this.generateAIResponse(prompt, systemPrompt);
        response.choices[0].message.content = content;
        
        // Обновим usage если он существует
        if (response.usage) {
          response.usage.completion_tokens = content.length;
          response.usage.total_tokens = (response.usage.prompt_tokens || 0) + content.length;
        } else {
          response.usage = {
            prompt_tokens: prompt.length + systemPrompt.length,
            completion_tokens: content.length,
            total_tokens: prompt.length + systemPrompt.length + content.length
          };
        }
      }
    }
    // Если это запрос на получение токена доступа через OAuth
    else if (endpointPath.includes('oauth/token') || endpointPath.includes('auth/token')) {
      // Check if the request has the necessary fields according to GigaChat documentation
      const hasValidScope = requestBody && 
        (requestBody.scope === 'GIGACHAT_API_PERS' || 
         requestBody.scope === 'GIGACHAT_API_CORP');
      
      // Correct format for OAuth token response
      if (!response.access_token) {
        if (!hasValidScope) {
          // If the scope is invalid, return an error
          return {
            error: 'invalid_scope',
            error_description: 'Requested scope is invalid. Please use GIGACHAT_API_PERS or GIGACHAT_API_CORP',
            status: 400
          };
        }
        
        // Normal successful response
        response.access_token = `sandbox_gigachat_token_${Date.now()}`;
        response.token_type = "Bearer";
        response.expires_in = 3600; // Срок действия токена в секундах (1 час)
        response.scope = requestBody?.scope || "GIGACHAT_API_PERS";
      }
    }
    // Если это запрос на получение доступных моделей
    else if (endpointPath.includes('/v1/models')) {
      if (!response.data || !Array.isArray(response.data)) {
        response.data = [
          {
            id: "gpt-4o",
            object: "model",
            created: Math.floor(Date.now() / 1000) - 3600 * 24 * 10, // ~10 days ago
            owned_by: "OpenAI",
            capabilities: {
              embeddings: false,
              chat_completion: true
            }
          },
          {
            id: "gpt-4-turbo",
            object: "model",
            created: Math.floor(Date.now() / 1000) - 3600 * 24 * 30, // ~1 month ago
            owned_by: "OpenAI",
            capabilities: {
              embeddings: false,
              chat_completion: true
            }
          },
          {
            id: "gpt-3.5-turbo",
            object: "model", 
            created: Math.floor(Date.now() / 1000) - 3600 * 24 * 90, // ~3 months ago
            owned_by: "OpenAI",
            capabilities: {
              embeddings: true,
              chat_completion: true
            }
          }
        ];
        response.object = "list";
      }
    }
    // Если это запрос на получение embeddings (векторных представлений)
    else if (endpointPath.includes('/v1/embeddings')) {
      if (!response.data || !Array.isArray(response.data)) {
        // Генерируем случайные embeddings для демо
        const input = requestBody?.input || '';
        const dimensions = requestBody?.dimensions || 1024;
        const inputText = Array.isArray(input) ? input[0] : input;
        
        // Генерируем фиксированный по длине вектор на основе входного текста
        const embeddings = Array(dimensions).fill(0)
          .map((_, i) => (Math.sin(i * (inputText.length || 1)) + 1) / 2);
        
        // Нормализуем вектор, чтобы сумма квадратов была равна 1
        const sum = Math.sqrt(embeddings.reduce((acc, val) => acc + val * val, 0));
        const normalized = embeddings.map(val => val / sum);
        
        response.object = "list";
        response.data = [
          {
            object: "embedding",
            embedding: normalized,
            index: 0
          }
        ];
        response.model = requestBody?.model || "gpt-3.5-turbo";
        response.usage = {
          prompt_tokens: inputText.length,
          total_tokens: inputText.length
        };
      }
    }
    
    return response;
  }
  
  /**
   * Generate sample OpenAI API response
   */
  getOpenAIResponseSample(prompt: string, systemPrompt: string = ''): any {
    const content = this.generateAIResponse(prompt, systemPrompt);
    
    return {
      id: `cmpl-${Date.now().toString(36)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: content
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: prompt.length + systemPrompt.length,
        completion_tokens: content.length,
        total_tokens: prompt.length + systemPrompt.length + content.length
      }
    };
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
  
  // Используется обновленная версия метода getGigaChatResponseSample определенная выше
  
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
   * @param prompt - The user's query
   * @param systemPrompt - Optional system prompt that defines the AI's behavior
   */
  private generateAIResponse(prompt: string, systemPrompt: string = ''): string {
    // Check if we have a system prompt that should influence the response style
    const isHelpfulStyle = !systemPrompt || 
                           systemPrompt.toLowerCase().includes('helpful') || 
                           systemPrompt.toLowerCase().includes('assistant');
    
    const isFormalStyle = systemPrompt.toLowerCase().includes('formal') || 
                          systemPrompt.toLowerCase().includes('professional');
    
    const isTechnicalStyle = systemPrompt.toLowerCase().includes('technical') || 
                            systemPrompt.toLowerCase().includes('expert');
    
    // Determine if the context is for app review responses
    const isAppReviewContext = systemPrompt.toLowerCase().includes('отзыв') || 
                               systemPrompt.toLowerCase().includes('review') ||
                               systemPrompt.toLowerCase().includes('customer support') ||
                               systemPrompt.toLowerCase().includes('support agent') ||
                               systemPrompt.toLowerCase().includes('мобильны') ||
                               systemPrompt.toLowerCase().includes('приложени');

    // Check if the prompt is about generating a response to a review
    const isReviewResponseRequest = prompt.toLowerCase().includes('ответ на отзыв') ||
                                    prompt.toLowerCase().includes('негативный отзыв') ||
                                    prompt.toLowerCase().includes('положительный отзыв') ||
                                    (prompt.toLowerCase().includes('отзыв') && 
                                     prompt.toLowerCase().includes('приложени')) ||
                                    prompt.toLowerCase().includes('review response') ||
                                    (prompt.toLowerCase().includes('составь') && 
                                     prompt.toLowerCase().includes('ответ'));

    // Check if the prompt contains a negative review pattern
    const hasNegativeReviewPattern = prompt.toLowerCase().includes('вылетает') ||
                                    prompt.toLowerCase().includes('не работает') ||
                                    prompt.toLowerCase().includes('ошибка') ||
                                    prompt.toLowerCase().includes('проблема') ||
                                    prompt.toLowerCase().includes('краш') ||
                                    prompt.toLowerCase().includes('сбой') ||
                                    prompt.toLowerCase().includes('баг') ||
                                    prompt.toLowerCase().includes('буг');
                                    
    const hasPositiveReviewPattern = prompt.toLowerCase().includes('отличное приложение') ||
                                   prompt.toLowerCase().includes('нравится приложение') ||
                                   prompt.toLowerCase().includes('5 звезд') ||
                                   prompt.toLowerCase().includes('5 stars') ||
                                   prompt.toLowerCase().includes('положительный') ||
                                   prompt.toLowerCase().includes('хорошее приложение');
    
    // If the prompt is empty, give a default response
    if (!prompt.trim()) {
      if (isFormalStyle) {
        return "Благодарю за обращение. Чем я могу вам помочь?";
      } else if (isTechnicalStyle) {
        return "Готов ответить на ваши технические вопросы. Опишите, пожалуйста, вашу задачу.";
      } else {
        return "Здравствуйте! Я модель ИИ от Сбера, чем могу вам помочь?";
      }
    }
    
    // Special handling for review response requests from our previous test case
    if (isReviewResponseRequest || (isAppReviewContext && hasNegativeReviewPattern)) {
      if (hasNegativeReviewPattern) {
        // Responses for negative reviews
        const negativeResponses = [
          "Уважаемый пользователь, благодарим за обратную связь! Мы искренне сожалеем о возникших проблемах и уже работаем над их устранением. Наша команда разработчиков приняла ваш отзыв к сведению, и в ближайшем обновлении мы исправим указанные ошибки. Пожалуйста, не стесняйтесь обращаться в нашу службу поддержки для более быстрого решения вашей проблемы.",
          
          "Спасибо за ваш отзыв! Мы приносим извинения за неудобства, с которыми вы столкнулись при использовании нашего приложения. Ваше мнение очень важно для нас, и мы серьезно относимся к сообщениям о технических проблемах. Наша команда уже анализирует ситуацию и в ближайшее время выпустит обновление, которое решит указанную проблему со статистикой. Для получения дополнительной помощи, пожалуйста, свяжитесь с нашей поддержкой.",
          
          "Мы ценим вашу честную обратную связь и приносим извинения за проблемы, возникшие при использовании раздела статистики. Это действительно важная функция, и мы понимаем ваше разочарование. Наша команда уже выявила причину этой ошибки и активно работает над её устранением. Обновление с исправлением будет выпущено в самое ближайшее время. Благодарим за сообщение об этой проблеме."
        ];
        
        return negativeResponses[Math.floor(Math.random() * negativeResponses.length)];
      } else if (hasPositiveReviewPattern) {
        // Responses for positive reviews
        const positiveResponses = [
          "Большое спасибо за ваш положительный отзыв! Мы очень рады, что вам нравится наше приложение. Ваша поддержка мотивирует нас становиться ещё лучше. Мы продолжим работать над улучшением функциональности и пользовательского опыта.",
          
          "Благодарим за высокую оценку нашего приложения! Нам очень приятно, что наш продукт оправдывает ваши ожидания. Мы постоянно работаем над новыми функциями и улучшениями, которые сделают ваш опыт использования ещё более приятным.",
          
          "Спасибо за тёплые слова и высокую оценку! Мы вкладываем много усилий в создание качественного продукта, и ваш отзыв — лучшая награда для нашей команды. Будем рады вашим предложениям по дальнейшему улучшению приложения."
        ];
        
        return positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
      } else {
        // General review response
        return "Благодарим вас за обратную связь! Мы внимательно изучаем все отзывы пользователей и используем их для улучшения нашего приложения. Ваше мнение очень важно для нас, и мы рады, что вы нашли время поделиться своими впечатлениями. Если у вас возникнут дополнительные вопросы или предложения, не стесняйтесь обращаться в нашу службу поддержки.";
      }
    }
    
    // Existing logic for other types of prompts
    if (prompt.toLowerCase().includes('спасибо') || prompt.toLowerCase().includes('благодар')) {
      if (isFormalStyle) {
        return "Благодарим вас за отзыв! Мы непрерывно работаем над улучшением нашего приложения на основе пользовательских отзывов. Признательны вам за то, что нашли время поделиться своим мнением.";
      } else {
        return "Спасибо за обратную связь! Мы постоянно улучшаем наше приложение, учитывая пожелания пользователей. Ваше мнение очень важно для нас.";
      }
    } 
    else if (prompt.toLowerCase().includes('ошибк') || prompt.toLowerCase().includes('баг') || prompt.toLowerCase().includes('краш')) {
      if (isTechnicalStyle) {
        return "Мы зафиксировали ваше сообщение об ошибке. Для эффективной диагностики проблемы, пожалуйста, предоставьте следующую информацию: 1) версия ОС, 2) точные шаги воспроизведения, 3) скриншоты или логи ошибки если имеются. Наша техническая команда рассмотрит проблему в приоритетном порядке.";
      } else {
        return "Сожалеем о возникших проблемах. Наша команда активно работает над устранением этой ошибки. Не могли бы вы предоставить дополнительные детали о том, когда происходит сбой? Это поможет нам быстрее решить проблему.";
      }
    } 
    else if (prompt.toLowerCase().includes('функци') || prompt.toLowerCase().includes('предложен') || prompt.toLowerCase().includes('улучшен')) {
      return "Благодарим за ваше предложение по улучшению функционала! Мы всегда ищем способы сделать наше приложение лучше. Ваша идея добавлена в нашу дорожную карту для рассмотрения в будущих обновлениях.";
    } 
    else if (prompt.toLowerCase().includes('привет') || prompt.toLowerCase().includes('здравствуй')) {
      if (isFormalStyle) {
        return "Здравствуйте! Благодарим вас за обращение. Чем я могу вам помочь сегодня?";
      } else {
        return "Привет! Я ИИ-ассистент на базе GPT от OpenAI. Чем могу помочь?";
      } 
    }
    else if (prompt.toLowerCase().includes('что ты') || prompt.toLowerCase().includes('кто ты') || prompt.toLowerCase().includes('какие твои')) {
      return "Я ассистент на базе модели GPT-3.5-Turbo от OpenAI. Я создан для того, чтобы помогать людям и отвечать на их вопросы. Могу ассистировать в решении различных задач, предоставлять информацию и поддерживать беседу на разнообразные темы.";
    }
    else {
      // Default response for other queries
      if (isFormalStyle) {
        return "Благодарим вас за обращение. Мы ценим мнение каждого клиента и используем его для улучшения нашего приложения. Если у вас есть какие-либо конкретные вопросы или предложения, пожалуйста, не стесняйтесь обращаться в нашу службу поддержки.";
      } else if (isTechnicalStyle) {
        return "Проанализировав ваш запрос, рекомендую обратить внимание на документацию API и примеры интеграции. Для более детального ответа потребуется дополнительный контекст. Готов предоставить техническую консультацию по конкретным аспектам вашего вопроса.";
      } else {
        return "Спасибо за ваше сообщение. Я готов помочь с ответами на ваши вопросы или предоставить необходимую информацию. Не стесняйтесь задавать уточняющие вопросы, если вам нужны дополнительные детали.";
      }
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