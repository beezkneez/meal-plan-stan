const SECTION_KEYWORDS: Record<string, string[]> = {
  Produce: [
    "lettuce", "tomato", "onion", "garlic", "broccoli", "spinach", "kale",
    "pepper", "cucumber", "carrot", "celery", "avocado", "lemon", "lime",
    "mushroom", "zucchini", "squash", "potato", "sweet potato", "corn",
    "green bean", "asparagus", "cabbage", "cauliflower", "ginger", "cilantro",
    "parsley", "basil", "mint", "jalapeño", "banana", "apple", "berries",
    "strawberry", "blueberry", "grape", "orange", "mango", "pineapple",
  ],
  "Meat & Seafood": [
    "chicken", "beef", "pork", "turkey", "ground", "steak", "salmon",
    "shrimp", "tilapia", "cod", "tuna", "sausage", "bacon", "ham",
    "lamb", "brisket", "roast", "thigh", "breast", "tenderloin", "filet",
  ],
  "Dairy & Eggs": [
    "milk", "cheese", "yogurt", "egg", "butter", "cream", "sour cream",
    "cottage cheese", "mozzarella", "parmesan", "cheddar", "cream cheese",
    "whipped cream", "half and half",
  ],
  "Bread & Bakery": [
    "bread", "tortilla", "bun", "roll", "pita", "naan", "bagel",
    "english muffin", "croissant", "wrap",
  ],
  "Canned & Dry Goods": [
    "beans", "rice", "pasta", "noodle", "canned", "broth", "stock",
    "diced tomato", "tomato paste", "tomato sauce", "coconut milk",
    "lentil", "quinoa", "oat", "flour", "sugar", "cornstarch",
    "baking powder", "baking soda", "yeast",
  ],
  "Frozen": [
    "frozen", "ice cream",
  ],
  "Condiments & Sauces": [
    "soy sauce", "hot sauce", "ketchup", "mustard", "mayo", "mayonnaise",
    "vinegar", "worcestershire", "bbq sauce", "salsa", "ranch", "dressing",
    "teriyaki", "sriracha", "honey", "maple syrup", "peanut butter",
  ],
  "Oils & Spices": [
    "olive oil", "vegetable oil", "coconut oil", "sesame oil", "cooking spray",
    "salt", "pepper", "cumin", "paprika", "chili powder", "oregano",
    "thyme", "rosemary", "cinnamon", "nutmeg", "turmeric", "cayenne",
    "garlic powder", "onion powder", "italian seasoning", "bay leaf",
    "red pepper flake",
  ],
  "Snacks & Beverages": [
    "chips", "crackers", "nuts", "almond", "walnut", "pecan", "cashew",
    "protein bar", "protein powder", "coffee", "tea",
  ],
};

export function classifyIngredient(name: string): string {
  const lower = name.toLowerCase();
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return section;
    }
  }
  return "Other";
}

export function getSectionOrder(): string[] {
  return [
    "Produce",
    "Meat & Seafood",
    "Dairy & Eggs",
    "Bread & Bakery",
    "Canned & Dry Goods",
    "Frozen",
    "Condiments & Sauces",
    "Oils & Spices",
    "Snacks & Beverages",
    "Other",
  ];
}
