import axios from 'axios';
import jwt from 'jsonwebtoken';
import { type App, type InsertReview } from '@shared/schema';
import { storage } from '../storage';

// Interface for App Store Review
interface AppStoreReview {
  id: string;
  attributes: {
    title?: string;
    review: string;
    rating: number;
    createdDate: string;
    userName: string;
    territory: string;
    developerResponse?: {
      id: string;
      body: string;
      lastModified: string;
      state: string;
    };
  };
}

// Interface for App Store Reviews Response
interface AppStoreReviewsResponse {
  data: AppStoreReview[];
  links: {
    self: string;
    next?: string;
  };
}

/**
 * Generates a JWT token for App Store Connect API
 * 
 * @param issuerId - App Store Connect API Issuer ID
 * @param keyId - App Store Connect API Key ID
 * @param privateKey - App Store Connect API Private Key
 * @returns string - JWT token
 */
function generateAppStoreToken(issuerId: string, keyId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: issuerId,
    exp: now + 1200, // 20 minutes expiration
    aud: 'appstoreconnect-v1'
  };
  
  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT'
  };
  
  return jwt.sign(payload, privateKey, { algorithm: 'ES256', header });
}

/**
 * Fetches reviews from App Store for a specific app
 * 
 * @param app - The app to fetch reviews for
 * @param maxResults - Maximum number of results to fetch (default: 100)
 * @returns Promise<void>
 */
export async function fetchAppStoreReviews(app: App, maxResults: number = 100): Promise<void> {
  try {
    if (app.platform !== 'app_store') {
      throw new Error('App platform is not App Store');
    }

    if (!app.apiKey || !app.apiSecret) {
      throw new Error('App Store API key or secret not provided');
    }

    const appId = app.bundleId || '';
    if (!appId) {
      throw new Error('App ID (Bundle ID) not provided');
    }

    // Parse the API key (contains key ID and issuer ID)
    const [keyId, issuerId] = app.apiKey.split(',');
    const privateKey = app.apiSecret;
    
    // Generate JWT token
    const token = generateAppStoreToken(issuerId, keyId, privateKey);

    let nextUrl: string | undefined = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/customerReviews`;
    let reviewCount = 0;
    let hasMore = true;

    while (hasMore && reviewCount < maxResults) {
      if (!nextUrl) break;
      
      // Fetch reviews from App Store Connect API
      const response = await axios.get<AppStoreReviewsResponse>(nextUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const { data, links } = response.data;
      
      if (!data || data.length === 0) {
        break;
      }

      // Process and store each review
      for (const review of data) {
        // Check if review already exists
        const existingReviews = await storage.getAppReviews(app.id, {
          limit: 1,
        });
        
        const existingReview = existingReviews.reviews.find(
          r => r.externalId === review.id
        );

        if (!existingReview) {
          // Create new review
          const reviewData: InsertReview = {
            appId: app.id,
            platform: 'app_store',
            externalId: review.id,
            authorName: review.attributes.userName,
            authorId: '', // Not provided by App Store API
            rating: review.attributes.rating,
            title: review.attributes.title,
            text: review.attributes.review,
            language: review.attributes.territory, // Use territory as language
            version: undefined, // Not provided in this API response
          };

          const newReview = await storage.createReview(reviewData);
          
          // If auto-respond is enabled, generate a response
          if (app.autoRespond) {
            try {
              // Get user's AI settings
              const userAISettings = await storage.getAISettings(app.userId);
              
              // Import here to avoid circular dependencies
              const { generateAIResponse } = await import('./gigachat');
              
              // Generate AI response
              const responseText = await generateAIResponse(newReview, userAISettings);
              
              // Create review response
              await storage.createReviewResponse({
                reviewId: newReview.id,
                text: responseText,
                status: 'draft',
                isGenerated: true
              });
            } catch (error) {
              console.error('Error generating AI response:', error);
            }
          }
          
          reviewCount++;
        }
      }

      // Check if there are more reviews to fetch
      nextUrl = links.next;
      hasMore = Boolean(nextUrl);
    }

    // Update app's review count
    await storage.updateApp(app.id, {
      reviewCount: reviewCount
    });

  } catch (error) {
    console.error('Error fetching App Store reviews:', error);
    throw error;
  }
}

/**
 * Publishes a response to an App Store review
 * 
 * @param app - The app the review belongs to
 * @param review - The review to respond to
 * @param responseText - The text of the response
 * @returns Promise<string> - The external response ID from App Store
 */
export async function publishAppStoreResponse(
  app: App,
  review: any,
  responseText: string
): Promise<string> {
  try {
    if (app.platform !== 'app_store') {
      throw new Error('App platform is not App Store');
    }

    if (!app.apiKey || !app.apiSecret) {
      throw new Error('App Store API key or secret not provided');
    }

    // Parse the API key (contains key ID and issuer ID)
    const [keyId, issuerId] = app.apiKey.split(',');
    const privateKey = app.apiSecret;
    
    // Generate JWT token
    const token = generateAppStoreToken(issuerId, keyId, privateKey);

    // Prepare the request to the App Store Connect API
    const url = `https://api.appstoreconnect.apple.com/v1/customerReviews/${review.externalId}/responses`;
    
    const response = await axios.post(url, {
      data: {
        type: 'customerReviewResponses',
        attributes: {
          responseBody: responseText
        },
        relationships: {
          review: {
            data: {
              type: 'customerReviews',
              id: review.externalId
            }
          }
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Return the response ID
    return response.data.data.id;
  } catch (error) {
    console.error('Error publishing App Store response:', error);
    throw error;
  }
}
