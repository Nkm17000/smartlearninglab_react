// Run in mongosh after the taxonomy backend patch.
// Uses separate collections: categories and subcategories.

use smart_learning_lab;

db.categories.createIndex(
  { name: 1 },
  { unique: true, name: 'ux_categories_name' }
);

db.categories.createIndex(
  { is_active: 1, name: 1 },
  { name: 'ix_categories_active_name' }
);

db.subcategories.createIndex(
  { category_id: 1, name: 1 },
  { unique: true, name: 'ux_subcategories_category_name' }
);

db.subcategories.createIndex(
  { category_id: 1, is_active: 1, name: 1 },
  { name: 'ix_subcategories_category_active_name' }
);

print('Taxonomy indexes created.');
