import { Champion } from "api/entities/Champion";
import { Role } from "api/entities/Role";

export type StatusMessage = {
    bannedChampions: Champion[];
    pickedChampions: Champion[];
    role: Role;
}