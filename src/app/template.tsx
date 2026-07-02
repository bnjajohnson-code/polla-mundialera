// App Router re-monta este template en cada navegación, lo que dispara la
// animación CSS de entrada (.page-enter) sin JavaScript adicional.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
