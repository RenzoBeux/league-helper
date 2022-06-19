import Champion from 'api/entities/Champion';
import { Summoner } from 'api/entities/Summoner';

export type SummonerMessage = {
    success: boolean;
    summoner: Summoner;
};

export type ChampionsMessage = {
    success: boolean;
    champions: Champion[];
};
