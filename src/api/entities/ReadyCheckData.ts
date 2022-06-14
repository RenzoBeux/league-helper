export type ReadyCheckData = {
  timer: number;
  declinerIds: [number];
  dodgeWarning: 'None' | 'Warning' | 'Penalty';
  playerResponse: 'None' | 'Accepted' | 'Declined';
  state:
    | 'Invalid'
    | 'InProgress'
    | 'EveryoneReady'
    | 'StrangerNotReady'
    | 'PartyNotReady'
    | 'Error';
  suppressUx: boolean;
};
