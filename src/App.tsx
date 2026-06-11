import { Shell } from "./components/Shell";
import { StoreProvider } from "./store/StoreProvider";

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
