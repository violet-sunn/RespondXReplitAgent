import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { sandboxService } from '../services/sandbox';
import { testOpenAIAPIConnection } from '../services/openai';
import { 
  insertSandboxEnvironmentSchema, 
  insertSandboxApiEndpointSchema,
  insertSandboxTestScenarioSchema,
  type Review,
  type AISettings
} from '@shared/schema';
import { generateAIResponse } from '../services/openai';

const router = Router();

// Validation middleware
const validateBody = <T extends z.ZodType>(schema: T) => {
  return (req: any, res: any, next: any) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  };
};

// Sandbox Environments
router.get('/environments', async (req: any, res) => {
  try {
    // Get a default user ID or use the authenticated user's ID if available
    const userId = req.user?.claims?.sub || 999999;
    const environments = await storage.getSandboxEnvironments(userId);
    res.json(environments);
  } catch (error) {
    console.error('Error fetching sandbox environments:', error);
    res.status(500).json({ message: 'Failed to fetch sandbox environments' });
  }
});

router.post('/environments', 
  isAuthenticated, 
  validateBody(insertSandboxEnvironmentSchema), 
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const environment = await storage.createSandboxEnvironment({
        ...req.validatedBody,
        userId
      });
      
      // Create default API endpoints for this environment
      await createDefaultApiEndpoints(environment.id);
      
      res.status(201).json(environment);
    } catch (error) {
      console.error('Error creating sandbox environment:', error);
      res.status(500).json({ message: 'Failed to create sandbox environment' });
    }
  }
);

router.get('/environments/:id', async (req: any, res) => {
  try {
    const environmentId = parseInt(req.params.id);
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    // Remove user access check to allow public access
    
    res.json(environment);
  } catch (error) {
    console.error('Error fetching sandbox environment:', error);
    res.status(500).json({ message: 'Failed to fetch sandbox environment' });
  }
});

router.patch('/environments/:id', 
  isAuthenticated, 
  validateBody(insertSandboxEnvironmentSchema.partial()), 
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const environmentId = parseInt(req.params.id);
      
      const environment = await storage.getSandboxEnvironmentById(environmentId);
      
      if (!environment) {
        return res.status(404).json({ message: 'Sandbox environment not found' });
      }
      
      if (environment.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized access to sandbox environment' });
      }
      
      const updatedEnvironment = await storage.updateSandboxEnvironment(
        environmentId,
        req.validatedBody
      );
      
      res.json(updatedEnvironment);
    } catch (error) {
      console.error('Error updating sandbox environment:', error);
      res.status(500).json({ message: 'Failed to update sandbox environment' });
    }
  }
);

router.delete('/environments/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const environmentId = parseInt(req.params.id);
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    if (environment.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to sandbox environment' });
    }
    
    await storage.deleteSandboxEnvironment(environmentId);
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting sandbox environment:', error);
    res.status(500).json({ message: 'Failed to delete sandbox environment' });
  }
});

// API Endpoints
router.get('/environments/:id/endpoints', async (req: any, res) => {
  try {
    const environmentId = parseInt(req.params.id);
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    // Remove user access check to allow public access
    
    const endpoints = await storage.getSandboxApiEndpoints(environmentId);
    res.json(endpoints);
  } catch (error) {
    console.error('Error fetching sandbox API endpoints:', error);
    res.status(500).json({ message: 'Failed to fetch sandbox API endpoints' });
  }
});

router.post('/environments/:id/endpoints', 
  isAuthenticated, 
  validateBody(insertSandboxApiEndpointSchema), 
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const environmentId = parseInt(req.params.id);
      
      const environment = await storage.getSandboxEnvironmentById(environmentId);
      
      if (!environment) {
        return res.status(404).json({ message: 'Sandbox environment not found' });
      }
      
      if (environment.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized access to sandbox environment' });
      }
      
      const endpoint = await storage.createSandboxApiEndpoint({
        ...req.validatedBody,
        environmentId
      });
      
      // Create default test scenarios for this endpoint
      await createDefaultTestScenarios(endpoint.id);
      
      res.status(201).json(endpoint);
    } catch (error) {
      console.error('Error creating sandbox API endpoint:', error);
      res.status(500).json({ message: 'Failed to create sandbox API endpoint' });
    }
  }
);

// Test Scenarios
router.get('/endpoints/:id/scenarios', async (req: any, res) => {
  try {
    const endpointId = parseInt(req.params.id);
    const scenarios = await storage.getSandboxTestScenarios(endpointId);
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching test scenarios:', error);
    res.status(500).json({ message: 'Failed to fetch test scenarios' });
  }
});

router.post('/endpoints/:id/scenarios', 
  isAuthenticated, 
  validateBody(insertSandboxTestScenarioSchema), 
  async (req: any, res) => {
    try {
      const endpointId = parseInt(req.params.id);
      
      const scenario = await storage.createSandboxTestScenario({
        ...req.validatedBody,
        endpointId
      });
      
      res.status(201).json(scenario);
    } catch (error) {
      console.error('Error creating test scenario:', error);
      res.status(500).json({ message: 'Failed to create test scenario' });
    }
  }
);

// Logs
router.get('/environments/:id/logs', async (req: any, res) => {
  try {
    const environmentId = parseInt(req.params.id);
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    // Remove user verification to allow public access
    
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset) : undefined;
    
    const logs = await storage.getSandboxLogs(environmentId, { limit, offset });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching sandbox logs:', error);
    res.status(500).json({ message: 'Failed to fetch sandbox logs' });
  }
});

router.delete('/environments/:id/logs', async (req: any, res) => {
  try {
    const environmentId = parseInt(req.params.id);
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    // Remove user verification to allow public access
    
    await storage.clearSandboxLogs(environmentId);
    res.status(204).end();
  } catch (error) {
    console.error('Error clearing sandbox logs:', error);
    res.status(500).json({ message: 'Failed to clear sandbox logs' });
  }
});

// API Emulation for App Store Connect API
// Maps directly to /api/sandbox/api/app-store/* to avoid Vite processing
router.all('/api/app-store-direct/*', async (req, res) => {
  try {
    // Get environment ID from header or use demo environment (1) as default
    let environmentId = parseInt(req.headers['x-sandbox-environment'] as string);
    
    // If no environment ID is provided or it's invalid, use demo environment
    if (!environmentId || isNaN(environmentId)) {
      console.log('Using demo environment (ID: 1) for App Store API emulation');
      environmentId = 1; // Default to the demo environment
    }
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    if (!environment.isActive) {
      return res.status(400).json({ message: 'Sandbox environment is not active' });
    }
    
    const path = req.path.replace('/api/app-store-direct', '');
    const scenario = req.query.scenario as string || undefined;
    
    const response = await sandboxService.getResponseForEndpoint(
      environmentId,
      'app_store_connect',
      path,
      req.method,
      scenario as any
    );
    
    // Apply simulated delay if specified
    if (response.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }
    
    // Set response headers
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }
    
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    console.error('Error in App Store Connect API emulation:', error);
    res.status(500).json({ message: 'Sandbox error in App Store Connect API emulation' });
  }
});

// API Emulation for Google Play Developer API
router.all('/api/google-play-direct/*', async (req, res) => {
  try {
    // Get environment ID from header or use demo environment (1) as default
    let environmentId = parseInt(req.headers['x-sandbox-environment'] as string);
    
    // If no environment ID is provided or it's invalid, use demo environment
    if (!environmentId || isNaN(environmentId)) {
      console.log('Using demo environment (ID: 1) for Google Play API emulation');
      environmentId = 1; // Default to the demo environment
    }
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    if (!environment.isActive) {
      return res.status(400).json({ message: 'Sandbox environment is not active' });
    }
    
    const path = req.path.replace('/api/google-play-direct', '');
    const scenario = req.query.scenario as string || undefined;
    
    const response = await sandboxService.getResponseForEndpoint(
      environmentId,
      'google_play_developer',
      path,
      req.method,
      scenario as any
    );
    
    // Apply simulated delay if specified
    if (response.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }
    
    // Set response headers
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }
    
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    console.error('Error in Google Play Developer API emulation:', error);
    res.status(500).json({ message: 'Sandbox error in Google Play Developer API emulation' });
  }
});

// API Emulation for OpenAI API
router.all('/api/openai-direct/*', async (req, res) => {
  try {
    // Get environment ID from header or use demo environment (1) as default
    let environmentId = parseInt(req.headers['x-sandbox-environment'] as string);
    
    // If no environment ID is provided or it's invalid, use demo environment
    if (!environmentId || isNaN(environmentId)) {
      console.log('Using demo environment (ID: 1) for OpenAI API emulation');
      environmentId = 1; // Default to the demo environment
    }
    
    const environment = await storage.getSandboxEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ message: 'Sandbox environment not found' });
    }
    
    if (!environment.isActive) {
      return res.status(400).json({ message: 'Sandbox environment is not active' });
    }
    
    const path = req.path.replace('/api/openai-direct', '');
    const scenario = req.query.scenario as string || undefined;
    
    const response = await sandboxService.getResponseForEndpoint(
      environmentId,
      'openai',
      path,
      req.method,
      scenario as any
    );
    
    // Apply simulated delay if specified
    if (response.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }
    
    // Set response headers
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }
    
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    console.error('Error in OpenAI API emulation:', error);
    res.status(500).json({ message: 'Sandbox error in OpenAI API emulation' });
  }
});

// Helper function to create default API endpoints for a new environment
async function createDefaultApiEndpoints(environmentId: number) {
  try {
    // App Store Connect API endpoints
    await storage.createSandboxApiEndpoint({
      environmentId,
      apiType: 'app_store_connect',
      path: '/v1/apps/{app_id}/customerReviews',
      method: 'GET',
      description: 'Get App Store reviews for an app'
    });
    
    await storage.createSandboxApiEndpoint({
      environmentId,
      apiType: 'app_store_connect',
      path: '/v1/apps/{app_id}/customerReviews/{review_id}/response',
      method: 'POST',
      description: 'Respond to an App Store review'
    });
    
    // Google Play Developer API endpoints
    await storage.createSandboxApiEndpoint({
      environmentId,
      apiType: 'google_play_developer',
      path: '/v3/applications/{package_name}/reviews',
      method: 'GET',
      description: 'Get Google Play reviews for an app'
    });
    
    await storage.createSandboxApiEndpoint({
      environmentId,
      apiType: 'google_play_developer',
      path: '/v3/applications/{package_name}/reviews/{review_id}:reply',
      method: 'POST',
      description: 'Respond to a Google Play review'
    });
    
    // OpenAI API endpoints
    await storage.createSandboxApiEndpoint({
      environmentId,
      apiType: 'openai',
      path: '/v1/chat/completions',
      method: 'POST',
      description: 'Generate AI response'
    });
  } catch (error) {
    console.error('Error creating default API endpoints:', error);
  }
}

// Helper function to create default test scenarios for an endpoint
async function createDefaultTestScenarios(endpointId: number) {
  try {
    // Success scenario
    await storage.createSandboxTestScenario({
      endpointId,
      name: 'Success Response',
      type: 'success',
      description: 'Successful API response',
      requestConditions: {},
      responseData: { success: true, message: 'Operation completed successfully' },
      statusCode: 200,
      delayMs: 100,
      isDefault: true
    });
    
    // Error scenario
    await storage.createSandboxTestScenario({
      endpointId,
      name: 'Error Response',
      type: 'error',
      description: 'API error response',
      requestConditions: {},
      responseData: { success: false, message: 'Operation failed', code: 'ERROR_OCCURRED' },
      statusCode: 400,
      delayMs: 100,
      isDefault: false
    });
    
    // Timeout scenario
    await storage.createSandboxTestScenario({
      endpointId,
      name: 'Timeout',
      type: 'timeout',
      description: 'API timeout simulation',
      requestConditions: {},
      responseData: { success: false, message: 'Request timed out' },
      statusCode: 408,
      delayMs: 5000,
      isDefault: false
    });
    
    // Rate limit scenario
    await storage.createSandboxTestScenario({
      endpointId,
      name: 'Rate Limit',
      type: 'rate_limit',
      description: 'API rate limit simulation',
      requestConditions: {},
      responseData: { success: false, message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
      statusCode: 429,
      delayMs: 100,
      isDefault: false
    });
  } catch (error) {
    console.error('Error creating default test scenarios:', error);
  }
}

// Real API Connection Testing Routes
// These routes allow testing connections to actual APIs, not just simulations

// Test route for real GigaChat API connection using environment variable
router.post('/test-connection/openai', async (req, res) => {
  try {
    // Use API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'OpenAI API key not configured in server environment'
      });
    }
    
    // Test the real API connection
    const result = await testOpenAIAPIConnection(apiKey);
    
    res.json(result);
  } catch (error) {
    console.error('Error testing OpenAI API connection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test OpenAI API connection',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Generate review response using real OpenAI API from environment variable
router.post('/generate-response/openai', async (req, res) => {
  try {
    const { 
      reviewText, 
      reviewRating = 3, 
      appName = 'App', 
      responseStyle = 'professional',
      language = 'en'
    } = req.body;
    
    // Use the API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key not configured in server environment'
      });
    }
    
    if (!reviewText) {
      return res.status(400).json({
        success: false,
        message: 'Review text is required'
      });
    }
    
    // Create a review object with the provided data
    const review = {
      id: 0,
      platform: language === 'ru' ? 'app_store' : 'google_play',
      appId: 1,
      externalId: 'manual-test',
      authorName: 'Test User',
      authorId: null,
      rating: reviewRating,
      title: null,
      text: reviewText,
      language: language,
      version: null,
      responseId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Review;
    
    // Create AI settings with the provided style
    const aiSettings = {
      id: 0,
      userId: 0,
      apiKey: null, // We'll use API key from environment
      responseStyle: responseStyle as any,
      maxResponseLength: 1000,
      includeSignature: false,
      signature: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as AISettings;
    
    const response = await generateAIResponse(review, aiSettings, apiKey);
    
    return res.json({
      success: true,
      response,
      review: {
        text: reviewText,
        rating: reviewRating,
        appName
      }
    });
  } catch (error) {
    console.error('Error generating response with OpenAI API:', error);
    return res.status(500).json({
      success: false,
      message: `Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});



export default router;