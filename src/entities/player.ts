import { Player } from "@minecraft/server";
import utils from "utils";

export function InitPlayer(p: Player) {
    if(!p.initialized) {
        p.initialized = true;
        p.inariCode = utils.generateCode().toLowerCase();
        p.sendMessage(utils.prefix+'§aYour inari code : '+p.inariCode+'\n§r§oPlease do not share this code, it is unique to you!')
    }
}