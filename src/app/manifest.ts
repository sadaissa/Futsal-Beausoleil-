import type { MetadataRoute } from "next";

/** Manifeste web : nom et icône quand un joueur ajoute le site à son écran d'accueil. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beausoleil Ultimate Team",
    short_name: "Beausoleil UT",
    description: "Votes du foot en salle du lundi et Team of the Week.",
    start_url: "/sessions",
    display: "standalone",
    background_color: "#07090a",
    theme_color: "#07090a",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
