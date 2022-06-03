export enum Type {
  ban = 'ban',
  pick = 'pick',
  ten_bans_reveal = 'ten_bans_reveal',
}

export type Cell = {
  actorCellId: number;
  championId: number;
  completed: boolean;
  id: number;
  isAllyAction: boolean;
  isInProgress: boolean;
  type: Type;
};
