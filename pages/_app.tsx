import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import Nav from "@/components/Nav";
import { getMarca } from "@/lib/storage";
import { registrarFontesCustom } from "@/lib/fonts";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => { registrarFontesCustom(getMarca()); }, []);
  return (
    <>
      <Nav />
      <Component {...pageProps} />
    </>
  );
}
