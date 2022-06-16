export type RawChampion = {
  active: boolean;
  alias: string;
  banVoPath: string;
  baseLoadScreenPath: string;
  baseSplashPath: string;
  botEnabled: boolean;
  chooseVoPath: string;
  disabledQueues: string[];
  freeToPlay: boolean;
  id: number;
  name: string;
  ownership: {
    freeToPlayReward: boolean;
    owned: boolean;
    rental: {
      endDate: number;
      purchaseDate: number;
      rented: boolean;
      winCountRemaining: number;
    };
  };
  passive: {
    description: string;
    name: string;
  };
  purchased: number;
  rankedPlayEnabled: boolean;
  roles: string[];
  skins: [];
  spells: {
    description: string;
    name: string;
  }[];
  squarePortraitPath: string;
  stingerSfxPath: string;
  tacticalInfo: {
    damageType: string;
    difficulty: number;
    style: number;
  };
  title: string;
};
