import { useEffect, useState } from "react";

// SSR-safe: começa false (desktop) e atualiza no cliente após montar.
// Evita mismatch de hidratação e reage a resize/rotação.
export function useIsMobile(maxWidth = 900): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    // addEventListener é o padrão moderno; fallback p/ Safari antigo.
    if (mql.addEventListener) mql.addEventListener("change", update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", update);
      else mql.removeListener(update);
    };
  }, [maxWidth]);

  return isMobile;
}

export default useIsMobile;
