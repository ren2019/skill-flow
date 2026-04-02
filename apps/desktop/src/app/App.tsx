import { getRouteInventory } from "./routes";

export function App() {
  const routes = getRouteInventory();

  return (
    <main>
      <h1>Skill Flow Desktop</h1>
      <p>Cross-platform desktop shell scaffold.</p>
      <section aria-label="Route inventory">
        <h2>Routes</h2>
        <ul>
          {routes.map((route) => (
            <li key={route}>
              <code>{route}</code>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
