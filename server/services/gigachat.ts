import axios from 'axios';
import { type Review } from '@shared/schema';
import { type AISettings } from '@shared/schema';

// Interface for GigaChat response
interface GigaChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

/**
 * Generates an AI response using GigaChat for a given review
 * 
 * @param review - The review to respond to
 * @param aiSettings - Optional AI settings for customizing the response
 * @returns Promise<string> - The generated response text
 */
export async function generateAIResponse(
  review: Review,
  aiSettings?: AISettings | null
): Promise<string> {
  try {
    // Get API key from settings or environment
    const apiKey = aiSettings?.apiKey || process.env.GIGACHAT_API_KEY;
    
    if (!apiKey) {
      throw new Error('GigaChat API key not provided');
    }
    
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

    // Prepare the request to the GigaChat API
    const response = await axios.post<GigaChatResponse>(
      'https://gigachat-api.sbercloud.ru/api/v1/chat/completions',
      {
        model: 'GigaChat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: Math.max(maxLength, 500),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Extract response text
    let responseText = response.data.choices[0].message.content.trim();
    
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
