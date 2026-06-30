import { createSignal } from "solid-js";
import "./App.css";

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <main class="app">
      <h1>Solid + Webpack</h1>
      <p>Edit <code>src/App.tsx</code> and save to reload.</p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        count is {count()}
      </button>
    </main>
  );
}

export default App;
