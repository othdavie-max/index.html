"use client";
import { useGame } from "./store";
import { HomeScreen } from "./screens/Home";
import { LifeScreen } from "./screens/Life";
import { MapScreen } from "./screens/MapScreen";
import { PoliticsScreen } from "./screens/Politics";
import { ElectionsScreen } from "./screens/Elections";
import { GovernmentScreen } from "./screens/Government";
import { EconomyScreen } from "./screens/Economy";
import { NewsScreen, SettingsScreen } from "./screens/NewsSettings";

export function Screens() {
  const { tab } = useGame();
  switch (tab) {
    case "home": return <HomeScreen />;
    case "life": return <LifeScreen />;
    case "map": return <MapScreen />;
    case "politics": return <PoliticsScreen />;
    case "elections": return <ElectionsScreen />;
    case "government": return <GovernmentScreen />;
    case "economy": return <EconomyScreen />;
    case "news": return <NewsScreen />;
    case "settings": return <SettingsScreen />;
  }
}
