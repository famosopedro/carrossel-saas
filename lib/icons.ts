// Conjunto curado de ícones para a variante "lista com ícones".
// Sem dependência externa: paths SVG (viewBox 24×24, traço) que herdam
// `currentColor`, então tingem com o tema/verde da marca automaticamente.
// `label` é o nome acessível (PT) usado no seletor e no aria-label.

export type IconeDef = { id: string; label: string; path: string };

export const ICONES: IconeDef[] = [
  { id: "check", label: "Confirmar", path: "M20 6 9 17l-5-5" },
  { id: "star", label: "Estrela", path: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.8 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" },
  { id: "bolt", label: "Raio", path: "M13 2 4 14h7l-1 8 9-12h-7z" },
  { id: "heart", label: "Coração", path: "M19 14c1.5-1.5 2-3.4 2-5a4.5 4.5 0 0 0-8.5-2A4.5 4.5 0 0 0 4 9c0 1.6.5 3.5 2 5l6 6z" },
  { id: "target", label: "Alvo", path: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  { id: "rocket", label: "Foguete", path: "M5 15c-1.5 1-2 5-2 5s4-.5 5-2c.6-.9.5-2-.3-2.7-.8-.8-1.8-.9-2.7-.3zM9 13l-2-2c1-4 4-8 9-8 0 5-4 8-8 9zM14 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  { id: "lightbulb", label: "Ideia", path: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" },
  { id: "shield", label: "Escudo", path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { id: "clock", label: "Tempo", path: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" },
  { id: "chat", label: "Conversa", path: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" },
  { id: "trending", label: "Crescimento", path: "M3 17l6-6 4 4 8-8M21 7v5h-5" },
  { id: "dollar", label: "Dinheiro", path: "M12 2v20M16 6.5c0-1.9-1.8-3-4-3s-4 1.1-4 3 1.8 2.8 4 3.2 4 1.3 4 3.3-1.8 3-4 3-4-1.1-4-3" },
  { id: "users", label: "Pessoas", path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1A4 4 0 0 1 16 11" },
  { id: "gift", label: "Presente", path: "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" },
  { id: "flag", label: "Bandeira", path: "M4 22V4M4 4s1-1 4-1 4 2 7 2 3-1 4-1v11c-1 0-1 1-4 1s-4-2-7-2-4 1-4 1" },
  { id: "x", label: "Evitar", path: "M18 6 6 18M6 6l12 12" },
];

export const ICONE_PADRAO = "check";

export function getIcone(id: string): IconeDef {
  return ICONES.find((i) => i.id === id) ?? ICONES[0];
}
