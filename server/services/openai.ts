import OpenAI from "openai";
import { type Review } from '@shared/schema';
import { type AISettings } from '@shared/schema';

// Interface for OpenAI API Test Result
export interface OpenAITestResult {
  success: boolean;
  message: string;
  details?: {
    authTest?: {
      success: boolean;
      message: string;
    };
    modelsTest?: {
      success: boolean;
      message: string;
      models?: string[];
    };
    completionTest?: {
      success: boolean;
      message: string;
      response?: string;
    };
  };
}

/**
 * Test connection to OpenAI API with real credentials
 * Tests authentication, retrieving models, and generating completions
 * 
 * @param apiKey - The OpenAI API key to use for testing
 * @returns Promise<OpenAITestResult> - Result of the API connectivity test
 */
export async function testOpenAIAPIConnection(apiKey: string): Promise<OpenAITestResult> {
  const result: OpenAITestResult = {
    success: false,
    message: 'OpenAI API connection test failed',
    details: {
      authTest: {
        success: false,
        message: 'Authentication test failed'
      },
      modelsTest: {
        success: false,
        message: 'Models test failed'
      },
      completionTest: {
        success: false,
        message: 'Completion test failed'
      }
    }
  };
  
  try {
    // Initialize OpenAI client with the provided API key
    const openai = new OpenAI({ apiKey });
    
    // Step 1: Test authentication via models list endpoint
    try {
      // Just attempting to list models will validate the API key
      await openai.models.list();
      
      result.details!.authTest = {
        success: true,
        message: 'Successfully authenticated with OpenAI API'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.details!.authTest = {
        success: false,
        message: `Authentication failed: ${errorMessage}`
      };
      return result; // Early return if auth fails
    }
    
    // Step 2: Test retrieving models
    try {
      const modelsResponse = await openai.models.list();
      
      if (modelsResponse.data && Array.isArray(modelsResponse.data)) {
        const models = modelsResponse.data.map((model) => model.id);
        result.details!.modelsTest = {
          success: true,
          message: `Successfully retrieved ${models.length} models`,
          models: models.slice(0, 10) // Only show first 10 models
        };
      } else {
        throw new Error('Invalid response when fetching models');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.details!.modelsTest = {
        success: false,
        message: `Models retrieval failed: ${errorMessage}`
      };
    }
    
    // Step 3: Test chat completion
    try {
      const completionResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using gpt-3.5-turbo as requested
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello in Russian." }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });
      
      if (completionResponse && 
          completionResponse.choices && 
          completionResponse.choices.length > 0) {
        
        const response = completionResponse.choices[0].message.content;
        result.details!.completionTest = {
          success: true,
          message: 'Successfully generated completion',
          response
        };
      } else {
        throw new Error('Invalid response from chat completion API');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.details!.completionTest = {
        success: false,
        message: `Completion generation failed: ${errorMessage}`
      };
    }
    
    // Overall test result
    result.success = 
      result.details!.authTest!.success && 
      result.details!.modelsTest!.success && 
      result.details!.completionTest!.success;
    
    if (result.success) {
      result.message = 'OpenAI API connection test passed successfully';
    } else if (result.details!.authTest!.success) {
      result.message = 'Partial success: Authentication succeeded but some API tests failed';
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `OpenAI API test failed with error: ${errorMessage}`
    };
  }
}

/**
 * Generates an AI response using OpenAI for a given review
 * 
 * @param review - The review to respond to
 * @param aiSettings - Optional AI settings for customizing the response
 * @param externalApiKey - Optional external API key to use instead of the stored one
 * @returns Promise<string> - The generated response text
 */
export async function generateAIResponse(
  review: Review,
  aiSettings?: AISettings | null,
  externalApiKey?: string
): Promise<string> {
  try {
    // Get API key from parameters, settings, or environment
    const apiKey = externalApiKey || aiSettings?.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not provided');
    }
    
    // Initialize OpenAI client with the provided API key
    const openai = new OpenAI({ apiKey });
    
    // Determine response style and length from settings
    const responseStyle = aiSettings?.responseStyle || 'professional';
    const maxLength = aiSettings?.maxResponseLength || 250;
    
    // Prepare system prompt based on response style
    let systemPrompt = "You are a helpful customer support agent responding to app reviews. ";
    
    switch (responseStyle) {
      case 'friendly':
        systemPrompt += "Use a friendly, casual, and warm tone. Be personable and empathetic.";
        break;
      case 'professional':
        systemPrompt += "Use a professional, polite, and respectful tone. Be clear and concise.";
        break;
      case 'casual':
        systemPrompt += "Use a casual and conversational tone. Be relaxed but helpful.";
        break;
      case 'formal':
        systemPrompt += "Use a formal and respectful tone. Be precise and detailed.";
        break;
      default:
        systemPrompt += "Use a professional, polite, and respectful tone. Be clear and concise.";
    }
    
    // Build the user prompt with review information
    const userPrompt = `
      Please write a response to the following ${review.rating}-star review for a mobile app:
      
      Review: "${review.text}"
      
      Guidelines:
      - Keep the response concise and under ${maxLength} characters
      - Address the specific points mentioned in the review
      - Thank the user for their feedback
      - If it's a positive review (4-5 stars), express appreciation and highlight app benefits
      - If it's a negative review (1-3 stars), be empathetic, apologize for issues, and provide solutions
      - Keep the tone ${responseStyle}
      - Don't include any placeholders like [APP NAME] - write as if you know the app
      - Avoid making promises about specific future updates unless mentioned in the prompt
      - Be specific in your response to make it feel personalized
    `;

    // Prepare the request to the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using gpt-3.5-turbo as requested
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: Math.max(maxLength, 500),
    });

    // Extract response text
    let responseText = response.choices[0].message.content?.trim() || '';
    
    // Add signature if configured
    if (aiSettings?.includeSignature && aiSettings.signature) {
      responseText += `\n\n${aiSettings.signature}`;
    }
    
    // Ensure response doesn't exceed max length
    if (responseText.length > maxLength) {
      responseText = responseText.substring(0, maxLength);
    }
    
    return responseText;
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Fallback response if API call fails
    return "Thank you for your feedback. We appreciate you taking the time to share your thoughts. Our team is reviewing your comments and will use them to improve our app. Please contact our support team if you need any further assistance.";
  }
}