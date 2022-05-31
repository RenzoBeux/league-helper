import { Phase } from 'common/Phase';
import { Role } from 'common/Role';
import { Cell, Type } from './Cell';
import { TeamElement } from './TeamElement';

export class GameSession {
  private gameId: number;
  private bannedChampions: Set<number> = new Set();
  private pickedChampions: Set<number> = new Set();
  private role: Role = Role.Support;
  private myTeam: TeamElement[];
  private phase: Phase = Phase.Banning;

  constructor(gameId: number, myTeam: TeamElement[], localCellId: number) {
    this.gameId = gameId;
    this.myTeam = myTeam;
    for (let index = 0; index < myTeam.length; index++) {
      const element = myTeam[index];
      if (element.cellId === localCellId) {
        this.role = element.assignedPosition as Role;
      }
    }
  }

  /**
   * @description process all data from actions to populate GameSession instance
   * for example banned and picked champions
   */
  public processData(cellList: Array<Cell>[]) {
    cellList.forEach((cellArray) => {
      cellArray.forEach((cell) => {
        //We check if banned and completed and picked and completed
        if (cell.type === Type.ban && cell.completed) {
          this.bannedChampions.add(cell.championId);
        } else if (cell.type === Type.pick && cell.completed) {
          this.pickedChampions.add(cell.championId);
        }
        if (cell.isInProgress) {
          if (cell.type === Type.ban) {
            this.phase = Phase.Banning;
          } else if (cell.type === Type.pick) {
            this.phase = Phase.Picking;
          } else if (cell.type === Type.ten_bans_reveal) {
            this.phase = Phase.RevealingBans;
          }
        }
      });
    });
  }

  public getGameId(): number {
    return this.gameId;
  }
  public getRole(): Role {
    return this.role;
  }

  public getBannedChampions(): number[] {
    return Array.from(this.bannedChampions);
  }

  public getPickedChampions(): number[] {
    return Array.from(this.pickedChampions);
  }

  public getPhase(): Phase {
    return this.phase;
  }
}
