import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import passport from "passport";
import session from "express-session";
import { Strategy as LocalStrategy } from "passport-local";
import { WebSocketServer } from "ws";
import PgSimpleStore from "connect-pg-simple";
import { pool } from "./db";

import { insertUserSchema, insertAppSchema, insertAISettingsSchema, insertUserSettingsSchema } from "@shared/schema";
import { generateAIResponse } from "./services/gigachat";
import { fetchAppStoreReviews } from "./services/appstore";
import { fetchGooglePlayReviews } from "./services/playstore";

// Mock data for development purposes
const mockDashboardStats = {
  avgRating: "4.7",
  avgRatingChange: "2.5",
  newReviews: 128,
  newReviewsChange: "8.1",
  responseRate: 92,
  responseRateChange: "5.2",
  avgResponseTime: 2.3,
  avgResponseTimeChange: "0.5"
};

const mockApps = [
  {
    id: 1,
    name: "FitTrack Pro",
    status: "active",
    platform: "google_play",
    iconUrl: "https://images.unsplash.com/photo-1535913989690-f90e1c2d4cfa?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48&q=80",
    reviewCount: 3.5,
    lastSynced: new Date().toISOString(),
    bundleId: "com.example.fittrackpro",
    autoRespond: true
  },
  {
    id: 2,
    name: "MealMaster",
    status: "active",
    platform: "app_store",
    iconUrl: "https://images.unsplash.com/photo-1495195129352-aeb325a55b65?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48&q=80",
    reviewCount: 7.2,
    lastSynced: new Date().toISOString(),
    bundleId: "com.example.mealmaster",
    autoRespond: true
  },
  {
    id: 3,
    name: "ZenMind Meditation",
    status: "warning",
    platform: "google_play",
    iconUrl: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48&q=80",
    reviewCount: 2.8,
    lastSynced: new Date().toISOString(),
    bundleId: "com.example.zenmind",
    autoRespond: true
  },
  {
    id: 4,
    name: "PhotoPro Editor",
    status: "error",
    platform: "app_store",
    iconUrl: null,
    reviewCount: 5.1,
    lastSynced: new Date().toISOString(),
    bundleId: "com.example.photopro",
    autoRespond: false
  }
];

const mockAIMetrics = {
  generatedResponses: {
    current: 428,
    total: 500
  },
  responseAccuracy: 96,
  userSatisfaction: 92,
  aiStatus: {
    online: true,
    version: "1.2.5"
  }
};

const mockReviews = [
  {
    id: 1,
    author: {
      name: "Michael S.",
      initials: "MS"
    },
    appName: "FitTrack Pro",
    appId: 1,
    rating: 4,
    text: "Great app overall, but I've been experiencing some issues with the heart rate monitor syncing. Sometimes it works perfectly, other times it fails to connect. Would be 5 stars if this was fixed!",
    platform: "google_play",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    response: {
      id: 1,
      text: "Thank you for your feedback, Michael! We appreciate your kind words about FitTrack Pro. We're sorry to hear about the heart rate monitor syncing issues you're experiencing. Our team is actively working on improving Bluetooth connectivity in our next update. In the meantime, please try resetting your device connections in the settings menu. If the problem persists, please contact our support team through the app's help section. We're committed to making your experience a 5-star one!",
      status: "approved"
    }
  },
  {
    id: 2,
    author: {
      name: "Jessica L.",
      initials: "JL"
    },
    appName: "MealMaster",
    appId: 2,
    rating: 2,
    text: "The latest update completely ruined the app! Can't save my favorite recipes anymore and it crashes whenever I try to add ingredients to my shopping list. Please fix this ASAP!",
    platform: "app_store",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    response: {
      generatingTime: 25
    }
  },
  {
    id: 3,
    author: {
      name: "Robert K.",
      initials: "RK"
    },
    appName: "ZenMind Meditation",
    appId: 3,
    rating: 5,
    text: "Absolutely love this app! It has transformed my daily meditation practice. The guided sessions are fantastic and the sleep stories help me fall asleep quickly. Worth every penny of the subscription. Highly recommend to anyone looking for mindfulness tools.",
    platform: "google_play",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    response: {
      id: 3,
      text: "Thank you so much for your wonderful review, Robert! We're thrilled to hear that ZenMind Meditation has made such a positive impact on your daily practice. Our team works hard to create guided sessions and sleep stories that truly help our users achieve mindfulness and better sleep. Your kind words mean the world to us! We're constantly adding new content and features, so stay tuned for more improvements. Thanks again for being part of our community!",
      status: "draft"
    }
  }
];

// Generate mock analytics data
const mockAnalytics = {
  overviewStats: {
    totalReviews: 482,
    reviewsChange: 12,
    avgRating: 4.3,
    ratingChange: 0.2,
    responseRate: 94,
    responseRateChange: 3,
    aiAccuracy: 96,
    aiAccuracyChange: 1
  },
  reviewVolume: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    count: Math.floor(Math.random() * 20) + 5
  })),
  ratingDistribution: [
    { name: "5 Stars", value: 45 },
    { name: "4 Stars", value: 30 },
    { name: "3 Stars", value: 15 },
    { name: "2 Stars", value: 7 },
    { name: "1 Star", value: 3 }
  ],
  reviewsByPlatform: [
    { name: "App Store", value: 225 },
    { name: "Google Play", value: 257 }
  ],
  ratingByApp: [
    { name: "FitTrack Pro", value: 4.5 },
    { name: "MealMaster", value: 4.2 },
    { name: "ZenMind", value: 4.8 },
    { name: "PhotoPro", value: 3.7 }
  ],
  ratingTrend: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: 4 + (Math.random() * 0.8 - 0.3)
  })),
  responseRateByApp: [
    { name: "FitTrack Pro", value: 92 },
    { name: "MealMaster", value: 88 },
    { name: "ZenMind", value: 97 },
    { name: "PhotoPro", value: 75 }
  ],
  responseTime: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: Math.random() * 3 + 1
  })),
  aiAccuracy: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: 90 + Math.random() * 8
  }))
};

// Mock user settings
const mockSettings = {
  profile: {
    name: "Jane Doe",
    email: "jane@acme.com"
  },
  aiSettings: {
    apiKey: "",
    responseStyle: "professional",
    maxResponseLength: 250,
    includeSignature: false,
    signature: ""
  },
  notifications: {
    emailNotifications: true,
    reviewAlerts: true,
    marketingEmails: false,
    responseAlerts: true,
    dailyDigest: true
  },
  language: {
    defaultLanguage: "en",
    autoDetectLanguage: true
  }
};

// Helper to validate request body against a schema
const validateBody = <T extends z.ZodType>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session store
  const pgSessionStore = new (PgSimpleStore(session))({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  });

  // Set up session middleware
  app.use(
    session({
      store: pgSessionStore,
      secret: process.env.SESSION_SECRET || 'respondx-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    })
  );

  // Configure passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find user by username
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid username or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize/deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };

  // Auth routes
  app.post(
    '/api/auth/login',
    validateBody(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    ),
    async (req, res, next) => {
      try {
        // Find user by email
        const user = await storage.getUserByEmail(req.body.email);
        if (!user) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Log in user
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          });
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', ensureAuthenticated, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  });

  // Register route
  app.post(
    '/api/auth/register',
    validateBody(
      insertUserSchema.extend({
        passwordConfirm: z.string(),
      }).refine((data) => data.password === data.passwordConfirm, {
        message: 'Passwords do not match',
        path: ['passwordConfirm'],
      })
    ),
    async (req, res, next) => {
      try {
        const { username, email, password, name } = req.body;

        // Check if username or email already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: 'Username already exists' });
        }

        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await storage.createUser({
          username,
          email,
          password: hashedPassword,
          name,
        });

        // Log in user
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
          });
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Apps routes
  app.get('/api/apps', ensureAuthenticated, async (req, res) => {
    try {
      // TODO: Implement real data fetch
      // For now return mock data
      res.json(mockApps);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching apps' });
    }
  });

  app.post(
    '/api/apps',
    ensureAuthenticated,
    validateBody(insertAppSchema),
    async (req, res) => {
      try {
        const userId = (req.user as any).id;
        const app = await storage.createApp({
          ...req.body,
          userId,
        });
        res.status(201).json(app);
      } catch (error) {
        res.status(500).json({ message: 'Error creating app' });
      }
    }
  );

  app.get('/api/apps/:id', ensureAuthenticated, async (req, res) => {
    try {
      const appId = parseInt(req.params.id);
      const app = await storage.getAppById(appId);
      if (!app) {
        return res.status(404).json({ message: 'App not found' });
      }
      res.json(app);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching app' });
    }
  });

  app.patch(
    '/api/apps/:id',
    ensureAuthenticated,
    validateBody(insertAppSchema.partial()),
    async (req, res) => {
      try {
        const appId = parseInt(req.params.id);
        const app = await storage.updateApp(appId, req.body);
        res.json(app);
      } catch (error) {
        res.status(500).json({ message: 'Error updating app' });
      }
    }
  );

  app.delete('/api/apps/:id', ensureAuthenticated, async (req, res) => {
    try {
      const appId = parseInt(req.params.id);
      await storage.deleteApp(appId);
      res.json({ message: 'App deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting app' });
    }
  });

  app.post('/api/apps/:id/refresh', ensureAuthenticated, async (req, res) => {
    try {
      const appId = parseInt(req.params.id);
      const app = await storage.getAppById(appId);
      
      if (!app) {
        return res.status(404).json({ message: 'App not found' });
      }
      
      // Fetch reviews based on platform
      if (app.platform === 'app_store') {
        await fetchAppStoreReviews(app);
      } else if (app.platform === 'google_play') {
        await fetchGooglePlayReviews(app);
      }
      
      // Update last synced timestamp
      await storage.updateApp(appId, { lastSynced: new Date() });
      
      res.json({ message: 'App refresh initiated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error refreshing app' });
    }
  });

  // Reviews routes
  app.get('/api/reviews', ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string) || 10;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      
      const appId = req.query.app !== 'all' ? parseInt(req.query.app as string) : undefined;
      const rating = req.query.rating !== 'all' ? parseInt(req.query.rating as string) : undefined;

      // TODO: Implement real data fetch with proper pagination
      // For now return mock data
      res.json({
        reviews: mockReviews,
        total: mockReviews.length
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching reviews' });
    }
  });

  app.get('/api/reviews/:id', ensureAuthenticated, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const review = await storage.getReviewById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      // Get response if available
      const response = review.responseId 
        ? await storage.getReviewResponseById(review.responseId) 
        : null;
      
      res.json({ ...review, response });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching review' });
    }
  });

  app.post('/api/reviews/:id/regenerate', ensureAuthenticated, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const review = await storage.getReviewById(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      // Generate AI response
      const userId = (req.user as any).id;
      const aiSettings = await storage.getAISettings(userId);
      
      const responseText = await generateAIResponse(review, aiSettings);
      
      // Check if review already has a response
      if (review.responseId) {
        // Update existing response
        await storage.updateReviewResponse(review.responseId, {
          text: responseText,
          status: 'draft',
          isGenerated: true
        });
      } else {
        // Create new response
        const response = await storage.createReviewResponse({
          reviewId,
          text: responseText,
          status: 'draft',
          isGenerated: true
        });
        
        // Update review with response ID
        await storage.updateReview(reviewId, { responseId: response.id });
      }
      
      res.json({ message: 'Response regenerated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error regenerating response' });
    }
  });

  app.patch('/api/reviews/:id/response', ensureAuthenticated, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const review = await storage.getReviewById(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: 'Response text is required' });
      }
      
      // Check if review already has a response
      if (review.responseId) {
        // Update existing response
        await storage.updateReviewResponse(review.responseId, {
          text,
          isGenerated: false,
          status: 'draft'
        });
      } else {
        // Create new response
        const response = await storage.createReviewResponse({
          reviewId,
          text,
          status: 'draft',
          isGenerated: false
        });
        
        // Update review with response ID
        await storage.updateReview(reviewId, { responseId: response.id });
      }
      
      res.json({ message: 'Response updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating response' });
    }
  });

  app.post('/api/reviews/:id/publish', ensureAuthenticated, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const review = await storage.getReviewById(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      if (!review.responseId) {
        return res.status(400).json({ message: 'No response available to publish' });
      }
      
      // Get response
      const response = await storage.getReviewResponseById(review.responseId);
      
      if (!response) {
        return res.status(400).json({ message: 'Response not found' });
      }
      
      // Get app details to determine which service to use
      const app = await storage.getAppById(review.appId);
      
      if (!app) {
        return res.status(404).json({ message: 'App not found' });
      }
      
      // Publish response based on platform
      try {
        // This would actually publish to the respective platform
        /*
        if (app.platform === 'app_store') {
          // Publish to App Store
          const externalResponseId = await publishAppStoreResponse(app, review, response.text);
          await storage.updateReviewResponse(response.id, {
            status: 'published',
            externalResponseId
          });
        } else if (app.platform === 'google_play') {
          // Publish to Google Play
          const externalResponseId = await publishGooglePlayResponse(app, review, response.text);
          await storage.updateReviewResponse(response.id, {
            status: 'published',
            externalResponseId
          });
        }
        */
        
        // For now, just update the status
        await storage.updateReviewResponse(response.id, {
          status: 'published',
          publishedAt: new Date()
        });
        
        res.json({ message: 'Response published successfully' });
      } catch (error) {
        console.error('Error publishing response:', error);
        res.status(500).json({ message: 'Error publishing response to platform' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error publishing response' });
    }
  });

  // Dashboard stats
  app.get('/api/stats', ensureAuthenticated, (req, res) => {
    // TODO: Implement real stats calculation
    // For now return mock data
    res.json(mockDashboardStats);
  });

  // AI metrics
  app.get('/api/ai/metrics', ensureAuthenticated, (req, res) => {
    // TODO: Implement real AI metrics
    // For now return mock data
    res.json(mockAIMetrics);
  });

  // Analytics
  app.get('/api/analytics', ensureAuthenticated, (req, res) => {
    const period = req.query.period as string || '30d';
    const appId = req.query.app !== 'all' ? req.query.app : undefined;
    
    // TODO: Implement real analytics data
    // For now return mock data
    res.json(mockAnalytics);
  });

  // Settings
  app.get('/api/settings', ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Fetch user profile
      const user = await storage.getUser(userId);
      
      // Fetch AI settings
      const aiSettings = await storage.getAISettings(userId);
      
      // Fetch notification settings
      const notificationSettings = await storage.getUserSettings(userId);
      
      // Combine all settings
      const settings = {
        profile: user ? {
          name: user.name,
          email: user.email
        } : null,
        aiSettings: aiSettings ? {
          apiKey: aiSettings.apiKey ? '************' : '',
          responseStyle: aiSettings.responseStyle,
          maxResponseLength: aiSettings.maxResponseLength,
          includeSignature: aiSettings.includeSignature,
          signature: aiSettings.signature
        } : null,
        notifications: notificationSettings ? {
          emailNotifications: notificationSettings.emailNotifications,
          reviewAlerts: notificationSettings.reviewAlerts,
          responseAlerts: notificationSettings.responseAlerts,
          dailyDigest: notificationSettings.dailyDigest,
          marketingEmails: notificationSettings.marketingEmails
        } : null,
        language: notificationSettings ? {
          defaultLanguage: notificationSettings.defaultLanguage,
          autoDetectLanguage: notificationSettings.autoDetectLanguage
        } : null
      };
      
      // For now, use mock data if real data is not available
      res.json(settings.profile ? settings : mockSettings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching settings' });
    }
  });

  app.patch('/api/settings/profile', ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { name, email } = req.body;
      
      // Update user profile
      const user = await storage.updateUser(userId, { name, email });
      
      res.json({
        name: user.name,
        email: user.email
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating profile' });
    }
  });

  app.patch(
    '/api/settings/ai',
    ensureAuthenticated,
    validateBody(insertAISettingsSchema),
    async (req, res) => {
      try {
        const userId = (req.user as any).id;
        
        // Update AI settings
        const settings = await storage.updateAISettings(userId, req.body);
        
        res.json({
          apiKey: settings.apiKey ? '************' : '',
          responseStyle: settings.responseStyle,
          maxResponseLength: settings.maxResponseLength,
          includeSignature: settings.includeSignature,
          signature: settings.signature
        });
      } catch (error) {
        res.status(500).json({ message: 'Error updating AI settings' });
      }
    }
  );

  app.patch(
    '/api/settings/notifications',
    ensureAuthenticated,
    validateBody(insertUserSettingsSchema.pick({
      emailNotifications: true,
      reviewAlerts: true,
      responseAlerts: true,
      dailyDigest: true,
      marketingEmails: true
    })),
    async (req, res) => {
      try {
        const userId = (req.user as any).id;
        
        // Update notification settings
        const settings = await storage.updateUserSettings(userId, req.body);
        
        res.json({
          emailNotifications: settings.emailNotifications,
          reviewAlerts: settings.reviewAlerts,
          responseAlerts: settings.responseAlerts,
          dailyDigest: settings.dailyDigest,
          marketingEmails: settings.marketingEmails
        });
      } catch (error) {
        res.status(500).json({ message: 'Error updating notification settings' });
      }
    }
  );

  app.patch(
    '/api/settings/language',
    ensureAuthenticated,
    validateBody(insertUserSettingsSchema.pick({
      defaultLanguage: true,
      autoDetectLanguage: true
    })),
    async (req, res) => {
      try {
        const userId = (req.user as any).id;
        
        // Update language settings
        const settings = await storage.updateUserSettings(userId, req.body);
        
        res.json({
          defaultLanguage: settings.defaultLanguage,
          autoDetectLanguage: settings.autoDetectLanguage
        });
      } catch (error) {
        res.status(500).json({ message: 'Error updating language settings' });
      }
    }
  );

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time updates with a specific path
  // This prevents conflicts with Vite's WebSocket server for HMR
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'  // Use a distinct path for our WebSocket server
  });
  
  // Store connected clients
  const clients = new Set();
  
  // Function to broadcast message to all connected clients
  const broadcastMessage = (data) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocketServer.OPEN) {
        client.send(message);
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected to /ws path');
    clients.add(ws);
    
    ws.on('message', (message) => {
      console.log('received: %s', message);
      
      try {
        // Parse the message
        const parsedMessage = JSON.parse(message.toString());
        
        // Handle different message types
        switch (parsedMessage.type) {
          case 'message':
            // Echo back regular messages
            ws.send(JSON.stringify({
              type: 'echo',
              message: parsedMessage.text,
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'new_review':
            // For demo purposes, broadcast simulated review notifications to all clients
            broadcastMessage({
              type: 'new_review',
              id: parsedMessage.id || Math.floor(Math.random() * 1000),
              appId: parsedMessage.appId || 1,
              appName: parsedMessage.appName || "App",
              platform: parsedMessage.platform || "app_store",
              rating: parsedMessage.rating || 5,
              authorName: parsedMessage.authorName || "User",
              text: parsedMessage.text || "Great app!",
              timestamp: new Date().toISOString()
            });
            break;
            
          default:
            // Echo back other messages
            ws.send(JSON.stringify({
              type: 'echo',
              originalMessage: parsedMessage,
              timestamp: new Date().toISOString()
            }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          error: error.message
        }));
      }
    });

    // Send welcome message on connection
    ws.send(JSON.stringify({ 
      type: 'connection', 
      status: 'success',
      message: 'WebSocket connected to RespondX server',
      timestamp: new Date().toISOString()
    }));
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  return httpServer;
}
