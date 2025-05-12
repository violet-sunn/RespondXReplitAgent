import { 
  users, type User, type InsertUser, type UpsertUser,
  apps, type App, type InsertApp,
  reviews, type Review, type InsertReview,
  reviewResponses, type ReviewResponse, type InsertReviewResponse,
  aiSettings, type AISettings, type InsertAISettings,
  userSettings, type UserSettings, type InsertUserSettings,
  analyticsData, type AnalyticsData, type InsertAnalyticsData,
  sandboxEnvironments, type SandboxEnvironment, type InsertSandboxEnvironment,
  sandboxApiEndpoints, type SandboxApiEndpoint, type InsertSandboxApiEndpoint,
  sandboxTestScenarios, type SandboxTestScenario, type InsertSandboxTestScenario,
  sandboxLogs, type SandboxLog, type InsertSandboxLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, like } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<InsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // App methods
  createApp(app: InsertApp & { userId: string }): Promise<App>;
  getAppById(id: number): Promise<App | undefined>;
  getUserApps(userId: string): Promise<App[]>;
  updateApp(id: number, appData: Partial<InsertApp>): Promise<App>;
  deleteApp(id: number): Promise<void>;
  
  // Review methods
  createReview(review: InsertReview): Promise<Review>;
  getReviewById(id: number): Promise<Review | undefined>;
  getAppReviews(appId: number, options?: { limit?: number, offset?: number, rating?: number }): Promise<{ reviews: Review[], total: number }>;
  getUserReviews(userId: number, options?: { limit?: number, offset?: number, appId?: number, rating?: number }): Promise<{ reviews: Review[], total: number }>;
  updateReview(id: number, reviewData: Partial<InsertReview>): Promise<Review>;
  
  // Review Response methods
  createReviewResponse(response: InsertReviewResponse): Promise<ReviewResponse>;
  getReviewResponseById(id: number): Promise<ReviewResponse | undefined>;
  getReviewResponseByReviewId(reviewId: number): Promise<ReviewResponse | undefined>;
  updateReviewResponse(id: number, responseData: Partial<InsertReviewResponse>): Promise<ReviewResponse>;
  
  // AI Settings methods
  getAISettings(userId: number): Promise<AISettings | undefined>;
  createAISettings(settings: InsertAISettings & { userId: number }): Promise<AISettings>;
  updateAISettings(userId: number, settingsData: Partial<InsertAISettings>): Promise<AISettings>;
  
  // User Settings methods
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings & { userId: number }): Promise<UserSettings>;
  updateUserSettings(userId: number, settingsData: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // Analytics methods
  createAnalyticsData(data: InsertAnalyticsData): Promise<AnalyticsData>;
  getAnalyticsData(userId: number, options?: { appId?: number, period?: string }): Promise<AnalyticsData[]>;
  
  // Sandbox Environment methods
  getSandboxEnvironments(userId: string): Promise<SandboxEnvironment[]>;
  getSandboxEnvironmentById(id: number): Promise<SandboxEnvironment | undefined>;
  createSandboxEnvironment(environment: InsertSandboxEnvironment & { userId: string }): Promise<SandboxEnvironment>;
  updateSandboxEnvironment(id: number, environmentData: Partial<InsertSandboxEnvironment>): Promise<SandboxEnvironment>;
  deleteSandboxEnvironment(id: number): Promise<void>;
  
  // Sandbox API Endpoint methods
  getSandboxApiEndpoints(environmentId: number): Promise<SandboxApiEndpoint[]>;
  getSandboxApiEndpoint(environmentId: number, apiType: string, path: string, method: string): Promise<SandboxApiEndpoint | undefined>;
  createSandboxApiEndpoint(endpoint: InsertSandboxApiEndpoint): Promise<SandboxApiEndpoint>;
  updateSandboxApiEndpoint(id: number, endpointData: Partial<InsertSandboxApiEndpoint>): Promise<SandboxApiEndpoint>;
  deleteSandboxApiEndpoint(id: number): Promise<void>;
  
  // Sandbox Test Scenario methods
  getSandboxTestScenarios(endpointId: number): Promise<SandboxTestScenario[]>;
  getSandboxTestScenario(endpointId: number, type: string): Promise<SandboxTestScenario | undefined>;
  getDefaultSandboxTestScenario(endpointId: number): Promise<SandboxTestScenario | undefined>;
  createSandboxTestScenario(scenario: InsertSandboxTestScenario): Promise<SandboxTestScenario>;
  updateSandboxTestScenario(id: number, scenarioData: Partial<InsertSandboxTestScenario>): Promise<SandboxTestScenario>;
  deleteSandboxTestScenario(id: number): Promise<void>;
  
  // Sandbox Log methods
  getSandboxLogs(environmentId: number, options?: { limit?: number, offset?: number }): Promise<SandboxLog[]>;
  createSandboxLog(log: InsertSandboxLog): Promise<SandboxLog>;
  clearSandboxLogs(environmentId: number): Promise<void>;
}

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // App methods
  async createApp(app: InsertApp & { userId: string }): Promise<App> {
    const [newApp] = await db
      .insert(apps)
      .values(app)
      .returning();
    return newApp;
  }

  async getAppById(id: number): Promise<App | undefined> {
    const [app] = await db.select().from(apps).where(eq(apps.id, id));
    return app;
  }

  async getUserApps(userId: string): Promise<App[]> {
    return db.select().from(apps).where(eq(apps.userId, userId)).orderBy(apps.name);
  }

  async updateApp(id: number, appData: Partial<InsertApp>): Promise<App> {
    const [app] = await db
      .update(apps)
      .set({ ...appData, updatedAt: new Date() })
      .where(eq(apps.id, id))
      .returning();
    return app;
  }

  async deleteApp(id: number): Promise<void> {
    await db.delete(apps).where(eq(apps.id, id));
  }

  // Review methods
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values(review)
      .returning();
    return newReview;
  }

  async getReviewById(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getAppReviews(
    appId: number, 
    options: { limit?: number, offset?: number, rating?: number } = {}
  ): Promise<{ reviews: Review[], total: number }> {
    const { limit = 10, offset = 0, rating } = options;
    
    let query = db.select().from(reviews).where(eq(reviews.appId, appId));
    
    if (rating) {
      query = query.where(eq(reviews.rating, rating));
    }
    
    const reviews = await query
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [{ count }] = await db
      .select({ count: db.fn.count() })
      .from(reviews)
      .where(eq(reviews.appId, appId))
      .execute();
    
    return { reviews, total: Number(count) };
  }

  async getUserReviews(
    userId: number,
    options: { limit?: number, offset?: number, appId?: number, rating?: number } = {}
  ): Promise<{ reviews: Review[], total: number }> {
    const { limit = 10, offset = 0, appId, rating } = options;
    
    let reviewsQuery = db
      .select({
        review: reviews,
        app: {
          id: apps.id,
          name: apps.name,
          platform: apps.platform
        }
      })
      .from(reviews)
      .innerJoin(apps, eq(reviews.appId, apps.id))
      .where(eq(apps.userId, userId));
    
    if (appId) {
      reviewsQuery = reviewsQuery.where(eq(reviews.appId, appId));
    }
    
    if (rating) {
      reviewsQuery = reviewsQuery.where(eq(reviews.rating, rating));
    }
    
    const results = await reviewsQuery
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);
    
    let countQuery = db
      .select({ count: db.fn.count() })
      .from(reviews)
      .innerJoin(apps, eq(reviews.appId, apps.id))
      .where(eq(apps.userId, userId));
    
    if (appId) {
      countQuery = countQuery.where(eq(reviews.appId, appId));
    }
    
    if (rating) {
      countQuery = countQuery.where(eq(reviews.rating, rating));
    }
    
    const [{ count }] = await countQuery.execute();
    
    // Transform the joined results into the expected format
    const reviewsData = results.map(r => ({
      ...r.review,
      appName: r.app.name
    })) as Review[];
    
    return { reviews: reviewsData, total: Number(count) };
  }

  async updateReview(id: number, reviewData: Partial<InsertReview>): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set({ ...reviewData, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  // Review Response methods
  async createReviewResponse(response: InsertReviewResponse): Promise<ReviewResponse> {
    const [newResponse] = await db
      .insert(reviewResponses)
      .values(response)
      .returning();
    
    // Update the review to reference this response
    await db
      .update(reviews)
      .set({ responseId: newResponse.id })
      .where(eq(reviews.id, response.reviewId));
    
    return newResponse;
  }

  async getReviewResponseById(id: number): Promise<ReviewResponse | undefined> {
    const [response] = await db.select().from(reviewResponses).where(eq(reviewResponses.id, id));
    return response;
  }

  async getReviewResponseByReviewId(reviewId: number): Promise<ReviewResponse | undefined> {
    const [response] = await db.select().from(reviewResponses).where(eq(reviewResponses.reviewId, reviewId));
    return response;
  }

  async updateReviewResponse(id: number, responseData: Partial<InsertReviewResponse>): Promise<ReviewResponse> {
    const dataToUpdate = { ...responseData, updatedAt: new Date() };
    
    // If status is being set to published, add publishedAt timestamp
    if (responseData.status === 'published') {
      dataToUpdate.publishedAt = new Date();
    }
    
    const [response] = await db
      .update(reviewResponses)
      .set(dataToUpdate)
      .where(eq(reviewResponses.id, id))
      .returning();
    return response;
  }

  // AI Settings methods
  async getAISettings(userId: number): Promise<AISettings | undefined> {
    const [settings] = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId));
    return settings;
  }

  async createAISettings(settings: InsertAISettings & { userId: number }): Promise<AISettings> {
    const [newSettings] = await db
      .insert(aiSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateAISettings(userId: number, settingsData: Partial<InsertAISettings>): Promise<AISettings> {
    // Check if settings exist first
    const existingSettings = await this.getAISettings(userId);
    
    if (existingSettings) {
      // Update existing settings
      const [settings] = await db
        .update(aiSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(aiSettings.userId, userId))
        .returning();
      return settings;
    } else {
      // Create new settings
      return this.createAISettings({ 
        userId, 
        responseStyle: settingsData.responseStyle || 'professional',
        maxResponseLength: settingsData.maxResponseLength || 250,
        includeSignature: settingsData.includeSignature || false,
        signature: settingsData.signature,
        apiKey: settingsData.apiKey
      });
    }
  }

  // User Settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async createUserSettings(settings: InsertUserSettings & { userId: number }): Promise<UserSettings> {
    const [newSettings] = await db
      .insert(userSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateUserSettings(userId: number, settingsData: Partial<InsertUserSettings>): Promise<UserSettings> {
    // Check if settings exist first
    const existingSettings = await this.getUserSettings(userId);
    
    if (existingSettings) {
      // Update existing settings
      const [settings] = await db
        .update(userSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return settings;
    } else {
      // Create new settings with defaults and overrides
      return this.createUserSettings({
        userId,
        emailNotifications: settingsData.emailNotifications ?? true,
        reviewAlerts: settingsData.reviewAlerts ?? true,
        responseAlerts: settingsData.responseAlerts ?? true,
        dailyDigest: settingsData.dailyDigest ?? true,
        marketingEmails: settingsData.marketingEmails ?? false,
        defaultLanguage: settingsData.defaultLanguage ?? 'en',
        autoDetectLanguage: settingsData.autoDetectLanguage ?? true
      });
    }
  }

  // Analytics methods
  async createAnalyticsData(data: InsertAnalyticsData): Promise<AnalyticsData> {
    const [analyticsEntry] = await db
      .insert(analyticsData)
      .values(data)
      .returning();
    return analyticsEntry;
  }

  async getAnalyticsData(
    userId: number, 
    options: { appId?: number, period?: string } = {}
  ): Promise<AnalyticsData[]> {
    const { appId, period = '30d' } = options;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30); // Default to 30 days
    }
    
    let query = db
      .select()
      .from(analyticsData)
      .where(eq(analyticsData.userId, userId))
      .where(gte(analyticsData.date, startDate));
    
    if (appId) {
      query = query.where(eq(analyticsData.appId, appId));
    }
    
    return query.orderBy(analyticsData.date);
  }

  // Sandbox Environment methods
  async getSandboxEnvironments(userId: string | number): Promise<SandboxEnvironment[]> {
    // For guest user (999999) or when database tables are not ready, return a demo environment
    if (userId === 999999) {
      console.log('Returning demo sandbox environment for guest user');
      return [{
        id: 1,
        name: 'Demo Sandbox',
        description: 'Public demonstration environment for testing various API integrations',
        apiKey: 'demo-key-1234',
        userId: '999999',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    }
    
    // Try to get from database for authenticated users
    try {
      return db.select().from(sandboxEnvironments).where(eq(sandboxEnvironments.userId, userId as string));
    } catch (e) {
      console.error('Error in getSandboxEnvironments:', e);
      return [];
    }
  }

  async getSandboxEnvironmentById(id: number): Promise<SandboxEnvironment | undefined> {
    // For demo environment ID 1, return a hardcoded environment
    if (id === 1) {
      return {
        id: 1,
        name: 'Demo Sandbox',
        description: 'Public demonstration environment for testing various API integrations',
        apiKey: 'demo-key-1234',
        userId: '999999',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    try {
      const [environment] = await db.select().from(sandboxEnvironments).where(eq(sandboxEnvironments.id, id));
      return environment;
    } catch (e) {
      console.error('Error in getSandboxEnvironmentById:', e);
      return undefined;
    }
  }

  async createSandboxEnvironment(environment: InsertSandboxEnvironment & { userId: string }): Promise<SandboxEnvironment> {
    const [result] = await db.insert(sandboxEnvironments).values(environment).returning();
    return result;
  }

  async updateSandboxEnvironment(id: number, environmentData: Partial<InsertSandboxEnvironment>): Promise<SandboxEnvironment> {
    const [result] = await db
      .update(sandboxEnvironments)
      .set({ ...environmentData, updatedAt: new Date() })
      .where(eq(sandboxEnvironments.id, id))
      .returning();
    return result;
  }

  async deleteSandboxEnvironment(id: number): Promise<void> {
    await db.delete(sandboxEnvironments).where(eq(sandboxEnvironments.id, id));
  }

  // Sandbox API Endpoint methods
  async getSandboxApiEndpoints(environmentId: number): Promise<SandboxApiEndpoint[]> {
    // For demo environment ID 1, return hardcoded endpoints
    if (environmentId === 1) {
      return [
        {
          id: 1,
          environmentId: 1,
          apiType: 'app_store_connect',
          path: '/v1/apps/{app_id}/reviews',
          method: 'GET',
          description: 'Fetch App Store reviews for a specific app',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          environmentId: 1,
          apiType: 'app_store_connect',
          path: '/v1/apps/{app_id}/reviews/{review_id}/response',
          method: 'POST',
          description: 'Respond to an App Store review',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          environmentId: 1,
          apiType: 'google_play_developer',
          path: '/v3/applications/{package_name}/reviews',
          method: 'GET',
          description: 'Fetch Google Play reviews for a specific app',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 4,
          environmentId: 1, 
          apiType: 'gigachat',
          path: '/v1/chat/completions',
          method: 'POST',
          description: 'Generate an AI response for a review',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    }
    
    try {
      return db.select().from(sandboxApiEndpoints).where(eq(sandboxApiEndpoints.environmentId, environmentId));
    } catch (e) {
      console.error('Error in getSandboxApiEndpoints:', e);
      return [];
    }
  }

  async getSandboxApiEndpoint(
    environmentId: number,
    apiType: string,
    path: string,
    method: string
  ): Promise<SandboxApiEndpoint | undefined> {
    // For demo environment
    if (environmentId === 1) {
      // Find the matching endpoint from our hardcoded list
      const demoEndpoints = await this.getSandboxApiEndpoints(1);
      return demoEndpoints.find(endpoint => 
        endpoint.apiType === apiType && 
        endpoint.path === path && 
        endpoint.method === method
      );
    }
    
    try {
      const [endpoint] = await db
        .select()
        .from(sandboxApiEndpoints)
        .where(
          and(
            eq(sandboxApiEndpoints.environmentId, environmentId),
            eq(sandboxApiEndpoints.apiType, apiType as any),
            eq(sandboxApiEndpoints.path, path),
            eq(sandboxApiEndpoints.method, method)
          )
        );
      return endpoint;
    } catch (e) {
      console.error('Error in getSandboxApiEndpoint:', e);
      return undefined;
    }
  }

  async createSandboxApiEndpoint(endpoint: InsertSandboxApiEndpoint): Promise<SandboxApiEndpoint> {
    const [result] = await db.insert(sandboxApiEndpoints).values(endpoint).returning();
    return result;
  }

  async updateSandboxApiEndpoint(id: number, endpointData: Partial<InsertSandboxApiEndpoint>): Promise<SandboxApiEndpoint> {
    const [result] = await db
      .update(sandboxApiEndpoints)
      .set({ ...endpointData, updatedAt: new Date() })
      .where(eq(sandboxApiEndpoints.id, id))
      .returning();
    return result;
  }

  async deleteSandboxApiEndpoint(id: number): Promise<void> {
    await db.delete(sandboxApiEndpoints).where(eq(sandboxApiEndpoints.id, id));
  }

  // Sandbox Test Scenario methods
  async getSandboxTestScenarios(endpointId: number): Promise<SandboxTestScenario[]> {
    // For demo environment endpoints (1-4), return hardcoded test scenarios
    if (endpointId >= 1 && endpointId <= 4) {
      // Demo test scenarios with different response types
      return [
        {
          id: endpointId * 10 + 1,
          endpointId: endpointId,
          name: 'Success Scenario',
          type: 'success',
          description: 'Standard successful response',
          requestConditions: {},
          responseData: this.getDemoResponseData(endpointId, 'success'),
          statusCode: 200,
          delayMs: 100,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: endpointId * 10 + 2,
          endpointId: endpointId,
          name: 'Error Scenario',
          type: 'error',
          description: 'Standard error response',
          requestConditions: {},
          responseData: { error: "Resource not found or invalid request", code: "NOT_FOUND" },
          statusCode: 404,
          delayMs: 100,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: endpointId * 10 + 3,
          endpointId: endpointId,
          name: 'Rate Limit Scenario',
          type: 'rate_limit',
          description: 'Rate limit exceeded response',
          requestConditions: {},
          responseData: { error: "Rate limit exceeded", code: "RATE_LIMIT" },
          statusCode: 429,
          delayMs: 100,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    }
    
    try {
      return db.select().from(sandboxTestScenarios).where(eq(sandboxTestScenarios.endpointId, endpointId));
    } catch (e) {
      console.error('Error in getSandboxTestScenarios:', e);
      return [];
    }
  }
  
  // Helper method to generate appropriate demo response data based on endpoint ID
  private getDemoResponseData(endpointId: number, type: string): any {
    switch (endpointId) {
      case 1: // App Store reviews endpoint
        return {
          data: [
            {
              id: "12345",
              attributes: {
                title: "Great app!",
                review: "This app is really useful and well designed.",
                rating: 5,
                createdDate: new Date().toISOString(),
                userName: "HappyUser123",
                territory: "US"
              }
            },
            {
              id: "12346",
              attributes: {
                title: "Needs improvement",
                review: "Good concept but there are some bugs to fix.",
                rating: 3,
                createdDate: new Date().toISOString(),
                userName: "AppReviewer42",
                territory: "CA"
              }
            }
          ],
          links: {
            self: "https://api.appstoreconnect.apple.com/v1/apps/app_id/reviews"
          }
        };
      
      case 2: // App Store review response endpoint
        return {
          data: {
            id: "response_12345",
            attributes: {
              responseBody: "Thank you for your feedback! We're glad you're enjoying the app.",
              lastModified: new Date().toISOString(),
              state: "PUBLISHED"
            }
          }
        };
        
      case 3: // Google Play reviews endpoint
        return {
          reviews: [
            {
              reviewId: "gp12345",
              authorName: "Google User",
              comments: [
                {
                  userComment: {
                    text: "Love this app, very intuitive!",
                    lastModified: {
                      seconds: Math.floor(Date.now() / 1000)
                    },
                    starRating: 5
                  }
                }
              ]
            },
            {
              reviewId: "gp12346",
              authorName: "Android Fan",
              comments: [
                {
                  userComment: {
                    text: "The app crashes sometimes when I try to save settings.",
                    lastModified: {
                      seconds: Math.floor(Date.now() / 1000)
                    },
                    starRating: 2
                  }
                }
              ]
            }
          ]
        };
        
      case 4: // GigaChat completions endpoint
        return {
          id: "chatcmpl-123456789",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "giga-5",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Thank you for your feedback! We appreciate your kind words about our app. We're constantly working to improve the user experience and add new features. If you have any specific suggestions or encounter any issues, please don't hesitate to reach out to our support team."
              },
              finish_reason: "stop"
            }
          ]
        };
        
      default:
        return { message: "Demo response data" };
    }
  }

  async getSandboxTestScenario(endpointId: number, type: string): Promise<SandboxTestScenario | undefined> {
    // For demo environment endpoints (1-4)
    if (endpointId >= 1 && endpointId <= 4) {
      const scenarios = await this.getSandboxTestScenarios(endpointId);
      return scenarios.find(scenario => scenario.type === type);
    }
    
    try {
      const [scenario] = await db
        .select()
        .from(sandboxTestScenarios)
        .where(
          and(
            eq(sandboxTestScenarios.endpointId, endpointId),
            eq(sandboxTestScenarios.type, type as any)
          )
        );
      return scenario;
    } catch (e) {
      console.error('Error in getSandboxTestScenario:', e);
      return undefined;
    }
  }

  async getDefaultSandboxTestScenario(endpointId: number): Promise<SandboxTestScenario | undefined> {
    // For demo environment endpoints (1-4)
    if (endpointId >= 1 && endpointId <= 4) {
      const scenarios = await this.getSandboxTestScenarios(endpointId);
      return scenarios.find(scenario => scenario.isDefault);
    }
    
    try {
      const [scenario] = await db
        .select()
        .from(sandboxTestScenarios)
        .where(
          and(
            eq(sandboxTestScenarios.endpointId, endpointId),
            eq(sandboxTestScenarios.isDefault, true)
          )
        );
      return scenario;
    } catch (e) {
      console.error('Error in getDefaultSandboxTestScenario:', e);
      return undefined;
    }
  }

  async createSandboxTestScenario(scenario: InsertSandboxTestScenario): Promise<SandboxTestScenario> {
    // If this is marked as default, unset any existing defaults for this endpoint
    if (scenario.isDefault) {
      await db
        .update(sandboxTestScenarios)
        .set({ isDefault: false })
        .where(
          and(
            eq(sandboxTestScenarios.endpointId, scenario.endpointId),
            eq(sandboxTestScenarios.isDefault, true)
          )
        );
    }
    
    const [result] = await db.insert(sandboxTestScenarios).values(scenario).returning();
    return result;
  }

  async updateSandboxTestScenario(id: number, scenarioData: Partial<InsertSandboxTestScenario>): Promise<SandboxTestScenario> {
    // If this is being set as default, unset any existing defaults for this endpoint
    if (scenarioData.isDefault) {
      const [existingScenario] = await db.select().from(sandboxTestScenarios).where(eq(sandboxTestScenarios.id, id));
      
      if (existingScenario) {
        await db
          .update(sandboxTestScenarios)
          .set({ isDefault: false })
          .where(
            and(
              eq(sandboxTestScenarios.endpointId, existingScenario.endpointId),
              eq(sandboxTestScenarios.isDefault, true),
              // Don't update the current one
              e => e.not(eq(sandboxTestScenarios.id, id))
            )
          );
      }
    }
    
    const [result] = await db
      .update(sandboxTestScenarios)
      .set({ ...scenarioData, updatedAt: new Date() })
      .where(eq(sandboxTestScenarios.id, id))
      .returning();
    return result;
  }

  async deleteSandboxTestScenario(id: number): Promise<void> {
    await db.delete(sandboxTestScenarios).where(eq(sandboxTestScenarios.id, id));
  }

  // Sandbox Log methods
  async getSandboxLogs(environmentId: number, options?: { limit?: number, offset?: number }): Promise<SandboxLog[]> {
    // For demo environment ID 1, return mock logs
    if (environmentId === 1) {
      // Generate demo logs for sandbox testing
      const demoLogs: SandboxLog[] = [];
      const now = new Date();
      
      // Create a few sample logs for different endpoints
      const endpoints = await this.getSandboxApiEndpoints(1);
      
      for (let i = 0; i < 10; i++) {
        const endpoint = endpoints[i % endpoints.length];
        const logDate = new Date(now.getTime() - i * 3600000); // 1 hour apart
        
        demoLogs.push({
          id: i + 1,
          environmentId: 1,
          endpointId: endpoint.id,
          scenarioId: i % 3 === 0 ? endpoint.id * 10 + 1 : null,
          requestMethod: endpoint.method,
          requestPath: endpoint.path.replace('{app_id}', '123456').replace('{package_name}', 'com.example.app'),
          requestHeaders: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
          requestBody: i % 2 === 0 ? { query: 'sample query data' } : null,
          responseStatus: i % 5 === 0 ? 429 : 200,
          responseBody: this.getDemoResponseData(endpoint.id, i % 5 === 0 ? 'rate_limit' : 'success'),
          duration: 50 + Math.floor(Math.random() * 200),
          timestamp: logDate
        });
      }
      
      // Sort by timestamp descending
      demoLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Apply pagination
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;
      return demoLogs.slice(offset, Math.min(offset + limit, demoLogs.length));
    }
    
    try {
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;
      
      return db
        .select()
        .from(sandboxLogs)
        .where(eq(sandboxLogs.environmentId, environmentId))
        .orderBy(desc(sandboxLogs.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (e) {
      console.error('Error in getSandboxLogs:', e);
      return [];
    }
  }

  async createSandboxLog(log: InsertSandboxLog): Promise<SandboxLog> {
    const [result] = await db.insert(sandboxLogs).values(log).returning();
    return result;
  }

  async clearSandboxLogs(environmentId: number): Promise<void> {
    await db.delete(sandboxLogs).where(eq(sandboxLogs.environmentId, environmentId));
  }
}

export const storage = new DatabaseStorage();
