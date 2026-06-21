import { useEffect } from "react";
import { useRouter } from "next/router";
import { isMarcaConfigurada } from "@/lib/storage";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    // 1º uso (marca nunca configurada) → manda configurar identidade antes de gerar
    router.replace(isMarcaConfigurada() ? "/dashboard" : "/marca");
  }, [router]);
  return null;
}
