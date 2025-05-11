import { 
  users, type User, type InsertUser, type UpsertUser,
  apps, type App, type InsertApp,
  reviews, type Review, type InsertReview,
  reviewResponses, type ReviewResponse, type InsertReviewResponse,
  aiSettings, type AISettings, type InsertAISettings,
  userSettings, type UserSettings, type InsertUserSettings,
  analyticsData, type AnalyticsData, type InsertAnalyticsData
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
}

export const storage = new DatabaseStorage();
