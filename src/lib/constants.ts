export const CONSTANTS = {
  // Humans
  PEOPLE_PER_HH: {
    MALE: 1,
    FEMALE: 1,
    CHILDREN: 2.5,
  },
  CALORIES_PER_DAY: {
    MALE: 2500,
    FEMALE: 2000,
    CHILD: 1600, // 2.5 * 1600 = 4000
  },
  
  // Animals (per HH)
  ANIMALS_PER_HH: {
    OXEN: 2,
    COWS: 2,
    SHEEP: 4, 
  },

  // Animal Feed Needs (per month)
  // Measured in "feed units" equivalent to bushels of oats
  FEED_NEEDS: {
    OXEN_OATS_WINTER: 3, // Bushels per month
    OXEN_HAY_WINTER: 0.5, // "Hay tons" per month
    COW_OATS_WINTER: 2, 
    COW_HAY_WINTER: 0.5,
    SHEEP_HAY_WINTER: 0.1, // Only late winter
  },

  // Productivity
  DAIRY_KCAL_PER_MONTH: 25000, // Per producing cow/sheep equivalent 
  MEAT_KCAL_PER_SHEEP: 40000,
  
  // Crops
  CROPS: {
    WHEAT: { kcalPerBu: 90000, seedRate: 2 }, // 60 lbs * 1500 kcal
    BARLEY: { kcalPerBu: 75000, seedRate: 2.5 }, // 50 lbs * 1500 kcal
    OATS: { kcalPerBu: 38000, seedRate: 4 }, // 32 lbs * 1200 kcal
  }
};
