// AI categorization utility using Gemini API
import { TRANSACTION_CATEGORIES } from './escrow';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Categorize a transaction message using Gemini AI
 * @param message - Transaction message to categorize
 * @returns Category name
 */
export const categorizeTransaction = async (message: string): Promise<string> => {
  try {
    // Check if API key is available
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'undefined') {
      console.warn('Gemini API key not found, using fallback categorization');
      return fallbackCategorization(message);
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this transaction message and categorize it into exactly one of these categories: ${TRANSACTION_CATEGORIES.join(', ')}.

Transaction message: "${message}"

Rules:
- Respond with only the category name
- Choose the most appropriate category
- If unsure, choose "Other"
- Do not include any explanation or additional text

Category:`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 10,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const category = data.candidates[0].content.parts[0].text.trim();
      
      // Validate the category is one of our predefined options
      if (TRANSACTION_CATEGORIES.includes(category)) {
        return category;
      }
    }

    // If AI response is invalid, fall back to keyword matching
    return fallbackCategorization(message);

  } catch (error) {
    console.error('Error with Gemini AI categorization:', error);
    return fallbackCategorization(message);
  }
};

/**
 * Fallback categorization using keyword matching
 * @param message - Transaction message
 * @returns Category name
 */
export const fallbackCategorization = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  // Define keywords for each category
  const categoryKeywords: Record<string, string[]> = {
    'Food': [
      'restaurant', 'food', 'meal', 'lunch', 'dinner', 'breakfast', 'coffee', 
      'pizza', 'burger', 'grocery', 'supermarket', 'bakery', 'cafe', 'eat',
      'snack', 'drink', 'beverage', 'kitchen', 'cooking', 'recipe'
    ],
    'Shopping': [
      'shopping', 'store', 'mall', 'buy', 'purchase', 'retail', 'clothes',
      'clothing', 'fashion', 'shoes', 'accessories', 'electronics', 'gadget',
      'amazon', 'ebay', 'shop', 'merchandise', 'item', 'product'
    ],
    'Bills': [
      'bill', 'utility', 'electricity', 'gas', 'water', 'internet', 'phone',
      'rent', 'mortgage', 'insurance', 'subscription', 'netflix', 'spotify',
      'payment', 'monthly', 'annual', 'service charge', 'fee'
    ],
    'Entertainment': [
      'movie', 'cinema', 'theater', 'concert', 'music', 'game', 'gaming',
      'entertainment', 'fun', 'party', 'club', 'bar', 'vacation', 'travel',
      'holiday', 'ticket', 'event', 'show', 'sports', 'hobby'
    ],
    'Transport': [
      'transport', 'taxi', 'uber', 'lyft', 'bus', 'train', 'subway', 'flight',
      'airline', 'fuel', 'gas station', 'parking', 'car', 'vehicle', 
      'motorcycle', 'bike', 'commute', 'travel', 'journey'
    ],
    'Services': [
      'service', 'repair', 'maintenance', 'cleaning', 'haircut', 'salon',
      'spa', 'doctor', 'medical', 'hospital', 'dentist', 'lawyer', 'consultant',
      'professional', 'freelance', 'contractor', 'plumber', 'electrician'
    ],
    'Investment': [
      'investment', 'stock', 'crypto', 'bitcoin', 'ethereum', 'savings',
      'portfolio', 'trading', 'broker', 'dividend', 'interest', 'fund',
      'etf', 'bond', 'financial', 'bank', 'deposit'
    ],
    'Gift': [
      'gift', 'present', 'birthday', 'anniversary', 'christmas', 'holiday',
      'donation', 'charity', 'tip', 'bonus', 'reward', 'prize', 'wedding',
      'graduation', 'celebration', 'surprise'
    ]
  };

  // Check each category for keyword matches
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return category;
      }
    }
  }

  // Default to 'Other' if no keywords match
  return 'Other';
};

/**
 * Get category emoji for UI display
 * @param category - Category name
 * @returns Emoji string
 */
export const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    'Food': '🍕',
    'Shopping': '🛍️',
    'Bills': '💳',
    'Entertainment': '🎬',
    'Transport': '🚗',
    'Services': '🔧',
    'Investment': '📈',
    'Gift': '🎁',
    'Other': '💼'
  };

  return emojiMap[category] || '💼';
};

/**
 * Get category color for UI display
 * @param category - Category name
 * @returns Color class string
 */
export const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    'Food': 'bg-orange-100 text-orange-800',
    'Shopping': 'bg-purple-100 text-purple-800',
    'Bills': 'bg-red-100 text-red-800',
    'Entertainment': 'bg-pink-100 text-pink-800',
    'Transport': 'bg-blue-100 text-blue-800',
    'Services': 'bg-green-100 text-green-800',
    'Investment': 'bg-yellow-100 text-yellow-800',
    'Gift': 'bg-indigo-100 text-indigo-800',
    'Other': 'bg-gray-100 text-gray-800'
  };

  return colorMap[category] || 'bg-gray-100 text-gray-800';
};