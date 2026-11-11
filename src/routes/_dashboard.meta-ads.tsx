import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_dashboard/meta-ads')({
  head: () => ({ meta: [{ title: 'Meta Ads | Hair Transplant Group' }] }),
});
