import { ListDB, ListTree } from '@/types/list';

export const constructListTree = (list: ListDB[]): ListTree[] => {
  if (!list.length) {
    return [];
  }

  const sortedLists = sortListsByOrder(list);

  // Create a map of nodes for quick access
  const map = new Map(
    sortedLists.map((item) => [
      item.id,
      { id: item.id, list_name: item.list_name, children: [] },
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

export const sortListsByOrder = (list: ListDB[]): ListDB[] => {
  return [...list].sort((a, b) => a.order - b.order);
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
