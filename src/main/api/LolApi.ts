import { Champion } from 'common/Champion';
import { Role } from 'common/Role';
import {
  authenticate,
  request,
  connect,
  LeagueClient,
  Credentials,
} from 'league-connect';
import { Cell, Type } from './entities/Cell';
import { GameSession } from './entities/GameSession';
import { Summoner } from './entities/Summoner';
import { TeamElement } from './entities/TeamElement';

export class LolApi {
  private credentials: Credentials | undefined;
  private isTurnedOn = false;
  private orderedPicks: Champion[] = [];
  private orderedBans: Champion[] = [];
  private summoner: Summoner;
  private expectedRole: Role;
  private gameSession: GameSession = new GameSession(-1, [], -1);

  //this function looks for a cell in action list
  private findCell(
    list: Array<Cell>[],
    cellId: number,
    type?: string,
    isInProgress?: boolean
  ): Cell | null {
    let temp = null;
    let predicate = (cell: Cell) => cell.id === cellId;
    if (type) {
      predicate = (cell: Cell) => predicate(cell) && cell.type === type;
      if (isInProgress !== undefined) {
        predicate = (cell: Cell) => predicate(cell) && cell.isInProgress;
      }
    } else if (isInProgress !== undefined) {
      predicate = (cell: Cell) => predicate(cell) && cell.isInProgress;
    }

    //each item is an array wich contains cells
    list.forEach((item) => {
      item.forEach((cell: Cell) => {
        if (predicate(cell)) temp = cell;
      });
    });

    return temp;
  }

  private findBan(team: TeamElement[]): number {
    let ban = -1;

    //i need to check none of my team wants to pick my intended ban
    // otherwise my intended ban is the next on the list and shall check again

    const intents = [];
    for (let index = 0; index < team.length; index++) {
      const player = team[index];
      intents.push(player.championPickIntent);
    }

    //This should always find an id to ban beacuse it is supposed that the user
    //had input 5 bans
    for (let index = 0; index < this.orderedBans.length; index++) {
      const element = this.orderedBans[index];
      if (!intents.includes(element.id)) {
        ban = element.id;
        break;
      }
    }

    return ban;
  }

  private findPick(): number {
    let pick = -1;
    return pick;
  }

  private handlePickIntent(actions: any, localCellId: number): void {
    let pickIntentAction = this.findCell(actions, localCellId, Type.pick);
    if (pickIntentAction === null) return;
    setTimeout(() => {
      request(
        {
          method: 'PATCH',
          url: '/lol-champ-select/v1/session/actions/' + pickIntentAction?.id,
          body: {
            championId: this.findPick(),
          },
        },
        this.credentials
      );
    }, 50);
  }

  //Constructor
  constructor(
    credentials: Credentials,
    summoner: Summoner,
    orderedPicks: Champion[],
    orderedBans: Champion[],
    expectedRole: Role
  ) {
    this.credentials = credentials;
    this.summoner = summoner;
    this.orderedPicks = orderedPicks;
    this.orderedBans = orderedBans;
    this.expectedRole = expectedRole;
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

      let myTeam = js.data.myTeam;
      localCellId = js.data.localPlayerCellId;

      if (js.gameId !== this.gameSession.getGameId()) {
        this.gameSession = new GameSession(js.gameId, myTeam, localCellId);
      }

      this.gameSession.processData(js.data.actions);

      //SHIT DOWN AUTO PICK IF ROLE IS NOT AS EXPECTED
      //WILL CHANGE LATER WHEN WE HAVE PROFILES
      if (this.expectedRole !== this.gameSession.getRole()) {
        this.isTurnedOn = false;
      }
      /*
        action is the action that is in progress of the player who is tunning this tool
        if there is no action in progress for current player then null is returned
      */
      action = this.findCell(js.data.actions, localCellId, undefined, true);

      //Execute this code only if autopick is turned on
      if (this.isTurnedOn) {
        //We want this code to be here, before returning is action is null
        //because on planning phase no one is in progress
        //PLANNING PHASE
        if (js.data.timer.phase === 'PLANNING') {
          this.handlePickIntent(js.data.actions, localCellId);
          return;
        }

        // If there is no action in progress for current player then return
        if (!action) return;
        let actionId = action.id;

        // BANNING PHASE
        if (action.type == 'ban') {
          if (action.isInProgress) {
            action.championId = this.findBan(myTeam);
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
      }
      // end if turned on
    } catch (e) {
      console.error(e);
    }
  }
}
