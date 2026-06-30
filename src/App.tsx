import { useMemo } from 'react';
import { generateInventory } from './data/inventory';
import { InventoryTable } from './components/InventoryTable';

function App() {
  const items = useMemo(() => generateInventory(6000), []);
  return <InventoryTable items={items} />;
}

export default App;
