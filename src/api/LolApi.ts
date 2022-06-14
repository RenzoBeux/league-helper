import { Champion } from 'api/entities/Champion';
import { Role } from 'api/entities/Role';
import { request, Credentials } from 'league-connect';
import { Cell, Type } from './entities/Cell';
import { GameSession } from './GameSession';
import { Summoner } from './entities/Summoner';
import { Event } from './MessageTypes/Event';
import { FrontendMessage } from './MessageTypes/FrontendMessage';
import { RawChampion } from './entities/RawChampion';
import { ReadyCheckData } from './entities/ReadyCheckData';

export class LoLApi {
  private credentials: Credentials | undefined;
  private allChampions: RawChampion[];
  private ownedChampions: Champion[];
  private autoPickIsTurnedOn = false;
  private autoAcceptIsTurnedOn = true;
  private summoner: Summoner;
  private orderedPicks: Champion[] = [];
  private orderedBans: Champion[] = [];
  private expectedRole: Role;
  private gameSession: GameSession = new GameSession(-1, [], -1);
  private sendToFrontend: (
    event: Event,
    FrontendMessage: FrontendMessage
  ) => void;

  //this function looks for a cell in action list
  private findCell(
    list: Array<Cell>[],
    cellId: number,
    type?: string,
    isInProgress?: boolean
  ): Cell | null {
    let temp = null;
    let predicate = (cell: Cell) =>
      cell.id === cellId &&
      (type === undefined || cell.type === type) &&
      (isInProgress === undefined || cell.isInProgress === isInProgress);

    //each item is an array wich contains cells
    list.forEach((item) => {
      item.forEach((cell: Cell) => {
        if (predicate(cell)) temp = cell;
      });
    });

    return temp;
  }

  private findBan(): number {
    return this.gameSession.findBan(this.orderedBans);
  }

  private findPick(): number {
    return this.gameSession.findPick(this.orderedPicks);
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

  private doPatch(action: Cell) {
    setTimeout(() => {
      request(
        {
          method: 'PATCH',
          url: '/lol-champ-select/v1/session/actions/' + action.id,
          body: action,
        },
        this.credentials
      );
    }, 500);
  }

  private handleBan(action: Cell) {
    action.championId = this.findBan();
    action.completed = true;
    //TODO: wait for last seconds before finishing the action to let user override it
    this.doPatch(action);
  }

  private handlePick(action: Cell) {
    action.championId = this.findPick();
    action.completed = true;
    this.doPatch(action);
  }
  private async sendUpdate() {
    const role = this.gameSession.getRole();
    const picks = this.gameSession.getPickedChampions();
    const bans = this.gameSession.getBannedChampions();
    const pickedChampions = picks.map((championNumber) =>
      this.allChampions.find((champion) => champion.id === championNumber)
    );
    const bannedChampions = bans.map((championNumber) =>
      this.allChampions.find((champion) => champion.id === championNumber)
    );
    const phase = this.gameSession.getPhase();
    const update: FrontendMessage = {
      pickedChampions,
      bannedChampions,
      role,
      phase,
    };
    this.sendToFrontend(Event.StatusUpdate, update);
  }

  //Constructor
  constructor(
    credentials: Credentials,
    summoner: Summoner,
    orderedPicks: Champion[],
    orderedBans: Champion[],
    expectedRole: Role,
    allChampions: RawChampion[],
    sendToFrontend: (event: Event, FrontendMessage: FrontendMessage) => void
  ) {
    this.credentials = credentials;
    this.summoner = summoner;
    this.orderedPicks = orderedPicks;
    this.orderedBans = orderedBans;
    this.expectedRole = expectedRole;
    this.allChampions = allChampions;
    this.ownedChampions = allChampions.filter(
      (champion) => champion.ownership.owned
    );
    this.sendToFrontend = sendToFrontend;
  }

  switchAutoPick(state: boolean) {
    this.autoPickIsTurnedOn = state;
  }

  isAutoPickOn() {
    return this.autoPickIsTurnedOn;
  }

  isAutoAcceptOn() {
    return this.autoAcceptIsTurnedOn;
  }

  switchAutoAccept(state: boolean) {
    this.autoAcceptIsTurnedOn = state;
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

      //if it is ready check message
      if (js.uri.includes('/lol-matchmaking/v1/ready-check')) {
        const readyData: ReadyCheckData = js.data;
        if (readyData === null) return;
        if (this.autoAcceptIsTurnedOn) {
          if (
            readyData.state === 'InProgress' &&
            readyData.playerResponse === 'None'
          ) {
            //if it is in progress and the player has not responded yet
            // accepts the game
            setTimeout(() => {
              request(
                {
                  method: 'POST',
                  url: '/lol-matchmaking/v1/ready-check/accept',
                },
                this.credentials
              );
            }, 100);
          }
        }
      }

      //if it is a game session message
      if (js.uri.includes('lol-champ-select/v1/session')) {
        if (!js.data.actions[0]) return;

        let myTeam = js.data.myTeam;
        localCellId = js.data.localPlayerCellId;

        if (js.gameId !== this.gameSession.getGameId()) {
          this.gameSession = new GameSession(js.gameId, myTeam, localCellId);
        }

        this.gameSession.processData(js.data.actions);

        //SHUT DOWN AUTO PICK IF ROLE IS NOT AS EXPECTED
        //WILL CHANGE LATER WHEN WE HAVE PROFILES
        if (this.expectedRole !== this.gameSession.getRole()) {
          this.autoPickIsTurnedOn = false;
        }
        /*
          action is the action that is in progress of the player who is running this tool
          if there is no action in progress for current player then null is returned
        */
        action = this.findCell(js.data.actions, localCellId, undefined, true);

        //Execute this code only if autopick is turned on
        if (this.autoPickIsTurnedOn) {
          //We want this code to be here, before returning is action is null
          //because on planning phase no one is in progress
          //PLANNING PHASE
          if (js.data.timer.phase === 'PLANNING') {
            this.handlePickIntent(js.data.actions, localCellId);
            return;
          }

          // If there is no action in progress for current player then return
          if (!action) return;
          //TODO: Change this to use gameSession info
          switch (action.type) {
            case Type.ban:
              this.handleBan(action);
              break;
            case Type.pick:
              this.handlePick(action);
              break;
            default:
              break;
          }
        }
        console.log('---------------------------------------');
        console.log('BANNED!!!', this.gameSession.getBannedChampions());
        console.log('PICKED!!!', this.gameSession.getPickedChampions());
        console.log('ROLE!!!', this.gameSession.getRole());
        console.log('PHASE!!!', this.gameSession.getPhase());
        console.log('---------------------------------------');

        //SEND DATA TO FRONTEND
        this.sendUpdate();
        // end if turned on
      }
    } catch (e) {
      console.error(e);
    }
  }
}
