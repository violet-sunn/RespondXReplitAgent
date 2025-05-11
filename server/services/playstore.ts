import axios from 'axios';
import { type App, type InsertReview } from '@shared/schema';
import { storage } from '../storage';

// Interface for Google Play Review
interface GooglePlayReview {
  reviewId: string;
  authorName: string;
  comments: string;
  commentTime: string;
  starRating: number;
  reviewerLanguage: string;
  appVersion?: string;
}

// Interface for Google Play Review Response
interface GooglePlayReviewsResponse {
  reviews: GooglePlayReview[];
  nextPageToken?: string;
}

/**
 * Fetches reviews from Google Play for a specific app
 * 
 * @param app - The app to fetch reviews for
 * @param maxResults - Maximum number of results to fetch (default: 100)
 * @returns Promise<void>
 */
export async function fetchGooglePlayReviews(app: App, maxResults: number = 100): Promise<void> {
  try {
    if (app.platform !== 'google_play') {
      throw new Error('App platform is not Google Play');
    }

    if (!app.apiKey) {
      throw new Error('Google Play API key not provided');
    }

    const packageName = app.bundleId || '';
    if (!packageName) {
      throw new Error('Package name (Bundle ID) not provided');
    }

    let pageToken: string | undefined;
    let reviewCount = 0;
    let hasMore = true;

    while (hasMore && reviewCount < maxResults) {
      // Prepare the request to the Google Play Developer API
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/reviews`;
      
      const response = await axios.get<GooglePlayReviewsResponse>(url, {
        params: {
          access_token: app.apiKey,
          maxResults: 100,
          pageToken: pageToken
        }
      });

      const { reviews, nextPageToken } = response.data;
      
      if (!reviews || reviews.length === 0) {
        break;
      }

      // Process and store each review
      for (const review of reviews) {
        // Check if review already exists
        const existingReviews = await storage.getAppReviews(app.id, {
          limit: 1,
        });
        
        const existingReview = existingReviews.reviews.find(
          r => r.externalId === review.reviewId
        );

        if (!existingReview) {
          // Create new review
          const reviewData: InsertReview = {
            appId: app.id,
            platform: 'google_play',
            externalId: review.reviewId,
            authorName: review.authorName,
            authorId: '', // Not provided by Google Play API
            rating: review.starRating,
            text: review.comments,
            language: review.reviewerLanguage,
            version: review.appVersion,
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
      pageToken = nextPageToken;
      hasMore = Boolean(pageToken);
    }

    // Update app's review count
    await storage.updateApp(app.id, {
      reviewCount: reviewCount
    });

  } catch (error) {
    console.error('Error fetching Google Play reviews:', error);
    throw error;
  }
}

/**
 * Publishes a response to a Google Play review
 * 
 * @param app - The app the review belongs to
 * @param review - The review to respond to
 * @param responseText - The text of the response
 * @returns Promise<string> - The external response ID from Google Play
 */
export async function publishGooglePlayResponse(
  app: App,
  review: any,
  responseText: string
): Promise<string> {
  try {
    if (app.platform !== 'google_play') {
      throw new Error('App platform is not Google Play');
    }

    if (!app.apiKey) {
      throw new Error('Google Play API key not provided');
    }

    const packageName = app.bundleId || '';
    if (!packageName) {
      throw new Error('Package name (Bundle ID) not provided');
    }

    // Prepare the request to the Google Play Developer API
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/reviews/${review.externalId}:reply`;
    
    const response = await axios.post(url, {
      replyText: responseText
    }, {
      params: {
        access_token: app.apiKey
      }
    });

    // Return the response ID
    return response.data.reviewId || review.externalId;
  } catch (error) {
    console.error('Error publishing Google Play response:', error);
    throw error;
  }
}
