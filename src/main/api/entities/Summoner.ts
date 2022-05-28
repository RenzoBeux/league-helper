export type Summoner = {
    accountId: number
    displayName: string
    internalName: string
    nameChangeFlag: boolean
    percentCompleteForNextLevel: number
    privacy: string
    profileIconId: number
    puuid: string
    rerollPoints: {currentPoints: number, maxRolls: number, numberOfRolls: number, pointsCostToRoll: number, pointsToReroll: number}
    summonerId: number
    summonerLevel: number
    unnamed: true
    xpSinceLastLevel: number
    xpUntilNextLevel: number
};
