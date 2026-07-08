import TareaDetailClientPage from './client-page';

// Pre-generar placeholder para static export (las tareas reales vienen dinámicamente)
export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

// Server component que renderiza el client component
export default function TareaDetailPage() {
  return <TareaDetailClientPage />;
}
