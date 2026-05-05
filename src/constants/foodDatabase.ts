// src/constants/foodDatabase.ts
export interface LocalFood {
  id: string
  name: string
  category: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export const FOOD_DATABASE: LocalFood[] = [
  // ── Getreide & Brot ──────────────────────────────────────────────
  { id: 'l001', name: 'Haferflocken', category: 'Getreide', kcal: 366, protein: 13.5, carbs: 58.7, fat: 7.0 },
  { id: 'l002', name: 'Vollkornbrot', category: 'Brot', kcal: 220, protein: 8.5, carbs: 38.0, fat: 2.5 },
  { id: 'l003', name: 'Weißbrot', category: 'Brot', kcal: 265, protein: 8.0, carbs: 50.0, fat: 2.0 },
  { id: 'l004', name: 'Toastbrot', category: 'Brot', kcal: 265, protein: 8.0, carbs: 50.0, fat: 3.5 },
  { id: 'l005', name: 'Reis (gekocht)', category: 'Getreide', kcal: 130, protein: 2.7, carbs: 28.0, fat: 0.3 },
  { id: 'l006', name: 'Nudeln (gekocht)', category: 'Getreide', kcal: 131, protein: 4.5, carbs: 26.0, fat: 0.5 },
  { id: 'l007', name: 'Vollkornnudeln (gekocht)', category: 'Getreide', kcal: 124, protein: 5.3, carbs: 23.0, fat: 0.8 },
  { id: 'l008', name: 'Quinoa (gekocht)', category: 'Getreide', kcal: 120, protein: 4.4, carbs: 21.3, fat: 1.9 },
  { id: 'l009', name: 'Weizen (Körner)', category: 'Getreide', kcal: 339, protein: 13.7, carbs: 60.4, fat: 2.5 },
  { id: 'l010', name: 'Müsli', category: 'Getreide', kcal: 370, protein: 10.0, carbs: 62.0, fat: 8.0 },

  // ── Fleisch ──────────────────────────────────────────────────────
  { id: 'l011', name: 'Hähnchenbrust (roh)', category: 'Fleisch', kcal: 110, protein: 23.0, carbs: 0.0, fat: 1.5 },
  { id: 'l012', name: 'Hähnchenbrust (gekocht)', category: 'Fleisch', kcal: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
  { id: 'l013', name: 'Rinderhack (roh)', category: 'Fleisch', kcal: 215, protein: 17.0, carbs: 0.0, fat: 16.0 },
  { id: 'l014', name: 'Rinderfilet', category: 'Fleisch', kcal: 142, protein: 22.0, carbs: 0.0, fat: 5.5 },
  { id: 'l015', name: 'Schweinefleisch (mager)', category: 'Fleisch', kcal: 121, protein: 21.0, carbs: 0.0, fat: 3.8 },
  { id: 'l016', name: 'Putenbrust', category: 'Fleisch', kcal: 107, protein: 24.0, carbs: 0.0, fat: 0.9 },
  { id: 'l017', name: 'Salami', category: 'Fleisch', kcal: 380, protein: 22.0, carbs: 1.0, fat: 32.0 },
  { id: 'l018', name: 'Kochschinken', category: 'Fleisch', kcal: 107, protein: 17.0, carbs: 1.0, fat: 3.5 },

  // ── Fisch & Meeresfrüchte ────────────────────────────────────────
  { id: 'l019', name: 'Lachs (roh)', category: 'Fisch', kcal: 208, protein: 20.0, carbs: 0.0, fat: 13.5 },
  { id: 'l020', name: 'Thunfisch (Dose, in Wasser)', category: 'Fisch', kcal: 116, protein: 26.0, carbs: 0.0, fat: 1.0 },
  { id: 'l021', name: 'Forelle', category: 'Fisch', kcal: 135, protein: 21.0, carbs: 0.0, fat: 5.5 },
  { id: 'l022', name: 'Makrele', category: 'Fisch', kcal: 205, protein: 19.0, carbs: 0.0, fat: 14.0 },
  { id: 'l023', name: 'Garnelen', category: 'Fisch', kcal: 71, protein: 15.0, carbs: 0.7, fat: 0.9 },
  { id: 'l024', name: 'Kabeljau', category: 'Fisch', kcal: 82, protein: 18.0, carbs: 0.0, fat: 0.7 },

  // ── Eier & Milchprodukte ─────────────────────────────────────────
  { id: 'l025', name: 'Ei (Hühnerei, groß)', category: 'Eier & Milch', kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  { id: 'l026', name: 'Vollmilch (3,5%)', category: 'Eier & Milch', kcal: 64, protein: 3.3, carbs: 4.8, fat: 3.5 },
  { id: 'l027', name: 'Magermilch', category: 'Eier & Milch', kcal: 34, protein: 3.4, carbs: 4.9, fat: 0.1 },
  { id: 'l028', name: 'Joghurt (Natur, 3,5%)', category: 'Eier & Milch', kcal: 61, protein: 3.8, carbs: 4.7, fat: 3.0 },
  { id: 'l029', name: 'Magerquark', category: 'Eier & Milch', kcal: 67, protein: 12.0, carbs: 4.1, fat: 0.3 },
  { id: 'l030', name: 'Speisequark (20%)', category: 'Eier & Milch', kcal: 106, protein: 11.1, carbs: 3.7, fat: 5.0 },
  { id: 'l031', name: 'Skyr', category: 'Eier & Milch', kcal: 63, protein: 11.0, carbs: 4.0, fat: 0.2 },
  { id: 'l032', name: 'Cheddar', category: 'Eier & Milch', kcal: 403, protein: 25.0, carbs: 0.1, fat: 33.0 },
  { id: 'l033', name: 'Gouda', category: 'Eier & Milch', kcal: 356, protein: 26.0, carbs: 0.5, fat: 27.0 },
  { id: 'l034', name: 'Mozzarella', category: 'Eier & Milch', kcal: 254, protein: 18.0, carbs: 2.5, fat: 19.0 },
  { id: 'l035', name: 'Sahne (30%)', category: 'Eier & Milch', kcal: 292, protein: 2.1, carbs: 3.3, fat: 30.0 },
  { id: 'l036', name: 'Butter', category: 'Eier & Milch', kcal: 741, protein: 0.7, carbs: 0.6, fat: 81.0 },
  { id: 'l037', name: 'Hüttenkäse', category: 'Eier & Milch', kcal: 98, protein: 11.1, carbs: 3.4, fat: 4.3 },
  { id: 'l038', name: 'Griechischer Joghurt (0%)', category: 'Eier & Milch', kcal: 59, protein: 10.3, carbs: 3.6, fat: 0.4 },

  // ── Gemüse ───────────────────────────────────────────────────────
  { id: 'l039', name: 'Brokkoli', category: 'Gemüse', kcal: 34, protein: 2.8, carbs: 4.4, fat: 0.4 },
  { id: 'l040', name: 'Spinat', category: 'Gemüse', kcal: 23, protein: 2.9, carbs: 1.6, fat: 0.4 },
  { id: 'l041', name: 'Karotte', category: 'Gemüse', kcal: 41, protein: 0.9, carbs: 7.9, fat: 0.2 },
  { id: 'l042', name: 'Tomate', category: 'Gemüse', kcal: 18, protein: 0.9, carbs: 3.1, fat: 0.2 },
  { id: 'l043', name: 'Gurke', category: 'Gemüse', kcal: 15, protein: 0.7, carbs: 2.2, fat: 0.1 },
  { id: 'l044', name: 'Paprika (rot)', category: 'Gemüse', kcal: 31, protein: 1.0, carbs: 5.4, fat: 0.3 },
  { id: 'l045', name: 'Zwiebel', category: 'Gemüse', kcal: 40, protein: 1.1, carbs: 8.6, fat: 0.1 },
  { id: 'l046', name: 'Knoblauch', category: 'Gemüse', kcal: 149, protein: 6.4, carbs: 28.0, fat: 0.5 },
  { id: 'l047', name: 'Kartoffel (gekocht)', category: 'Gemüse', kcal: 77, protein: 2.1, carbs: 17.0, fat: 0.1 },
  { id: 'l048', name: 'Süßkartoffel', category: 'Gemüse', kcal: 86, protein: 1.6, carbs: 20.0, fat: 0.1 },
  { id: 'l049', name: 'Mais', category: 'Gemüse', kcal: 86, protein: 3.2, carbs: 18.7, fat: 1.2 },
  { id: 'l050', name: 'Erbsen', category: 'Gemüse', kcal: 81, protein: 5.4, carbs: 10.6, fat: 0.4 },
  { id: 'l051', name: 'Zucchini', category: 'Gemüse', kcal: 17, protein: 1.2, carbs: 2.4, fat: 0.3 },
  { id: 'l052', name: 'Aubergine', category: 'Gemüse', kcal: 25, protein: 1.0, carbs: 3.5, fat: 0.2 },
  { id: 'l053', name: 'Champignons', category: 'Gemüse', kcal: 22, protein: 3.1, carbs: 0.5, fat: 0.3 },
  { id: 'l054', name: 'Eisbergsalat', category: 'Gemüse', kcal: 14, protein: 1.0, carbs: 1.5, fat: 0.2 },

  // ── Obst ─────────────────────────────────────────────────────────
  { id: 'l055', name: 'Banane', category: 'Obst', kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { id: 'l056', name: 'Apfel', category: 'Obst', kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  { id: 'l057', name: 'Orange', category: 'Obst', kcal: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
  { id: 'l058', name: 'Erdbeeren', category: 'Obst', kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { id: 'l059', name: 'Blaubeeren', category: 'Obst', kcal: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
  { id: 'l060', name: 'Mango', category: 'Obst', kcal: 60, protein: 0.8, carbs: 15.0, fat: 0.4 },
  { id: 'l061', name: 'Avocado', category: 'Obst', kcal: 160, protein: 2.0, carbs: 2.0, fat: 15.0 },
  { id: 'l062', name: 'Weintrauben', category: 'Obst', kcal: 69, protein: 0.6, carbs: 18.1, fat: 0.2 },
  { id: 'l063', name: 'Wassermelone', category: 'Obst', kcal: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { id: 'l064', name: 'Kiwi', category: 'Obst', kcal: 61, protein: 1.1, carbs: 15.0, fat: 0.5 },

  // ── Nüsse & Samen ────────────────────────────────────────────────
  { id: 'l065', name: 'Mandeln', category: 'Nüsse', kcal: 579, protein: 21.0, carbs: 22.0, fat: 50.0 },
  { id: 'l066', name: 'Walnüsse', category: 'Nüsse', kcal: 654, protein: 15.0, carbs: 14.0, fat: 65.0 },
  { id: 'l067', name: 'Cashews', category: 'Nüsse', kcal: 553, protein: 18.0, carbs: 30.0, fat: 44.0 },
  { id: 'l068', name: 'Erdnüsse', category: 'Nüsse', kcal: 567, protein: 26.0, carbs: 16.0, fat: 49.0 },
  { id: 'l069', name: 'Erdnussbutter', category: 'Nüsse', kcal: 588, protein: 25.0, carbs: 20.0, fat: 50.0 },
  { id: 'l070', name: 'Chiasamen', category: 'Nüsse', kcal: 486, protein: 17.0, carbs: 42.0, fat: 31.0 },
  { id: 'l071', name: 'Leinsamen', category: 'Nüsse', kcal: 534, protein: 18.3, carbs: 29.0, fat: 42.0 },
  { id: 'l072', name: 'Sonnenblumenkerne', category: 'Nüsse', kcal: 584, protein: 21.0, carbs: 20.0, fat: 51.0 },
  { id: 'l073', name: 'Kürbiskerne', category: 'Nüsse', kcal: 559, protein: 30.0, carbs: 11.0, fat: 49.0 },

  // ── Hülsenfrüchte ────────────────────────────────────────────────
  { id: 'l074', name: 'Kichererbsen (gekocht)', category: 'Hülsenfrüchte', kcal: 164, protein: 8.9, carbs: 27.0, fat: 2.6 },
  { id: 'l075', name: 'Linsen (gekocht)', category: 'Hülsenfrüchte', kcal: 116, protein: 9.0, carbs: 20.0, fat: 0.4 },
  { id: 'l076', name: 'Schwarze Bohnen (gekocht)', category: 'Hülsenfrüchte', kcal: 132, protein: 8.9, carbs: 24.0, fat: 0.5 },
  { id: 'l077', name: 'Edamame', category: 'Hülsenfrüchte', kcal: 122, protein: 11.0, carbs: 9.0, fat: 5.2 },
  { id: 'l078', name: 'Tofu', category: 'Hülsenfrüchte', kcal: 76, protein: 8.0, carbs: 1.9, fat: 4.8 },

  // ── Öle & Fette ──────────────────────────────────────────────────
  { id: 'l079', name: 'Olivenöl', category: 'Öle', kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: 'l080', name: 'Kokosöl', category: 'Öle', kcal: 892, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: 'l081', name: 'Rapsöl', category: 'Öle', kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },

  // ── Protein & Sporternährung ─────────────────────────────────────
  { id: 'l082', name: 'Whey Protein (Pulver)', category: 'Protein', kcal: 380, protein: 80.0, carbs: 6.0, fat: 5.0 },
  { id: 'l083', name: 'Casein Protein (Pulver)', category: 'Protein', kcal: 370, protein: 78.0, carbs: 8.0, fat: 3.0 },
  { id: 'l084', name: 'Protein Bar (Beispiel)', category: 'Protein', kcal: 210, protein: 20.0, carbs: 20.0, fat: 7.0 },

  // ── Getränke ─────────────────────────────────────────────────────
  { id: 'l085', name: 'Orangensaft', category: 'Getränke', kcal: 45, protein: 0.7, carbs: 10.4, fat: 0.2 },
  { id: 'l086', name: 'Hafermilch', category: 'Getränke', kcal: 47, protein: 1.0, carbs: 8.5, fat: 1.5 },
  { id: 'l087', name: 'Mandelmilch', category: 'Getränke', kcal: 17, protein: 0.6, carbs: 1.6, fat: 1.1 },
  { id: 'l088', name: 'Sojamilch', category: 'Getränke', kcal: 33, protein: 3.3, carbs: 2.8, fat: 1.8 },
  { id: 'l089', name: 'Bier (0,33l)', category: 'Getränke', kcal: 153, protein: 1.3, carbs: 13.0, fat: 0.0 },
  { id: 'l090', name: 'Rotwein (150ml)', category: 'Getränke', kcal: 125, protein: 0.1, carbs: 3.8, fat: 0.0 },

  // ── Fertiggerichte & Fast Food ───────────────────────────────────
  { id: 'l091', name: 'Pizza Margherita (Stück)', category: 'Fertiggerichte', kcal: 266, protein: 11.0, carbs: 33.0, fat: 10.0 },
  { id: 'l092', name: 'Burger (klassisch)', category: 'Fertiggerichte', kcal: 295, protein: 17.0, carbs: 24.0, fat: 14.0 },
  { id: 'l093', name: 'Pommes Frites', category: 'Fertiggerichte', kcal: 312, protein: 3.4, carbs: 41.0, fat: 15.0 },
  { id: 'l094', name: 'Döner Kebab', category: 'Fertiggerichte', kcal: 230, protein: 14.0, carbs: 22.0, fat: 9.0 },

  // ── Süßes & Snacks ───────────────────────────────────────────────
  { id: 'l095', name: 'Dunkle Schokolade (85%)', category: 'Süßes', kcal: 598, protein: 8.0, carbs: 24.0, fat: 53.0 },
  { id: 'l096', name: 'Milchschokolade', category: 'Süßes', kcal: 535, protein: 8.0, carbs: 59.0, fat: 30.0 },
  { id: 'l097', name: 'Honig', category: 'Süßes', kcal: 304, protein: 0.3, carbs: 82.0, fat: 0.0 },
  { id: 'l098', name: 'Marmelade', category: 'Süßes', kcal: 250, protein: 0.4, carbs: 65.0, fat: 0.1 },
  { id: 'l099', name: 'Chips (Kartoffel)', category: 'Süßes', kcal: 536, protein: 7.0, carbs: 53.0, fat: 35.0 },
  { id: 'l100', name: 'Naturjoghurt mit Früchten', category: 'Süßes', kcal: 90, protein: 3.5, carbs: 14.0, fat: 2.5 },
]

export function searchLocalFoods(query: string): LocalFood[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return FOOD_DATABASE
    .filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    )
    .slice(0, 10)
}