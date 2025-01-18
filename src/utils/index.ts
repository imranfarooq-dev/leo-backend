import { List, ListTree } from '@/types/list';

export const constructListTree = (list: List[]): ListTree[] => {
  if (!list.length) {
    return [];
  }

  // Sort the list based on `next_list_id`
  const sortedLists = sortListsByNextId(list);

  // Create a map of nodes for quick access
  const map = new Map(
    sortedLists.map((item) => [
      item.id,
      { id: item.id, title: item.list_name, children: [] },
    ]),
  );

  // Root array to hold top-level items (those with no parent)
  const root: ListTree[] = [];

  // Iterate through the sorted list to assign items to their parent or root
  sortedLists.forEach((item) => {
    const node = map.get(item.id);

    if (item.parent_list_id === null) {
      root.push(node); // Add to root if no parent
    } else {
      const parent = map.get(item.parent_list_id);
      if (parent) {
        parent.children.push(node); // Add as child to its parent
      }
    }
  });

  return root;
};

export const sortListsByNextId = (list: List[]): List[] => {
  // Map to hold list items by their IDs
  const map = new Map(list.map((item) => [item.id, item]));

  // Find the starting points (items not referenced as `next_list_id`)
  const startItems = list.filter(
    (item) => !list.some((l) => l.next_list_id === item.id),
  );

  // For each start item, follow the chain and sort
  const sorted: List[] = [];
  startItems.forEach((start) => {
    let current = start;
    while (current) {
      sorted.push(current);
      current = current.next_list_id ? map.get(current.next_list_id) : null;
    }
  });

  return sorted;
};

export const calculateUpdatedCredits = (
  creditsToDeduct: number,
  currentMonthlyCredits: number,
  currentLifetimeCredits: number,
) => {
  // First try to deduct from monthly credits
  const remainingMonthlyCredits = Math.max(
    0,
    currentMonthlyCredits - creditsToDeduct,
  );

  // If monthly credits weren't enough, deduct the rest from lifetime
  const deductFromLifetime = Math.max(
    0,
    creditsToDeduct - currentMonthlyCredits,
  );
  const remainingLifetimeCredits = Math.max(
    0,
    currentLifetimeCredits - deductFromLifetime,
  );

  return {
    monthly_credits: remainingMonthlyCredits,
    lifetime_credits: remainingLifetimeCredits,
  };
};
