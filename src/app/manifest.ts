import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BrewLog",
    short_name: "BrewLog",
    description: "Private brew journal",
    start_url: "/brews",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#18181b",
    icons: [],
  };
}
