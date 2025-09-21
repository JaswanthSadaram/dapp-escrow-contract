// AI categorization utility using Gemini API

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Available transaction categories
export const TRANSACTION_CATEGORIES = [
  'Food',
  'Shopping', 
  'Bills',
  'Entertainment',
  'Transport',
  'Services',
  'Investment',
  'Gift',
  'Other'
];

/**
 * Categorize a transaction message using Gemini AI
 * @param {string} message - Transaction message to categorize
 * @returns {Promise<string>} Category name
 */
export const categorizeTransaction = async (message) => {
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
          maxOutputTokens: 10,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const category = data.candidates[0].content.parts[0].text.trim();
      
      // Validate that the returned category is in our list
      if (TRANSACTION_CATEGORIES.includes(category)) {
        return category;
      }
    }
    
    // If AI response is invalid, use fallback
    return fallbackCategorization(message);
    
  } catch (error) {
    console.error('AI categorization failed:', error);
    return fallbackCategorization(message);
  }
};

/**
 * Fallback categorization using keyword matching
 * @param {string} message - Transaction message
 * @returns {string} Category name
 */
const fallbackCategorization = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Define keyword patterns for each category
  const categoryPatterns = {
    'Food': ['food', 'restaurant', 'cafe', 'dinner', 'lunch', 'breakfast', 'meal', 'pizza', 'coffee', 'grocery', 'supermarket'],
    'Shopping': ['shop', 'buy', 'purchase', 'store', 'retail', 'amazon', 'ebay', 'clothing', 'shoes', 'electronics'],
    'Bills': ['bill', 'utility', 'rent', 'mortgage', 'insurance', 'subscription', 'internet', 'phone', 'electricity', 'gas', 'water'],
    'Entertainment': ['movie', 'cinema', 'theater', 'concert', 'game', 'entertainment', 'streaming', 'netflix', 'spotify', 'youtube'],
    'Transport': ['transport', 'taxi', 'uber', 'lyft', 'bus', 'train', 'flight', 'travel', 'fuel', 'gas', 'parking', 'ticket'],
    'Services': ['service', 'work', 'design', 'development', 'consulting', 'freelance', 'contract', 'repair', 'maintenance', 'cleaning'],
    'Investment': ['investment', 'crypto', 'stock', 'trade', 'bitcoin', 'ethereum', 'ada', 'cardano', 'portfolio', 'savings'],
    'Gift': ['gift', 'present', 'birthday', 'anniversary', 'wedding', 'christmas', 'holiday', 'donation', 'charity', 'tip']
  };
  
  // Check each category for keyword matches
  for (const [category, keywords] of Object.entries(categoryPatterns)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return category;
    }
  }
  
  // Default category if no keywords match
  return 'Other';
};

/**
 * Get category color for UI display
 * @param {string} category - Category name
 * @returns {string} Color name for MUI
 */
export const getCategoryColor = (category) => {
  const colorMap = {
    'Food': 'success',
    'Shopping': 'primary',
    'Bills': 'warning',
    'Entertainment': 'secondary',
    'Transport': 'info',
    'Services': 'primary',
    'Investment': 'success',
    'Gift': 'secondary',
    'Other': 'default'
  };
  
  return colorMap[category] || 'default';
};

/**
 * Get category icon for UI display
 * @param {string} category - Category name
 * @returns {string} Icon name
 */
export const getCategoryIcon = (category) => {
  const iconMap = {
    'Food': 'Restaurant',
    'Shopping': 'ShoppingCart',
    'Bills': 'Receipt',
    'Entertainment': 'Movie',
    'Transport': 'DirectionsCar',
    'Services': 'Build',
    'Investment': 'TrendingUp',
    'Gift': 'CardGiftcard',
    'Other': 'Category'
  };
  
  return iconMap[category] || 'Category';
};

/**
 * Analyze transaction patterns and provide insights
 * @param {Array} transactions - Array of categorized transactions
 * @returns {Object} Transaction insights
 */
export const analyzeTransactionPatterns = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalSpent: 0,
      categoryBreakdown: {},
      topCategory: 'None',
      averageTransaction: 0,
      transactionCount: 0
    };
  }
  
  const categoryTotals = {};
  let totalSpent = 0;
  
  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount);
    totalSpent += amount;
    
    if (categoryTotals[tx.category]) {
      categoryTotals[tx.category] += amount;
    } else {
      categoryTotals[tx.category] = amount;
    }
  });
  
  const topCategory = Object.keys(categoryTotals).reduce((a, b) => 
    categoryTotals[a] > categoryTotals[b] ? a : b
  );
  
  return {
    totalSpent: totalSpent.toFixed(2),
    categoryBreakdown: categoryTotals,
    topCategory,
    averageTransaction: (totalSpent / transactions.length).toFixed(2),
    transactionCount: transactions.length
  };
};