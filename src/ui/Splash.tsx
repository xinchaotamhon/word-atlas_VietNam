import { useEffect } from "react";

export function shouldShowSplash() {
  return false;
}

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    onDone();
  }, [onDone]);
  return null;
}
