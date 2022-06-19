import Champion from 'api/entities/Champion';
import Phase from 'api/entities/Phase';
import Role from 'api/entities/Role';

export type StatusMessage = {
    bannedChampions: Champion[];
    pickedChampions: Champion[];
    role: Role;
    phase: Phase;
};
