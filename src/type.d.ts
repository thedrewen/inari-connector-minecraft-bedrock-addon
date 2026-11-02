import { Player } from "@minecraft/server";

declare module "@minecraft/server" {
    export interface Player {
        inariCode: string;
        initialized: boolean;
        inari_client_muted: boolean;
        toggle_muted: boolean;
    }
}