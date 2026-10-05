import { useEffect } from "react";
import {
  initializeAds,
  removeHomeBanner,
  showHomeBanner,
} from "../services/admob";

export default function HomeBanner() {
  useEffect(() => {
    let active = true;

    async function startBanner() {
      try {
        await initializeAds();

        if (active) {
          await showHomeBanner();
        }
      } catch (error) {
        console.error("Banner 廣告載入失敗：", error);
      }
    }

    startBanner();

    return () => {
      active = false;
      removeHomeBanner().catch(() => {});
    };
  }, []);

  return <div className="home-banner-space" aria-label="廣告" />;
}