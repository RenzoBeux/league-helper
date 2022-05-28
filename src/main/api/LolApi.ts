import { Champion } from 'common/Champion';
import {
  authenticate,
  request,
  connect,
  LeagueClient,
  Credentials,
} from 'league-connect';
import { Cell } from './entities/Cell';
import { Summoner } from './entities/Summoner';

export class LolApi {
  private credentials: Credentials | undefined;
  private isTurnedOn = false;
  private orderedPicks: Champion[] = [];
  private orderedBans: Champion[] = [];
  private summoner: Summoner;

  //this function looks for pick cell in action list
  private findCell(list: Array<Cell>[], cellId: number): Cell | null {
    let temp = null;
    //each item is an array wich contains cells
    list.forEach((item) => {
      item.forEach((cell: Cell) => {
        if (cell.isInProgress === true && cell.actorCellId == cellId)
          temp = cell;
      });
    });
    return temp;
  }

  private findBan(): number {
    let ban = -1;
    return ban;
  }

  private findPick(): number {
    let pick = -1;
    return pick;
  }

  //Constructor
  constructor(
    credentials: Credentials,
    summoner: Summoner,
    orderedPicks: Champion[],
    orderedBans: Champion[]
  ) {
    this.credentials = credentials;
    this.summoner = summoner;
    this.orderedPicks = orderedPicks;
    this.orderedBans = orderedBans;
  }

  switch(state: boolean) {
    this.isTurnedOn = state;
  }

  isOn() {
    return this.isTurnedOn;
  }

  setPicks(picks: Champion[]): void {
    this.orderedPicks = picks;
  }

  setBans(bans: Champion[]): void {
    this.orderedBans = bans;
  }

  //data is stringified json array
  async handleWebSocket(data: string) {
    let action: Cell | null;
    let localCellId: number;
    try {
      //GET SOME DATA
      let js = JSON.parse(data)[2];
      //We only want this endpoint
      if (!js.uri.includes('lol-champ-select/v1/session')) return;

      if (!js.data.actions[0]) return;
      localCellId = js.data.localPlayerCellId;
      action = this.findCell(js.data.actions, localCellId);
      if (!action) return;
      let actionId = action.id;

      if (js.data.timer.phase === 'PLANNING') {
        setTimeout(() => {
          request(
            {
              method: 'PATCH',
              url: '/lol-champ-select/v1/session/my-selection',
              body: action,
            },
            this.credentials
          );
        }, 50);
        return;
      }

      // BANNING PHASE
      if (action.type == 'ban') {
        if (action.isInProgress) {
          action.championId = this.findBan();
          action.completed = true;
          setTimeout(() => {
            request(
              {
                method: 'PATCH',
                url: '/lol-champ-select/v1/session/actions/' + actionId,
                body: action,
              },
              this.credentials
            );
          }, 50);
        }
        return;
      }
      // PICKING PHASE
      if (action.type == 'pick') {
        if (action.isInProgress) {
          action.championId = this.findPick();
          action.completed = true;
          setTimeout(() => {
            request(
              {
                method: 'PATCH',
                url: '/lol-champ-select/v1/session/actions/' + actionId,
                body: action,
              },
              this.credentials
            );
          }, 50);
        }
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
}
