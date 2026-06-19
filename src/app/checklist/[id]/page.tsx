import { CHECKLISTS } from '@/checklists';
import ChecklistClientPage from './client-page';

// Pre-generar todas las rutas posibles para static export
export function generateStaticParams() {
  return CHECKLISTS.map((checklist) => ({
    id: checklist.id,
  }));
}

// Server component que renderiza el client component
export default function ChecklistPage() {
  return <ChecklistClientPage />;
}
