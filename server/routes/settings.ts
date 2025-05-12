import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Validation schemas
const languageSchema = z.object({
  defaultLanguage: z.enum(['en', 'ru', 'es']),
  autoDetectReviewLanguage: z.boolean().optional().default(true),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean().optional(),
  reviewAlerts: z.boolean().optional(),
  responseAlerts: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

const userProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

// Get all settings
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || '999999'; // Use guest ID if not authenticated
    
    // Get user settings
    const userSettings = await storage.getUserSettings(userId);
    
    // Get AI settings
    const aiSettings = await storage.getAISettings(userId);
    
    // Create response object
    const settings = {
      user: req.user ? {
        id: userId,
        email: req.user?.claims?.email,
        firstName: req.user?.claims?.first_name,
        lastName: req.user?.claims?.last_name,
        profileImageUrl: req.user?.claims?.profile_image_url,
      } : {
        id: userId,
        email: 'guest@respondx.dev',
        firstName: 'Guest',
        lastName: 'User',
        profileImageUrl: null,
      },
      notifications: userSettings ? {
        emailNotifications: userSettings.emailNotifications,
        reviewAlerts: userSettings.reviewAlerts,
        responseAlerts: userSettings.responseAlerts,
        dailyDigest: userSettings.dailyDigest,
        marketingEmails: userSettings.marketingEmails,
      } : {
        emailNotifications: false,
        reviewAlerts: true,
        responseAlerts: true,
        dailyDigest: false,
        marketingEmails: false,
      },
      language: userSettings ? {
        defaultLanguage: userSettings.defaultLanguage,
        autoDetectReviewLanguage: userSettings.autoDetectLanguage,
      } : {
        defaultLanguage: 'en',
        autoDetectReviewLanguage: true,
      },
      ai: aiSettings || {
        responseStyle: 'professional',
        maxResponseLength: 500,
        includeSignature: true,
        signature: 'The [App Name] Team',
        model: 'gpt-3.5-turbo',
      },
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// Update language settings
router.patch('/language', async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || '999999'; // Use guest ID if not authenticated
    const data = languageSchema.parse(req.body);
    
    let userSettings = await storage.getUserSettings(userId);
    
    if (!userSettings) {
      // Create settings if they don't exist
      userSettings = await storage.createUserSettings({
        userId,
        defaultLanguage: data.defaultLanguage,
        autoDetectLanguage: data.autoDetectReviewLanguage || true,
        emailNotifications: false,
        reviewAlerts: true,
        responseAlerts: true,
        dailyDigest: false,
        marketingEmails: false
      });
    } else {
      // Update existing settings
      userSettings = await storage.updateUserSettings(userId, {
        defaultLanguage: data.defaultLanguage,
        autoDetectLanguage: data.autoDetectReviewLanguage
      });
    }
    
    res.json({ 
      language: {
        defaultLanguage: userSettings.defaultLanguage,
        autoDetectReviewLanguage: userSettings.autoDetectLanguage
      },
      message: 'Language settings updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid language settings', errors: error.errors });
    } else {
      console.error('Error updating language settings:', error);
      res.status(500).json({ message: 'Failed to update language settings' });
    }
  }
});

// Update notification settings
router.patch('/notifications', async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || '999999'; // Use guest ID if not authenticated
    const data = notificationSchema.parse(req.body);
    
    let userSettings = await storage.getUserSettings(userId);
    
    if (!userSettings) {
      // Create settings if they don't exist
      userSettings = await storage.createUserSettings({
        userId,
        defaultLanguage: 'en',
        autoDetectLanguage: true,
        emailNotifications: data.emailNotifications ?? false,
        reviewAlerts: data.reviewAlerts ?? true,
        responseAlerts: data.responseAlerts ?? true,
        dailyDigest: data.dailyDigest ?? false,
        marketingEmails: data.marketingEmails ?? false
      });
    } else {
      // Update existing settings
      userSettings = await storage.updateUserSettings(userId, {
        emailNotifications: data.emailNotifications,
        reviewAlerts: data.reviewAlerts,
        responseAlerts: data.responseAlerts,
        dailyDigest: data.dailyDigest,
        marketingEmails: data.marketingEmails
      });
    }
    
    res.json({ 
      notifications: {
        emailNotifications: userSettings.emailNotifications,
        reviewAlerts: userSettings.reviewAlerts,
        responseAlerts: userSettings.responseAlerts,
        dailyDigest: userSettings.dailyDigest,
        marketingEmails: userSettings.marketingEmails
      },
      message: 'Notification settings updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid notification settings', errors: error.errors });
    } else {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ message: 'Failed to update notification settings' });
    }
  }
});

// Update user profile
router.patch('/profile', async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || '999999'; // Use guest ID if not authenticated
    const data = userProfileSchema.parse(req.body);
    
    // Update user in database
    const updatedUser = await storage.updateUser(userId, data);
    
    res.json({ 
      user: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid profile data', errors: error.errors });
    } else {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
});

export default router;