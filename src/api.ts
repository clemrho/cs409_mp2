import axios from 'axios';

// TheMealDB client
export const mealApi = axios.create({
  baseURL: 'https://www.themealdb.com/api/json/v1/1',
});

export type MealSummary = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
};

export type Meal = MealSummary & {
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strTags: string | null; // comma separated
  // Ingredients/Measures fields strIngredient1..20, strMeasure1..20
  [key: string]: string | null;
};

export type Category = {
  idCategory: string;
  strCategory: string;
  strCategoryThumb: string;
  strCategoryDescription: string;
};

export async function searchMealsByName(q: string) {
  const { data } = await mealApi.get<{ meals: Meal[] | null }>(`/search.php`, { params: { s: q } });
  return data.meals ?? [];
}

export async function listMealsByFirstLetter(letter: string) {
  const { data } = await mealApi.get<{ meals: Meal[] | null }>(`/search.php`, { params: { f: letter } });
  return data.meals ?? [];
}

export async function lookupMealById(id: string) {
  const { data } = await mealApi.get<{ meals: Meal[] | null }>(`/lookup.php`, { params: { i: id } });
  return (data.meals ?? [])[0] ?? null;
}

export async function randomMeal() {
  const { data } = await mealApi.get<{ meals: Meal[] }>(`/random.php`);
  return data.meals[0];
}

export async function listCategories() {
  const { data } = await mealApi.get<{ categories: Category[] }>(`/categories.php`);
  return data.categories;
}

export async function listAllCategories() {
  const { data } = await mealApi.get<{ meals: { strCategory: string }[] }>(`/list.php`, { params: { c: 'list' } });
  return data.meals.map((m) => m.strCategory);
}

export async function filterByCategory(category: string) {
  const { data } = await mealApi.get<{ meals: MealSummary[] | null }>(`/filter.php`, { params: { c: category } });
  return data.meals ?? [];
}

export async function listAllAreas() {
  const { data } = await mealApi.get<{ meals: { strArea: string }[] }>(`/list.php`, { params: { a: 'list' } });
  return data.meals.map((m) => m.strArea);
}

export async function filterByArea(area: string) {
  const { data } = await mealApi.get<{ meals: MealSummary[] | null }>(`/filter.php`, { params: { a: area } });
  return data.meals ?? [];
}

export function getIngredientList(meal: Meal) {
  const list: { ingredient: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (meal as any)[`strIngredient${i}`];
    const meas = (meal as any)[`strMeasure${i}`];
    if (ing && ing.trim()) list.push({ ingredient: ing.trim(), measure: (meas || '').trim() });
  }
  return list;
}


