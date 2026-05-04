import { useState, useEffect } from 'react';
import { counterAPI } from '../api/counter';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    counterAPI.get().then(setCount);
  }, []);

  const handleIncrement = async () => {
    const newCount = await counterAPI.increment();
    setCount(newCount);
  };

  return (
    <div>
      <h1>Hello World!</h1>
      <p>Welcome to your React Electron application.</p>
      <p>Count: {count}</p>
      <button onClick={handleIncrement}>Increment</button>
    </div>
  );
}

export default App;