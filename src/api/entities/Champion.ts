import { RawChampion } from './RawChampion';

export default class Champion {
    id: number;

    name: string;

    roles: string[];

    constructor(id: number, name: string, roles: string[]) {
        this.id = id;
        this.name = name;
        this.roles = roles;
    }

    static fromRaw(raw: RawChampion): Champion {
        return new Champion(raw.id, raw.name, raw.roles);
    }
}
