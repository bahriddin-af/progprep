// Parallel slot: @drawer — mavzu ochilganda ustidan chiziladi.
// Ikkalasi ham server komponent va statik generatsiya qilinadi.
export default function RoadmapLayout({
  children,
  drawer,
}: {
  children: React.ReactNode;
  drawer: React.ReactNode;
}) {
  return (
    <>
      {children}
      {drawer}
    </>
  );
}
